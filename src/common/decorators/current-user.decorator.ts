import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { SessionData } from '../types/session.types';

/** Extracts the authenticated session from the request */
export const CurrentUser = createParamDecorator(
  (_data: keyof SessionData | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const session: SessionData = request.session;
    return _data ? session?.[_data] : session;
  },
);
