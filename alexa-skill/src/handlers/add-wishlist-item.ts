/**
 * AddWishlistItemIntentHandler -- adds an item to the user's Momo wishlist.
 *
 * Utterance examples (de-DE):
 *   "füge Milch zur Einkaufsliste hinzu"
 *   "setze Nintendo Switch auf die Wunschliste"
 *   "trage Zahnpasta in die Einkaufsliste ein"
 *
 * Slot: itemName (AMAZON.SearchQuery) -- the wishlist item title
 */

import * as Alexa from "ask-sdk-core";
import { HandlerInput, RequestHandler } from "ask-sdk-core";
import { Response, IntentRequest } from "ask-sdk-model";
import { addWishlistItem } from "../momo-client";

export const AddWishlistItemIntentHandler: RequestHandler = {
  canHandle(input: HandlerInput): boolean {
    return (
      input.requestEnvelope.request.type === "IntentRequest" &&
      Alexa.getIntentName(input.requestEnvelope) === "AddWishlistItemIntent"
    );
  },

  async handle(input: HandlerInput): Promise<Response> {
    const apiKey = input.requestEnvelope.context.System.user.accessToken;

    if (!apiKey) {
      return input.responseBuilder
        .speak(
          "Bitte verknuepfe zuerst dein Momo-Konto in der Alexa-App. " +
            "Oeffne die Alexa-App, gehe zu diesem Skill und tippe auf Konto verknuepfen."
        )
        .withLinkAccountCard()
        .getResponse();
    }

    const request = input.requestEnvelope.request as IntentRequest;
    const itemNameSlot = request.intent.slots?.itemName;
    const itemTitle = itemNameSlot?.value?.trim();

    if (!itemTitle) {
      return input.responseBuilder
        .speak("Was soll ich auf die Wunschliste setzen?")
        .reprompt("Welchen Artikel soll ich hinzufuegen?")
        .getResponse();
    }

    try {
      const item = await addWishlistItem(apiKey, itemTitle);

      return input.responseBuilder
        .speak(`Ich habe ${item.title} zur Wunschliste hinzugefuegt.`)
        .withSimpleCard("Wunschliste", `+ ${item.title}`)
        .getResponse();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unbekannter Fehler";
      console.error("[AddWishlistItemIntent] API error:", errorMessage);

      return input.responseBuilder
        .speak(
          "Das hat leider nicht geklappt. Bitte versuche es erneut."
        )
        .getResponse();
    }
  },
};
