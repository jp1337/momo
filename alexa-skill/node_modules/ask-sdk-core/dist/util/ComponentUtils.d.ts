import { Slot, dialog, Response } from 'ask-sdk-model';
import { CustomSkillRequestHandler as RequestHandler } from '../dispatcher/request/handler/CustomSkillRequestHandler';
import { HandlerInput } from '../dispatcher/request/handler/HandlerInput';
export declare function launchComponent(options?: {
    utteranceSetName?: string;
    slots?: {
        [key: string]: Slot;
    };
    isUserUtteranceInput?: boolean;
}): dialog.DelegateRequestDirective;
export declare function egressFromComponent(actionName: string, egressInput: {
    intentName?: string;
    handle?: ((input: HandlerInput) => Response | Promise<Response>);
}): RequestHandler;
