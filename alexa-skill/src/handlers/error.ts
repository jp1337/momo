/**
 * ErrorHandler — catches all unhandled errors and unexpected intents.
 *
 * Logs the error for CloudWatch and returns a friendly German error message.
 */

import { HandlerInput, ErrorHandler as AlexaErrorHandler } from "ask-sdk-core";
import { Response } from "ask-sdk-model";

export const GlobalErrorHandler: AlexaErrorHandler = {
  canHandle(): boolean {
    return true; // catch everything
  },

  handle(input: HandlerInput, error: Error): Response {
    console.error("[GlobalErrorHandler]", error.name, error.message, error.stack);

    return input.responseBuilder
      .speak(
        "Es ist ein unerwarteter Fehler aufgetreten. Bitte versuche es später erneut."
      )
      .withShouldEndSession(true)
      .getResponse();
  },
};
