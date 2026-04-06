/**
 * Momo Alexa Skill -- AWS Lambda entry point.
 *
 * Handles Alexa requests and routes them to the appropriate intent handler.
 * Authentication is done via Alexa Account Linking: the user enters their
 * Momo API key once in the Alexa companion app; it is then available as
 * `context.System.user.accessToken` in every request.
 *
 * Supported intents:
 *   AddTaskIntent     -- "Fuege {taskName} hinzu"
 *   GetQuestIntent    -- "Was ist meine Quest?"
 *   ListTasksIntent   -- "Liste meine Aufgaben"
 *   AMAZON.HelpIntent -- "Hilfe"
 *   AMAZON.CancelIntent / AMAZON.StopIntent -- "Beenden"
 *
 * Environment variables:
 *   MOMO_API_BASE_URL -- Base URL of the Momo instance (default: https://momotask.app)
 */

import * as Alexa from "ask-sdk-core";

import { LaunchRequestHandler } from "./handlers/launch";
import { AddTaskIntentHandler } from "./handlers/add-task";
import { GetQuestIntentHandler } from "./handlers/get-quest";
import { ListTasksIntentHandler } from "./handlers/list-tasks";
import { HelpIntentHandler } from "./handlers/help";
import { AddWishlistItemIntentHandler } from "./handlers/add-wishlist-item";
import {
  CancelAndStopIntentHandler,
  SessionEndedRequestHandler,
} from "./handlers/cancel-stop";
import { GlobalErrorHandler } from "./handlers/error";

/**
 * Lambda handler -- receives Alexa requests and returns responses.
 * The .lambda() helper wires up the correct Lambda callback signature.
 * Node.js 20.x runtime required (native fetch).
 */
export const handler = Alexa.SkillBuilders.custom()
  .addRequestHandlers(
    LaunchRequestHandler,
    AddTaskIntentHandler,
    GetQuestIntentHandler,
    ListTasksIntentHandler,
    HelpIntentHandler,
    AddWishlistItemIntentHandler,
    CancelAndStopIntentHandler,
    SessionEndedRequestHandler
  )
  .addErrorHandlers(GlobalErrorHandler)
  .lambda();
