import {
  Injectable, UnauthorizedException, BadRequestException, Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';

import { User, UserStatus } from '../../database/entities/user.entity';
import { Organization } from '../../database/entities/organization.entity';
import { AuditLog, AuditAction } from '../../database/entities/audit-log.entity';
import { LoginDto } from './dto/login.dto';
import { MailService } from '../mail/mail.service';

export interface JwtPayload {
  sub: string;
  email: string;
  organizationId: string | null;
  isSuperAdmin: boolean;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @InjectRepository(Organization) private readonly orgRepo: Repository<Organization>,
    @InjectRepository(AuditLog) private readonly auditRepo: Repository<AuditLog>,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly mailService: MailService,
  ) {}

  async validateUser(email: string, password: string): Promise<User> {
    const user = await this.userRepo.findOne({
      where: { email: email.toLowerCase() },
      relations: ['roles', 'roles.permissions', 'organization'],
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException(`Account is ${user.status}`);
    }

    // Check account lockout
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      const minutesLeft = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 60000);
      throw new UnauthorizedException(`Account locked. Try again in ${minutesLeft} minutes`);
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      await this.handleFailedLogin(user);
      throw new UnauthorizedException('Invalid credentials');
    }

    // Reset failed attempts on success
    if (user.failedLoginAttempts > 0) {
      await this.userRepo.update(user.id, {
        failedLoginAttempts: 0,
        lockedUntil: undefined,
      });
    }

    return user;
  }

  async login(dto: LoginDto, ipAddress?: string): Promise<AuthTokens & { user: Partial<User> }> {
    const user = await this.validateUser(dto.email, dto.password);

    // Super admin can operate under any org selected at login
    let effectiveOrgId = user.organizationId;
    if (user.isSuperAdmin && dto.organizationSlug) {
      const org = await this.orgRepo.findOne({ where: { slug: dto.organizationSlug } });
      if (org) effectiveOrgId = org.id;
    }

    const tokens = await this.generateTokens(user, effectiveOrgId);

    // Save hashed refresh token
    const hashedRefresh = await bcrypt.hash(tokens.refreshToken, 10);
    await this.userRepo.update(user.id, {
      refreshTokenHash: hashedRefresh,
      lastLoginAt: new Date(),
      lastLoginIp: ipAddress,
    });

    // Audit log
    await this.createAuditLog(AuditAction.LOGIN, user, ipAddress);

    const { password, refreshTokenHash, ...safeUser } = user as any;
    return { ...tokens, user: safeUser };
  }

  async refreshTokens(userId: string, refreshToken: string): Promise<AuthTokens> {
    const user = await this.userRepo.findOne({
      where: { id: userId },
      relations: ['roles', 'roles.permissions'],
    });

    if (!user || !user.refreshTokenHash) {
      throw new UnauthorizedException('Access denied');
    }

    const isValid = await bcrypt.compare(refreshToken, user.refreshTokenHash);
    if (!isValid) {
      throw new UnauthorizedException('Access denied');
    }

    // Preserve the effective organizationId from the outgoing refresh token
    // (super admins operate under a selected org that differs from their stored null org)
    let effectiveOrgId: string | null | undefined;
    try {
      const payload = this.jwtService.decode(refreshToken) as JwtPayload;
      effectiveOrgId = payload?.organizationId ?? undefined;
    } catch {
      effectiveOrgId = undefined;
    }

    const tokens = await this.generateTokens(user, effectiveOrgId ?? undefined);
    const hashedRefresh = await bcrypt.hash(tokens.refreshToken, 10);
    await this.userRepo.update(user.id, { refreshTokenHash: hashedRefresh });

    return tokens;
  }

  async logout(userId: string, ipAddress?: string): Promise<void> {
    await this.userRepo.update(userId, { refreshTokenHash: undefined });
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (user) await this.createAuditLog(AuditAction.LOGOUT, user, ipAddress);
  }

  async verifyEmail(email: string, code: string): Promise<void> {
    const user = await this.userRepo.findOne({ where: { email: email.toLowerCase() } });

    if (!user || user.status !== UserStatus.PENDING) {
      throw new BadRequestException('Código inválido o cuenta ya activa');
    }

    if (!user.verificationCode || user.verificationCode !== code) {
      throw new BadRequestException('Código incorrecto');
    }

    if (user.verificationCodeExpiresAt && user.verificationCodeExpiresAt < new Date()) {
      throw new BadRequestException('El código expiró. Contactá al administrador para reenviar uno nuevo');
    }

    await this.userRepo.update(user.id, {
      status: UserStatus.ACTIVE,
      verificationCode: null,
      verificationCodeExpiresAt: null,
    });
  }

  async resendVerificationCode(email: string): Promise<void> {
    const user = await this.userRepo.findOne({ where: { email: email.toLowerCase() } });
    if (!user || user.status !== UserStatus.PENDING) return; // silent — don't expose user existence

    const verificationCode           = Math.floor(100000 + Math.random() * 900000).toString();
    const verificationCodeExpiresAt  = new Date(Date.now() + 30 * 60 * 1000);

    await this.userRepo.update(user.id, { verificationCode, verificationCodeExpiresAt });

    const org = user.organizationId
      ? await this.orgRepo.findOne({ where: { id: user.organizationId } })
      : null;

    await this.mailService.sendVerificationCode({
      to:      user.email,
      name:    user.name,
      code:    verificationCode,
      orgName: org?.name ?? 'Signage Platform',
    });
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void> {
    const user = await this.userRepo.findOne({
      where: { id: userId },
      relations: ['organization'],
    });
    if (!user) throw new UnauthorizedException();

    const isValid = await bcrypt.compare(currentPassword, user.password);
    if (!isValid) throw new BadRequestException('La contraseña actual es incorrecta');

    const hashed = await bcrypt.hash(newPassword, 12);
    await this.userRepo.update(userId, { password: hashed });

    const orgName = user.organization?.name ?? 'Signage Platform';
    this.mailService
      .sendPasswordChanged({ to: user.email, name: user.name, orgName })
      .catch((err) => this.logger.error(`Password changed email failed: ${err.message}`));
  }

  async getProfile(userId: string): Promise<User | null> {
    return this.userRepo.findOne({
      where: { id: userId },
      relations: ['roles', 'roles.permissions', 'organization'],
    });
  }

  private async generateTokens(user: User, effectiveOrgId?: string): Promise<AuthTokens> {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      organizationId: effectiveOrgId ?? user.organizationId,
      isSuperAdmin: user.isSuperAdmin,
    };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: this.configService.get<string>('auth.jwtSecret'),
        expiresIn: this.configService.get<string>('auth.jwtExpiresIn', '15m'),
      }),
      this.jwtService.signAsync(payload, {
        secret: this.configService.get<string>('auth.jwtRefreshSecret'),
        expiresIn: this.configService.get<string>('auth.jwtRefreshExpiresIn', '7d'),
      }),
    ]);

    return { accessToken, refreshToken };
  }

  private async handleFailedLogin(user: User): Promise<void> {
    const attempts = user.failedLoginAttempts + 1;
    const MAX_ATTEMPTS = 5;
    let lockedUntil: Date | undefined = undefined;

    if (attempts >= MAX_ATTEMPTS) {
      lockedUntil = new Date(Date.now() + 15 * 60 * 1000); // lock 15 min
      this.logger.warn(`Account locked after ${attempts} failed attempts: ${user.email}`);
    }

    await this.userRepo.update(user.id, { failedLoginAttempts: attempts, lockedUntil });
  }

  private async createAuditLog(
    action: AuditAction,
    user: User,
    ipAddress?: string,
  ): Promise<void> {
    const log = this.auditRepo.create({
      action,
      userId: user.id,
      organizationId: user.organizationId,
      ipAddress,
    });
    await this.auditRepo.save(log).catch(() => {}); // Non-blocking
  }
}
