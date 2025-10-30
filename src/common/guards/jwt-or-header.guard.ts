import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class JwtOrHeaderGuard implements CanActivate {
  constructor(private readonly jwt: JwtService) {}

  canActivate(context: ExecutionContext): boolean {
   
    const gql = GqlExecutionContext.create(context);
    const ctx = gql.getContext<{ req?: any }>();
    const req = ctx?.req ??  {}; 

    const raw = (req?.headers?.authorization as string) ?? '';
    const auth = raw.trim();
    
    let userId = (req?.headers?.['x-user-id'] as string) || null;
    
    if (auth.toLocaleLowerCase().startsWith('bearer ')) {
      try {
        const token = auth.slice(7).trim();
        const payload = this.jwt.verify(token); 
        userId = payload?.sub ?? payload?.userId ?? payload?.id ?? userId ?? null;
      } catch {
        // ignore invalid token 
      }
    }

    if (!userId) {
      throw new UnauthorizedException('Provide x-user-id header or a valid Bearer token');
    }

    req.user = { id: userId };
    return true;
  }
}
