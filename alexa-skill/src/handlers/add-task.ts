/**
 * AddTaskIntentHandler — creates a new task in Momo.
 *
 * Utterance examples (de-DE):
 *   "Füge Zahnarzt hinzu"
 *   "Neue Aufgabe Steuererklärung"
 *   "Merke Fahrrad reparieren"
 *
 * Slot: taskName (AMAZON.SearchQuery) — the task title
 */

import * as Alexa from "ask-sdk-core";
import { HandlerInput, RequestHandler } from "ask-sdk-core";
import { Response, IntentRequest } from "ask-sdk-model";
import { addTask } from "../momo-client";

export const AddTaskIntentHandler: RequestHandler = {
  canHandle(input: HandlerInput): boolean {
    return (
      input.requestEnvelope.request.type === "IntentRequest" &&
      Alexa.getIntentName(input.requestEnvelope) === "AddTaskIntent"
    );
  },

  async handle(input: HandlerInput): Promise<Response> {
    const apiKey = input.requestEnvelope.context.System.user.accessToken;

    // Guard: account not linked yet
    if (!apiKey) {
      return input.responseBuilder
        .speak(
          "Bitte verknüpfe zuerst dein Momo-Konto in der Alexa-App. " +
            "Öffne die Alexa-App, gehe zu diesem Skill und tippe auf Konto verknüpfen."
        )
        .withLinkAccountCard()
        .getResponse();
    }

    // Extract task title from slot
    const request = input.requestEnvelope.request as IntentRequest;
    const taskNameSlot = request.intent.slots?.taskName;
    const taskTitle = taskNameSlot?.value?.trim();

    if (!taskTitle) {
      return input.responseBuilder
        .speak("Wie soll die Aufgabe heißen? Sage zum Beispiel: Füge Zahnarzt hinzu.")
        .reprompt("Für welche Aufgabe soll ich einen Eintrag erstellen?")
        .getResponse();
    }

    try {
      const task = await addTask(apiKey, taskTitle);

      const speech = `Erledigt! Aufgabe „${task.title}" wurde zu Momo hinzugefügt.`;
      const cardText = `✓ ${task.title}`;

      return input.responseBuilder
        .speak(speech)
        .withSimpleCard("Aufgabe hinzugefügt", cardText)
        .getResponse();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unbekannter Fehler";
      console.error("[AddTaskIntent] API error:", errorMessage);

      return input.responseBuilder
        .speak(
          "Das hat leider nicht geklappt. Bitte prüfe deine Internetverbindung und versuche es erneut."
        )
        .getResponse();
    }
  },
};
