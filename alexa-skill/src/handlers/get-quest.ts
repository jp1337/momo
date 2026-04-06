/**
 * GetQuestIntentHandler — reads the user's current daily quest aloud.
 *
 * Utterance examples (de-DE):
 *   "Was ist meine Quest?"
 *   "Meine tägliche Aufgabe"
 *   "Was soll ich heute tun?"
 *
 * If no quest is active, the Momo API will select one automatically.
 */

import * as Alexa from "ask-sdk-core";
import { HandlerInput, RequestHandler } from "ask-sdk-core";
import { Response } from "ask-sdk-model";
import { getDailyQuest } from "../momo-client";

export const GetQuestIntentHandler: RequestHandler = {
  canHandle(input: HandlerInput): boolean {
    return (
      input.requestEnvelope.request.type === "IntentRequest" &&
      Alexa.getIntentName(input.requestEnvelope) === "GetQuestIntent"
    );
  },

  async handle(input: HandlerInput): Promise<Response> {
    const apiKey = input.requestEnvelope.context.System.user.accessToken;

    if (!apiKey) {
      return input.responseBuilder
        .speak(
          "Bitte verknüpfe zuerst dein Momo-Konto in der Alexa-App."
        )
        .withLinkAccountCard()
        .getResponse();
    }

    try {
      const quest = await getDailyQuest(apiKey);

      if (!quest) {
        return input.responseBuilder
          .speak(
            "Du hast aktuell keine offenen Aufgaben in Momo. Füge zuerst ein paar Aufgaben hinzu!"
          )
          .withSimpleCard("Momo Quest", "Keine offenen Aufgaben vorhanden.")
          .getResponse();
      }

      const topicInfo = quest.topic ? ` im Thema ${quest.topic.title}` : "";
      const coinInfo = quest.coinValue > 1 ? ` Dafür gibt es ${quest.coinValue} Münzen.` : "";

      const speech = `Deine heutige Quest ist: ${quest.title}${topicInfo}.${coinInfo} Viel Erfolg!`;
      const cardText = [
        `📋 ${quest.title}`,
        quest.topic ? `Thema: ${quest.topic.title}` : null,
        quest.estimatedMinutes ? `⏱ ${quest.estimatedMinutes} Minuten` : null,
        `🪙 ${quest.coinValue} Münze${quest.coinValue !== 1 ? "n" : ""}`,
      ]
        .filter(Boolean)
        .join("\n");

      return input.responseBuilder
        .speak(speech)
        .withSimpleCard("Deine Daily Quest", cardText)
        .getResponse();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unbekannter Fehler";
      console.error("[GetQuestIntent] API error:", errorMessage);

      return input.responseBuilder
        .speak("Ich konnte deine Quest leider nicht abrufen. Bitte versuche es später erneut.")
        .getResponse();
    }
  },
};
