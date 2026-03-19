import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, UserStatus } from '../../../database/entities/user.entity';
import { JwtPayload } from '../auth.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    config: ConfigService,
    @InjectRepository(User) private readonly userRepo: Repository<User>,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: config.get<string>('auth.jwtSecret'),
      ignoreExpiration: false,
    });
  }

  async validate(payload: JwtPayload): Promise<User> {
    const user = await this.userRepo.findOne({
      where: { id: payload.sub },
      relations: ['roles', 'roles.permissions'],
    });

    if (!user || user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException('User not found or inactive');
    }

    // For super admin, use the organizationId from the JWT (selected at login)
    if (user.isSuperAdmin && payload.organizationId) {
      user.organizationId = payload.organizationId;
    }

    return user;
  }
}
