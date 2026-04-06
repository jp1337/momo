import { Directive, Response, Slot } from 'ask-sdk-model';
import { CustomSkillRequestHandler as RequestHandler } from '../dispatcher/request/handler/CustomSkillRequestHandler';
import { HandlerInput } from '../dispatcher/request/handler/HandlerInput';
export declare abstract class ComponentInterface {
    static launch: (options?: {
        slots?: {
            [key: string]: Slot;
        };
        isUserUtteranceInput?: boolean;
    }) => Directive;
    static egress: (egressInput: {
        intentName?: string;
        callBack?: ((input: HandlerInput) => Response | Promise<Response>);
    }) => RequestHandler;
}
