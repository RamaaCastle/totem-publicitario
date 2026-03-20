import { AppDataSource } from '../data-source';
import { Organization, PlanType } from '../entities/organization.entity';
import { User, UserStatus } from '../entities/user.entity';
import { Role } from '../entities/role.entity';
import { Permission, PermissionAction, PermissionResource } from '../entities/permission.entity';
import * as bcrypt from 'bcryptjs';

async function runSeeds() {
  await AppDataSource.initialize();
  console.log('🌱 Running seeds...');

  const orgRepo = AppDataSource.getRepository(Organization);
  const userRepo = AppDataSource.getRepository(User);
  const roleRepo = AppDataSource.getRepository(Role);
  const permRepo = AppDataSource.getRepository(Permission);

  // 1. Create all permissions
  const permissionDefs: Array<{ action: PermissionAction; resource: PermissionResource }> = [];
  for (const resource of Object.values(PermissionResource)) {
    for (const action of Object.values(PermissionAction)) {
      permissionDefs.push({ action, resource });
    }
  }

  const permissions: Permission[] = [];
  for (const def of permissionDefs) {
    let perm = await permRepo.findOne({ where: { name: `${def.resource}:${def.action}` } });
    if (!perm) {
      perm = permRepo.create({
        name: `${def.resource}:${def.action}`,
        action: def.action,
        resource: def.resource,
        description: `${def.action} ${def.resource}`,
      });
      await permRepo.save(perm);
    }
    permissions.push(perm);
  }
  console.log(`✅ Seeded ${permissions.length} permissions`);

  // 2. Create system roles
  let superAdminRole = await roleRepo.findOne({ where: { name: 'Super Admin', isSystemRole: true } });
  if (!superAdminRole) {
    superAdminRole = roleRepo.create({
      name: 'Super Admin',
      description: 'Full access to everything',
      isSystemRole: true,
      permissions,
    });
    await roleRepo.save(superAdminRole);
  }

  const adminPermissions = permissions.filter((p) =>
    p.action !== PermissionAction.MANAGE || p.resource !== PermissionResource.SYSTEM,
  );
  let adminRole = await roleRepo.findOne({ where: { name: 'Admin', isSystemRole: true } });
  if (!adminRole) {
    adminRole = roleRepo.create({
      name: 'Admin',
      description: 'Organization administrator',
      isSystemRole: true,
      permissions: adminPermissions,
    });
    await roleRepo.save(adminRole);
  }

  const viewerPerms = permissions.filter((p) => p.action === PermissionAction.READ);
  let viewerRole = await roleRepo.findOne({ where: { name: 'Viewer', isSystemRole: true } });
  if (!viewerRole) {
    viewerRole = roleRepo.create({
      name: 'Viewer',
      description: 'Read-only access',
      isSystemRole: true,
      permissions: viewerPerms,
    });
    await roleRepo.save(viewerRole);
  }
  console.log('✅ Seeded system roles');

  // 3. Create organizations
  let defaultOrg = await orgRepo.findOne({ where: { slug: 'default' } });
  if (!defaultOrg) {
    defaultOrg = orgRepo.create({ name: 'Default Organization', slug: 'default', plan: PlanType.ENTERPRISE, maxScreens: 999 });
    await orgRepo.save(defaultOrg);
  }

  let magnaOrg = await orgRepo.findOne({ where: { slug: 'magna' } });
  if (!magnaOrg) {
    magnaOrg = orgRepo.create({ name: 'Magna Hoteles', slug: 'magna', plan: PlanType.ENTERPRISE, maxScreens: 999 });
    await orgRepo.save(magnaOrg);
    console.log('✅ Seeded org: Magna Hoteles');
  }

  let pedrazaOrg = await orgRepo.findOne({ where: { slug: 'pedraza' } });
  if (!pedrazaOrg) {
    pedrazaOrg = orgRepo.create({ name: 'Pedraza Viajes y Turismo', slug: 'pedraza', plan: PlanType.ENTERPRISE, maxScreens: 999 });
    await orgRepo.save(pedrazaOrg);
    console.log('✅ Seeded org: Pedraza Viajes y Turismo');
  }
  console.log('✅ Seeded organizations');

  // 4. Create super admin user
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@signage.local';
  let adminUser = await userRepo.findOne({ where: { email: adminEmail } });
  if (!adminUser) {
    const hashedPassword = await bcrypt.hash(
      process.env.ADMIN_PASSWORD || 'Admin@123456',
      12,
    );
    adminUser = userRepo.create({
      name: process.env.ADMIN_NAME || 'System Administrator',
      email: adminEmail,
      password: hashedPassword,
      status: UserStatus.ACTIVE,
      isSuperAdmin: true,
      organization: defaultOrg,
      roles: [superAdminRole],
    });
    await userRepo.save(adminUser);
    console.log(`✅ Seeded super admin: ${adminEmail}`);
  } else {
    console.log(`⏭️  Admin user already exists: ${adminEmail}`);
  }

  await AppDataSource.destroy();
  console.log('🎉 Seeds completed!');
}

runSeeds().catch((err) => {
  console.error('❌ Seed error:', err);
  process.exit(1);
});
