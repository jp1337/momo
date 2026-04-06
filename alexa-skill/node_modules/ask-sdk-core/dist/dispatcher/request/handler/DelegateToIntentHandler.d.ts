import { Response } from 'ask-sdk-model';
import { CustomSkillRequestHandler } from './CustomSkillRequestHandler';
import { HandlerInput } from './HandlerInput';
export declare class DelegateToIntentHandler implements CustomSkillRequestHandler {
    canHandle(input: HandlerInput): boolean;
    handle(input: HandlerInput): Response | Promise<Response>;
}
