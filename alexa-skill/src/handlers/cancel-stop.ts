/**
 * CancelAndStopIntentHandler — handles AMAZON.CancelIntent and AMAZON.StopIntent.
 * Triggered when the user says "Abbrechen", "Stopp", "Beenden" etc.
 */

import * as Alexa from "ask-sdk-core";
import { HandlerInput, RequestHandler } from "ask-sdk-core";
import { Response } from "ask-sdk-model";

export const CancelAndStopIntentHandler: RequestHandler = {
  canHandle(input: HandlerInput): boolean {
    if (input.requestEnvelope.request.type !== "IntentRequest") return false;
    const intent = Alexa.getIntentName(input.requestEnvelope);
    return intent === "AMAZON.CancelIntent" || intent === "AMAZON.StopIntent";
  },

  handle(input: HandlerInput): Response {
    return input.responseBuilder
      .speak("Bis bald! Viel Erfolg mit deinen Aufgaben.")
      .withShouldEndSession(true)
      .getResponse();
  },
};

/**
 * SessionEndedRequestHandler — cleanup when the session ends unexpectedly.
 */
export const SessionEndedRequestHandler: RequestHandler = {
  canHandle(input: HandlerInput): boolean {
    return input.requestEnvelope.request.type === "SessionEndedRequest";
  },

  handle(input: HandlerInput): Response {
    console.info("[SessionEnded]", JSON.stringify(input.requestEnvelope.request));
    return input.responseBuilder.getResponse();
  },
};
