/**
 * LaunchRequestHandler — fires when the user opens the skill without a specific intent.
 * e.g. "Alexa, öffne Momo" / "Alexa, open Momo"
 */

import { HandlerInput, RequestHandler } from "ask-sdk-core";
import { Response } from "ask-sdk-model";

export const LaunchRequestHandler: RequestHandler = {
  canHandle(input: HandlerInput): boolean {
    return input.requestEnvelope.request.type === "LaunchRequest";
  },

  handle(input: HandlerInput): Response {
    const speech =
      "Willkommen bei Momo! Du kannst eine Aufgabe hinzufügen, deine tägliche Quest abfragen oder deine offenen Aufgaben hören. Was möchtest du tun?";

    const reprompt =
      "Sage zum Beispiel: Füge Zahnarzt hinzu, oder: Was ist meine Quest?";

    return input.responseBuilder
      .speak(speech)
      .reprompt(reprompt)
      .withSimpleCard("Momo", "Aufgaben hinzufügen · Quest abfragen · Aufgaben auflisten")
      .getResponse();
  },
};
