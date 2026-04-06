/**
 * HelpIntentHandler -- responds to AMAZON.HelpIntent.
 * Triggered when the user says "Hilfe" / "Help" within the skill.
 */

import * as Alexa from "ask-sdk-core";
import { HandlerInput, RequestHandler } from "ask-sdk-core";
import { Response } from "ask-sdk-model";

export const HelpIntentHandler: RequestHandler = {
  canHandle(input: HandlerInput): boolean {
    return (
      input.requestEnvelope.request.type === "IntentRequest" &&
      Alexa.getIntentName(input.requestEnvelope) === "AMAZON.HelpIntent"
    );
  },

  handle(input: HandlerInput): Response {
    const speech =
      "Mit Momo kannst du Folgendes tun: " +
      'Sage "Fuege Zahnarzt hinzu", um eine neue Aufgabe zu erstellen. ' +
      'Sage "Fuege Milch zur Einkaufsliste hinzu", um etwas auf die Wunschliste zu setzen. ' +
      'Sage "Was ist meine Quest?", um deine heutige Aufgabe zu hoeren. ' +
      'Oder sage "Liste meine Aufgaben", um alle offenen Aufgaben zu hoeren. ' +
      "Was moechtest du tun?";

    const reprompt = "Sage zum Beispiel: Fuege Milch zur Einkaufsliste hinzu.";

    const cardText =
      "Befehle:\n" +
      '* "Fuege [Aufgabe] hinzu"\n' +
      '* "Fuege [Artikel] zur Einkaufsliste hinzu"\n' +
      '* "Was ist meine Quest?"\n' +
      '* "Liste meine Aufgaben"\n' +
      '* "Beenden"';

    return input.responseBuilder
      .speak(speech)
      .reprompt(reprompt)
      .withSimpleCard("Momo - Hilfe", cardText)
      .getResponse();
  },
};
