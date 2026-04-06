/**
 * ListTasksIntentHandler — reads the user's open tasks aloud.
 *
 * Utterance examples (de-DE):
 *   "Liste meine Aufgaben"
 *   "Welche Aufgaben habe ich?"
 *   "Was habe ich zu tun?"
 *
 * Reads up to MAX_SPOKEN_TASKS aloud to keep the response brief.
 * Shows the full count in the Alexa card.
 */

import * as Alexa from "ask-sdk-core";
import { HandlerInput, RequestHandler } from "ask-sdk-core";
import { Response } from "ask-sdk-model";
import { getOpenTasks } from "../momo-client";

/** Max tasks to read aloud — longer lists get truncated with a hint */
const MAX_SPOKEN_TASKS = 5;

export const ListTasksIntentHandler: RequestHandler = {
  canHandle(input: HandlerInput): boolean {
    return (
      input.requestEnvelope.request.type === "IntentRequest" &&
      Alexa.getIntentName(input.requestEnvelope) === "ListTasksIntent"
    );
  },

  async handle(input: HandlerInput): Promise<Response> {
    const apiKey = input.requestEnvelope.context.System.user.accessToken;

    if (!apiKey) {
      return input.responseBuilder
        .speak("Bitte verknüpfe zuerst dein Momo-Konto in der Alexa-App.")
        .withLinkAccountCard()
        .getResponse();
    }

    try {
      const tasks = await getOpenTasks(apiKey);

      if (tasks.length === 0) {
        return input.responseBuilder
          .speak(
            "Du hast keine offenen Aufgaben. Füge neue Aufgaben hinzu, indem du sagst: Füge eine Aufgabe hinzu."
          )
          .withSimpleCard("Momo Aufgaben", "Keine offenen Aufgaben.")
          .getResponse();
      }

      const spoken = tasks.slice(0, MAX_SPOKEN_TASKS);
      const remaining = tasks.length - spoken.length;

      const taskList = spoken.map((t, i) => `${i + 1}. ${t.title}`).join(", ");

      let speech: string;
      if (tasks.length === 1) {
        speech = `Du hast eine offene Aufgabe: ${spoken[0].title}.`;
      } else if (remaining === 0) {
        speech = `Du hast ${tasks.length} offene Aufgaben: ${taskList}.`;
      } else {
        speech =
          `Du hast ${tasks.length} offene Aufgaben. Die ersten ${spoken.length} sind: ${taskList}. ` +
          `Und ${remaining} weitere. Öffne Momo für die vollständige Liste.`;
      }

      const cardLines = tasks
        .slice(0, 10)
        .map((t) => `• ${t.title}`)
        .join("\n");
      const cardText =
        tasks.length > 10
          ? `${cardLines}\n… und ${tasks.length - 10} weitere`
          : cardLines;

      return input.responseBuilder
        .speak(speech)
        .withSimpleCard(`Momo – ${tasks.length} offene Aufgaben`, cardText)
        .getResponse();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unbekannter Fehler";
      console.error("[ListTasksIntent] API error:", errorMessage);

      return input.responseBuilder
        .speak("Ich konnte deine Aufgaben leider nicht abrufen. Bitte versuche es später erneut.")
        .getResponse();
    }
  },
};
