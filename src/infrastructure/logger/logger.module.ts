import { Module } from '@nestjs/common';
import { LoggerModule as PinoLoggerModule } from 'nestjs-pino';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { IncomingMessage, ServerResponse } from 'http';

@Module({
  imports: [
    PinoLoggerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const pretty = config.get<boolean>('app.logging.pretty');
        return {
          pinoHttp: {
            level: config.get<string>('app.logging.level', 'info'),
            ...(pretty
              ? {
                  transport: {
                    target: 'pino-pretty',
                    options: {
                      singleLine: true,
                      colorize: true,
                      translateTime: 'SYS:standard',
                      ignore: 'pid,hostname',
                    },
                  },
                }
              : {}),
            redact: {
              paths: [
                'req.headers.authorization',
                'req.headers.cookie',
                'req.body.password',
                'req.body.otp',
                'req.body.cardNumber',
                'req.body.cvv',
              ],
              remove: true,
            },
            serializers: {
              req: (req: IncomingMessage & { correlationId?: string }) => ({
                method: req.method,
                url: req.url,
                correlationId: req.headers?.['x-correlation-id'],
              }),
              res: (res: ServerResponse) => ({
                statusCode: res.statusCode,
              }),
            },
            customProps: (
              req: IncomingMessage & { correlationId?: string },
            ) => ({
              correlationId: req.correlationId,
            }),
          },
        };
      },
    }),
  ],
  exports: [PinoLoggerModule],
})
export class AppLoggerModule {}
