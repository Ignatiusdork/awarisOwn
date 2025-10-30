import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';

@Injectable()
export class MockAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    const userId = req?.headers?.['x-user-id'];
    if (!userId) throw new UnauthorizedException('Provide x-user-id for mock auth');
    return true;
  }
}
