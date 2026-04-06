export declare namespace services {
    /**
     * Represents the interface between ApiClient and a Service Client.
     * @export
     * @interface ApiClientMessage
     */
    interface ApiClientMessage {
        headers: Array<{
            key: string;
            value: string;
        }>;
        body?: string;
    }
    /**
     * Represents a request sent from Service Clients to an ApiClient implementation.
     * @export
     * @interface ApiClientRequest
     * @extends {ApiClientMessage}
     */
    interface ApiClientRequest extends ApiClientMessage {
        url: string;
        method: string;
    }
    /**
     * Represents a response returned by ApiClient implementation to a Service Client.
     * @export
     * @interface ApiClientResponse
     * @extends {ApiClientMessage}
     */
    interface ApiClientResponse extends ApiClientMessage {
        /**
         * Result code of the attempt to satisfy the request. Normally this
         * corresponds to the HTTP status code returned by the server.
         */
        statusCode: number;
    }
    /**
     * Represents a response with parsed body.
     * @export
     * @interface ApiResponse
     */
    interface ApiResponse {
        headers: Array<{
            key: string;
            value: string;
        }>;
        body?: any;
        statusCode: number;
    }
    /**
     * Represents a basic contract for API request execution
     * @export
     * @interface ApiClient
     */
    interface ApiClient {
        /**
         * Dispatches a request to an API endpoint described in the request.
         * An ApiClient is expected to resolve the Promise in the case an API returns a non-200 HTTP
         * status code. The responsibility of translating a particular response code to an error lies with the
         * caller to invoke.
         * @param {ApiClientRequest} request request to dispatch to the ApiClient
         * @returns {Promise<ApiClientResponse>} Response from the ApiClient
         * @memberof ApiClient
         */
        invoke(request: ApiClientRequest): Promise<ApiClientResponse>;
    }
    /**
     * Represents an interface that provides API configuration options needed by service clients.
     * @interface ApiConfiguration
     */
    interface ApiConfiguration {
        /**
         * Configured ApiClient implementation
         */
        apiClient: ApiClient;
        /**
         * Authorization value to be used on any calls of the service client instance
         */
        authorizationValue: string;
        /**
         * Endpoint to hit by the service client instance
         */
        apiEndpoint: string;
    }
    /**
     * Class to be used as the base class for the generated service clients.
     */
    abstract class BaseServiceClient {
        private static isCodeSuccessful;
        private static buildUrl;
        private static interpolateParams;
        private static buildQueryString;
        /**
         * ApiConfiguration instance to provide dependencies for this service client
         */
        protected apiConfiguration: ApiConfiguration;
        private requestInterceptors;
        private responseInterceptors;
        /**
         * Creates new instance of the BaseServiceClient
         * @param {ApiConfiguration} apiConfiguration configuration parameter to provide dependencies to service client instance
         */
        protected constructor(apiConfiguration: ApiConfiguration);
        /**
         * Sets array of functions that is going to be executed before the request is send
         * @param {Function} requestInterceptor request interceptor function
         * @returns {BaseServiceClient}
         */
        withRequestInterceptors(...requestInterceptors: Array<(request: ApiClientRequest) => void | Promise<void>>): BaseServiceClient;
        /**
         * Sets array of functions that is going to be executed after the request is send
         * @param {Function} responseInterceptor response interceptor function
         * @returns {BaseServiceClient}
         */
        withResponseInterceptors(...responseInterceptors: Array<(response: ApiClientResponse) => void | Promise<void>>): BaseServiceClient;
        /**
         * Invocation wrapper to implement service operations in generated classes
         * @param method HTTP method, such as 'POST', 'GET', 'DELETE', etc.
         * @param endpoint base API url
         * @param path the path pattern with possible placeholders for path parameters in form {paramName}
         * @param pathParams path parameters collection
         * @param queryParams query parameters collection
         * @param headerParams headers collection
         * @param bodyParam if body parameter is present it is provided here, otherwise null or undefined
         * @param errors maps recognized status codes to messages
         * @param nonJsonBody if the body is in JSON format
         */
        protected invoke(method: string, endpoint: string, path: string, pathParams: Map<string, string>, queryParams: Array<{
            key: string;
            value: string;
        }>, headerParams: Array<{
            key: string;
            value: string;
        }>, bodyParam: any, errors: Map<number, string>, nonJsonBody?: boolean): Promise<any>;
    }
    /**
     * Represents a Login With Amazon(LWA) access token
     */
    interface AccessToken {
        token: string;
        expiry: Number;
    }
    /**
     * Represents a request for retrieving a Login With Amazon(LWA) access token
     */
    interface AccessTokenRequest {
        clientId: string;
        clientSecret: string;
        scope?: string;
        refreshToken?: string;
    }
    /**
     * Represents a response returned by LWA containing a Login With Amazon(LWA) access token
     */
    interface AccessTokenResponse {
        access_token: string;
        expires_in: number;
        scope: string;
        token_type: string;
    }
    /**
     * Represents the authentication configuration for a client ID and client secret
     */
    interface AuthenticationConfiguration {
        clientId: string;
        clientSecret: string;
        refreshToken?: string;
        authEndpoint?: string;
    }
    /**
     * Class to be used to call Amazon LWA to retrieve access tokens.
     */
    class LwaServiceClient extends BaseServiceClient {
        protected static EXPIRY_OFFSET_MILLIS: number;
        protected static REFRESH_ACCESS_TOKEN: string;
        protected static CLIENT_CREDENTIALS_GRANT_TYPE: string;
        protected static LWA_CREDENTIALS_GRANT_TYPE: string;
        protected static AUTH_ENDPOINT: string;
        protected authenticationConfiguration: AuthenticationConfiguration;
        protected tokenStore: {
            [cacheKey: string]: AccessToken;
        };
        protected grantType: string;
        constructor(options: {
            apiConfiguration: ApiConfiguration;
            authenticationConfiguration: AuthenticationConfiguration;
            grantType?: string;
        });
        getAccessTokenForScope(scope: string): Promise<string>;
        getAccessToken(scope?: string): Promise<string>;
        protected generateAccessToken(accessTokenRequest: AccessTokenRequest): Promise<AccessTokenResponse>;
    }
}
/**
 * function creating an AskSdk user agent.
 * @param packageVersion
 * @param customUserAgent
 */
export declare function createUserAgent(packageVersion: string, customUserAgent: string): string;
/**
 * An object containing an application ID. This is used to verify that the request was intended for your service.
 * @interface
 */
export interface Application {
    /**
     * A string representing the application identifier for your skill.
     */
    'applicationId': string;
}
/**
 * Describes the type of the Cause.
 * @interface
 */
export declare type Cause = ConnectionCompleted;
/**
 *
 * @interface
 */
export interface Context {
    /**
     * Provides information about the current state of the Alexa service and the device interacting with your skill.
     */
    'System': interfaces.system.SystemState;
    /**
     * Provides the current state for the Alexa.Presentation interface.
     */
    'Alexa.Presentation'?: interfaces.alexa.presentation.PresentationState;
    /**
     * Provides the current state for the Alexa.Presentation.APL interface.
     */
    'Alexa.Presentation.APL'?: interfaces.alexa.presentation.apl.RenderedDocumentState;
    /**
     * Provides the current state for the AudioPlayer interface.
     */
    'AudioPlayer'?: interfaces.audioplayer.AudioPlayerState;
    /**
     * Provides the automotive specific information of the device.
     */
    'Automotive'?: interfaces.automotive.AutomotiveState;
    /**
     * Provides the current state for the Display interface.
     */
    'Display'?: interfaces.display.DisplayState;
    /**
     * Provides the last gathered geolocation information of the device.
     */
    'Geolocation'?: interfaces.geolocation.GeolocationState;
    /**
     * Provides the characteristics of a device's viewport.
     */
    'Viewport'?: interfaces.viewport.ViewportState;
    /**
     * This object contains a list of viewports characteristics related to the device's viewports.
     */
    'Viewports'?: Array<interfaces.viewport.TypedViewportState>;
    /**
     * Provides the current state for Extensions interface
     */
    'Extensions'?: interfaces.alexa.extension.ExtensionsState;
    /**
     * Provides the current state for the Alexa.DataStore.PackageManager interface.
     */
    'Alexa.DataStore.PackageManager'?: interfaces.alexa.datastore.packagemanager.PackageManagerState;
    /**
     * Provides the current state for app link capability.
     */
    'AppLink'?: interfaces.applink.AppLinkState;
    /**
     * Provides the current experimentation state
     */
    'Experimentation'?: interfaces.alexa.experimentation.ExperimentationState;
}
/**
 * An object providing information about the device used to send the request. The device object contains both deviceId and supportedInterfaces properties. The deviceId property uniquely identifies the device. The supportedInterfaces property lists each interface that the device supports. For example, if supportedInterfaces includes AudioPlayer {}, then you know that the device supports streaming audio using the AudioPlayer interface.
 * @interface
 */
export interface Device {
    /**
     * The deviceId property uniquely identifies the device. This identifier is scoped to a skill. Normally, disabling and re-enabling a skill generates a new identifier.
     */
    'deviceId': string;
    /**
     * A persistent identifier for the Endpoint ID where the skill request is issued from. An endpoint represents an Alexa-connected Endpoint (like an Echo device, or an application) with which an Alexa customer can interact rather than a physical device,  so it could represent applications on your fire TV or your Alexa phone app.  The persistentEndpointId is a string that represents a unique identifier for the endpoint in the context of a request.  It is in the Amazon Common Identifier format \"amzn1.alexa.endpoint.did.{id}\". This identifier space is scoped to a vendor, therefore it will stay the same regardless of skill enablement.
     */
    'persistentEndpointId'?: string;
    /**
     * Lists each interface that the device supports. For example, if supportedInterfaces includes AudioPlayer {}, then you know that the device supports streaming audio using the AudioPlayer interface
     */
    'supportedInterfaces': SupportedInterfaces;
}
/**
 * Enumeration indicating the status of the multi-turn dialog. This property is included if the skill meets the requirements to use the Dialog directives. Note that COMPLETED is only possible when you use the Dialog.Delegate directive. If you use intent confirmation, dialogState is considered COMPLETED if the user denies the entire intent (for instance, by answering “no” when asked the confirmation prompt). Be sure to also check the confirmationStatus property on the Intent object before fulfilling the user’s request.
 * @enum
 */
export declare type DialogState = 'STARTED' | 'IN_PROGRESS' | 'COMPLETED';
/**
 *
 * @interface
 */
export declare type Directive = interfaces.customInterfaceController.StopEventHandlerDirective | interfaces.navigation.assistance.AnnounceRoadRegulation | interfaces.connections.SendRequestDirective | dialog.DynamicEntitiesDirective | interfaces.customInterfaceController.StartEventHandlerDirective | interfaces.gadgetController.SetLightDirective | interfaces.alexa.presentation.apl.SendIndexListDataDirective | dialog.DelegateDirective | dialog.ConfirmIntentDirective | interfaces.alexa.advertisement.InjectAds | interfaces.customInterfaceController.SendDirectiveDirective | interfaces.alexa.presentation.html.HandleMessageDirective | interfaces.alexa.presentation.apla.RenderDocumentDirective | dialog.ElicitSlotDirective | interfaces.alexa.presentation.html.StartDirective | interfaces.alexa.smartvision.snapshotprovider.GetSnapshotDirective | interfaces.audioplayer.StopDirective | dialog.ConfirmSlotDirective | interfaces.audioplayer.PlayDirective | interfaces.alexa.presentation.apl.ExecuteCommandsDirective | interfaces.display.RenderTemplateDirective | interfaces.conversations.ResetContextDirective | dialog.DelegateRequestDirective | interfaces.display.HintDirective | interfaces.connections.V1.StartConnectionDirective | interfaces.alexa.presentation.aplt.RenderDocumentDirective | interfaces.gameEngine.StartInputHandlerDirective | interfaces.videoapp.LaunchDirective | interfaces.alexa.presentation.aplt.ExecuteCommandsDirective | interfaces.gameEngine.StopInputHandlerDirective | interfaces.tasks.CompleteTaskDirective | interfaces.alexa.presentation.apl.RenderDocumentDirective | interfaces.connections.SendResponseDirective | interfaces.alexa.presentation.apl.SendTokenListDataDirective | interfaces.audioplayer.ClearQueueDirective | interfaces.alexa.presentation.apl.UpdateIndexListDataDirective;
/**
 * An object that represents what the user wants.
 * @interface
 */
export interface Intent {
    /**
     * A string representing the name of the intent.
     */
    'name': string;
    /**
     * A map of key-value pairs that further describes what the user meant based on a predefined intent schema. The map can be empty.
     */
    'slots'?: {
        [key: string]: Slot;
    };
    'confirmationStatus': IntentConfirmationStatus;
}
/**
 * Indication of whether an intent or slot has been explicitly confirmed or denied by the user, or neither.
 * @enum
 */
export declare type IntentConfirmationStatus = 'NONE' | 'DENIED' | 'CONFIRMED';
/**
 * This denotes the status of the permission scope.
 * @enum
 */
export declare type PermissionStatus = 'GRANTED' | 'DENIED';
/**
 * Contains a consentToken allowing the skill access to information that the customer has consented to provide, such as address information. Note that the consentToken is deprecated. Use the apiAccessToken available in the context object to determine the user’s permissions.
 * @interface
 */
export interface Permissions {
    /**
     * A token listing all the permissions granted for this user.
     */
    'consentToken'?: string;
    /**
     * A map where the key is a LoginWithAmazon(LWA) scope and value is a list of key:value pairs which describe the state of user actions on the LWA scope. For e.g. \"scopes\" :{ \"alexa::devices:all:geolocation:read\":{\"status\":\"GRANTED\"}} This value of \"alexa::devices:all:geolocation:read\" will determine if the Geolocation data access is granted by the user, or else it will show a card of type AskForPermissionsConsent to the user to get this permission.
     */
    'scopes'?: {
        [key: string]: Scope;
    };
}
/**
 * An object that describes the user (person) who is interacting with Alexa.
 * @interface
 */
export interface Person {
    /**
     * A string that represents a unique identifier for the person who is interacting with Alexa. The length of this identifier can vary, but is never more than 255 characters. It is generated when a recognized user makes a request to your skill.
     */
    'personId'?: string;
    /**
     * A token identifying the user in another system. This is only provided if the recognized user has successfully linked their skill account with their Alexa profile. The accessToken field will not appear if null.
     */
    'accessToken'?: string;
}
/**
 * A request object that provides the details of the user’s request. The request body contains the parameters necessary for the service to perform its logic and generate a response.
 * @interface
 */
export declare type Request = interfaces.alexa.advertisement.AdNotRendered | interfaces.alexa.datastore.packagemanager.InstallationError | events.skillevents.SkillEnabledRequest | services.listManagement.ListUpdatedEventRequest | interfaces.alexa.presentation.apl.UserEvent | events.skillevents.SkillDisabledRequest | services.listManagement.ListItemsCreatedEventRequest | SessionResumedRequest | SessionEndedRequest | interfaces.alexa.presentation.apl.LoadIndexListDataEvent | interfaces.alexa.presentation.apl.LoadTokenListDataEvent | interfaces.audioplayer.PlaybackFailedRequest | canfulfill.CanFulfillIntentRequest | interfaces.customInterfaceController.ExpiredRequest | interfaces.alexa.presentation.html.MessageRequest | interfaces.alexa.datastore.DataStoreError | LaunchRequest | authorization.AuthorizationGrantRequest | services.reminderManagement.ReminderCreatedEventRequest | interfaces.alexa.presentation.aplt.UserEvent | interfaces.alexa.advertisement.ReadyToEnqueueAudio | services.listManagement.ListItemsUpdatedEventRequest | services.listManagement.ListCreatedEventRequest | interfaces.audioplayer.PlaybackStartedRequest | interfaces.audioplayer.PlaybackNearlyFinishedRequest | interfaces.customInterfaceController.EventsReceivedRequest | services.reminderManagement.ReminderStatusChangedEventRequest | services.listManagement.ListItemsDeletedEventRequest | services.reminderManagement.ReminderDeletedEventRequest | interfaces.connections.ConnectionsResponse | services.listManagement.ListDeletedEventRequest | interfaces.gameEngine.InputHandlerEventRequest | interfaces.playbackcontroller.PauseCommandIssuedRequest | interfaces.playbackcontroller.PlayCommandIssuedRequest | interfaces.audioplayer.PlaybackFinishedRequest | events.skillevents.ProactiveSubscriptionChangedRequest | interfaces.display.ElementSelectedRequest | events.skillevents.PermissionChangedRequest | services.reminderManagement.ReminderUpdatedEventRequest | interfaces.alexa.advertisement.AdCompleted | interfaces.alexa.datastore.packagemanager.UpdateRequest | interfaces.alexa.presentation.apl.RuntimeErrorEvent | interfaces.alexa.presentation.html.RuntimeErrorRequest | dialog.InputRequest | IntentRequest | interfaces.alexa.datastore.packagemanager.UsagesRemoved | events.skillevents.NotificationSubscriptionChangedRequest | interfaces.conversations.APIInvocationRequest | services.reminderManagement.ReminderStartedEventRequest | interfaces.audioplayer.PlaybackStoppedRequest | interfaces.playbackcontroller.PreviousCommandIssuedRequest | interfaces.alexa.datastore.packagemanager.UsagesInstalled | events.skillevents.AccountLinkedRequest | interfaces.messaging.MessageReceivedRequest | interfaces.connections.ConnectionsRequest | interfaces.system.ExceptionEncounteredRequest | events.skillevents.PermissionAcceptedRequest | interfaces.playbackcontroller.NextCommandIssuedRequest | interfaces.alexa.presentation.apla.RuntimeErrorEvent;
/**
 * Request wrapper for all requests sent to your Skill.
 * @interface
 */
export interface RequestEnvelope {
    /**
     * The version specifier for the request.
     */
    'version': string;
    /**
     * The session object provides additional context associated with the request.
     */
    'session'?: Session;
    /**
     * The context object provides your skill with information about the current state of the Alexa service and device at the time the request is sent to your service. This is included on all requests. For requests sent in the context of a session (LaunchRequest and IntentRequest), the context object duplicates the user and application information that is also available in the session.
     */
    'context': Context;
    /**
     * A request object that provides the details of the user’s request.
     */
    'request': Request;
}
/**
 *
 * @interface
 */
export interface Response {
    'outputSpeech'?: ui.OutputSpeech;
    'card'?: ui.Card;
    'reprompt'?: ui.Reprompt;
    'directives'?: Array<Directive>;
    /**
     * API response object containing API response value(s)
     */
    'apiResponse'?: any;
    'shouldEndSession'?: boolean;
    'canFulfillIntent'?: canfulfill.CanFulfillIntent;
    /**
     * Experiment trigger response from skill
     */
    'experimentation'?: interfaces.alexa.experimentation.ExperimentTriggerResponse;
}
/**
 *
 * @interface
 */
export interface ResponseEnvelope {
    'version': string;
    'sessionAttributes'?: {
        [key: string]: any;
    };
    'userAgent'?: string;
    'response': Response;
}
/**
 * This is the value of LoginWithAmazon(LWA) consent scope. This object is used as in the key-value pairs that are provided in user.permissions.scopes object
 * @interface
 */
export interface Scope {
    'status'?: PermissionStatus;
}
/**
 * Represents a single execution of the alexa service
 * @interface
 */
export interface Session {
    /**
     * A boolean value indicating whether this is a new session. Returns true for a new session or false for an existing session.
     */
    'new': boolean;
    /**
     * A string that represents a unique identifier per a user’s active session.
     */
    'sessionId': string;
    /**
     * An object that describes the user making the request.
     */
    'user': User;
    /**
     * A map of key-value pairs. The attributes map is empty for requests where a new session has started with the property new set to true. When returning your response, you can include data you need to persist during the session in the sessionAttributes property. The attributes you provide are then passed back to your skill on the next request.
     */
    'attributes'?: {
        [key: string]: any;
    };
    'application': Application;
}
/**
 * An error object providing more information about the error that occurred.
 * @interface
 */
export interface SessionEndedError {
    /**
     * A string indicating the type of error that occurred.
     */
    'type': SessionEndedErrorType;
    /**
     * A string providing more information about the error.
     */
    'message': string;
}
/**
 * A string indicating the type of error that occurred.
 * @enum
 */
export declare type SessionEndedErrorType = 'INVALID_RESPONSE' | 'DEVICE_COMMUNICATION_ERROR' | 'INTERNAL_SERVICE_ERROR' | 'ENDPOINT_TIMEOUT';
/**
 * The reason why session ended when not initiated from the Skill itself.
 * @enum
 */
export declare type SessionEndedReason = 'USER_INITIATED' | 'ERROR' | 'EXCEEDED_MAX_REPROMPTS';
/**
 *
 * @interface
 */
export interface Slot {
    /**
     * A string that represents the name of the slot.
     */
    'name': string;
    /**
     * A string that represents the value the user spoke for the slot. This is the actual value the user spoke, not necessarily the canonical value or one of the synonyms defined for the entity. Note that AMAZON.LITERAL slot values sent to your service are always in all lower case.
     */
    'value'?: string;
    /**
     * Indication of whether an intent or slot has been explicitly confirmed or denied by the user, or neither.
     */
    'confirmationStatus': SlotConfirmationStatus;
    /**
     * Contains the resultsof entity resolution. These are organized by authority. An authority represents the source for the data provided for the slot. For a custom slot type, the authority is the slot type you defined.
     */
    'resolutions'?: slu.entityresolution.Resolutions;
    /**
     * Object representing the value of the slot.
     */
    'slotValue'?: SlotValue;
}
/**
 * An enumeration indicating whether the user has explicitly confirmed or denied the value of this slot.
 * @enum
 */
export declare type SlotConfirmationStatus = 'NONE' | 'DENIED' | 'CONFIRMED';
/**
 * Object representing the value captured in the slot.
 * @interface
 */
export declare type SlotValue = ListSlotValue | SimpleSlotValue;
/**
 * Status indicates a high level understanding of the result of an execution.
 * @interface
 */
export interface Status {
    /**
     * This is a code signifying the status of the execution initiated by the skill. Protocol adheres to HTTP status codes.
     */
    'code': string;
    /**
     * This is a message that goes along with response code that can provide more information about what occurred.
     */
    'message': string;
}
/**
 * An object listing each interface that the device supports. For example, if supportedInterfaces includes AudioPlayer {}, then you know that the device supports streaming audio using the AudioPlayer interface.
 * @interface
 */
export interface SupportedInterfaces {
    'Alexa.Advertisement'?: interfaces.alexa.advertisement.AlexaAdvertisementInterface;
    'Alexa.Presentation.APL'?: interfaces.alexa.presentation.apl.AlexaPresentationAplInterface;
    'Alexa.Presentation.APLT'?: interfaces.alexa.presentation.aplt.AlexaPresentationApltInterface;
    'Alexa.Presentation.HTML'?: interfaces.alexa.presentation.html.AlexaPresentationHtmlInterface;
    'AppLink'?: interfaces.applink.AppLinkInterface;
    'AudioPlayer'?: interfaces.audioplayer.AudioPlayerInterface;
    'Display'?: interfaces.display.DisplayInterface;
    'VideoApp'?: interfaces.videoapp.VideoAppInterface;
    'Geolocation'?: interfaces.geolocation.GeolocationInterface;
    'Navigation'?: interfaces.navigation.NavigationInterface;
}
/**
 * This object encapsulates a specific functionality.
 * @interface
 */
export interface Task {
    /**
     * Represents the name of the task.
     */
    'name': string;
    /**
     * Represents the version of the task.
     */
    'version': string;
    /**
     * Represents the input to handle the task.
     */
    'input'?: any;
}
/**
 * An object that describes the Amazon account for which the skill is enabled.
 * @interface
 */
export interface User {
    /**
     * A string that represents a unique identifier for the user who made the request. The length of this identifier can vary, but is never more than 255 characters. The userId is automatically generated when a user enables the skill in the Alexa app. Note: Disabling and re-enabling a skill generates a new identifier.
     */
    'userId': string;
    /**
     * A token identifying the user in another system. This is only provided if the user has successfully linked their skill account with their Amazon account.
     */
    'accessToken'?: string;
    'permissions'?: Permissions;
}
export declare namespace authorization {
    /**
     * Authorization grant body.
     * @interface
     */
    interface AuthorizationGrantBody {
        'grant': authorization.Grant;
    }
}
export declare namespace authorization {
    /**
     * Information that identifies a user in Amazon Alexa systems.
     * @interface
     */
    interface Grant {
        /**
         * Type of the grant.
         */
        'type': authorization.GrantType;
        /**
         * The authorization code for the user.
         */
        'code': string;
    }
}
export declare namespace authorization {
    /**
     * One of the grant types supported.
     * @enum
     */
    type GrantType = 'OAuth2.AuthorizationCode';
}
export declare namespace canfulfill {
    /**
     * CanFulfillIntent represents the response to canFulfillIntentRequest includes the details about whether the skill can understand and fulfill the intent request with detected slots.
     * @interface
     */
    interface CanFulfillIntent {
        'canFulfill': canfulfill.CanFulfillIntentValues;
        /**
         * A map that represents skill's detailed response to each detected slot within the intent such as if skill can understand and fulfill the detected slot. This supplements the overall canFulfillIntent response and help Alexa make better ranking and arbitration decisions. The key is the name of the slot. The value is an object of type CanFulfillSlot.
         */
        'slots'?: {
            [key: string]: canfulfill.CanFulfillSlot;
        };
    }
}
export declare namespace canfulfill {
    /**
     * Overall if skill can understand and fulfill the intent with detected slots. Respond YES when skill understands all slots, can fulfill all slots, and can fulfill the request in its entirety. Respond NO when skill either cannot understand the intent, cannot understand all the slots, or cannot fulfill all the slots. Respond MAYBE when skill can understand the intent, can partially or fully understand the slots, and can partially or fully fulfill the slots. The only cases where should respond MAYBE is when skill partially understand the request and can potentially complete the request if skill get more data, either through callbacks or through a multi-turn conversation with the user.
     * @enum
     */
    type CanFulfillIntentValues = 'YES' | 'NO' | 'MAYBE';
}
export declare namespace canfulfill {
    /**
     * This represents skill's capability to understand and fulfill each detected slot.
     * @interface
     */
    interface CanFulfillSlot {
        'canUnderstand': canfulfill.CanUnderstandSlotValues;
        'canFulfill'?: canfulfill.CanFulfillSlotValues;
    }
}
export declare namespace canfulfill {
    /**
     * This field indicates whether skill can fulfill relevant action for the slot, that has been partially or fully understood. The definition of fulfilling the slot is dependent on skill and skill is required to have logic in place to determine whether a slot value can be fulfilled in the context of skill or not. Return YES if Skill can certainly fulfill the relevant action for this slot value. Return NO if skill cannot fulfill the relevant action for this slot value. For specific recommendations to set the value refer to the developer docs for more details.
     * @enum
     */
    type CanFulfillSlotValues = 'YES' | 'NO';
}
export declare namespace canfulfill {
    /**
     * This field indicates whether skill has understood the slot value. In most typical cases, skills will do some form of entity resolution by looking up a catalog or list to determine whether they recognize the slot or not. Return YES if skill have a perfect match or high confidence match (for eg. synonyms) with catalog or list maintained by skill. Return NO if skill cannot understand or recognize the slot value. Return MAYBE if skill have partial confidence or partial match. This will be true when the slot value doesn’t exist as is, in the catalog, but a variation or a fuzzy match may exist. For specific recommendations to set the value refer to the developer docs for more details.
     * @enum
     */
    type CanUnderstandSlotValues = 'YES' | 'NO' | 'MAYBE';
}
export declare namespace dialog {
    /**
     * The delegation period.
     * @interface
     */
    interface DelegationPeriod {
        'until'?: dialog.DelegationPeriodUntil;
    }
}
export declare namespace dialog {
    /**
     * The end of the specified delegation period.   * EXPLICIT_RETURN - delegation lasts until the targeted dialog manager returns a delegate with a new target.   * NEXT_TURN - delegation lasts until the next turn, which resumes with the current focused dialog manager.
     * @enum
     */
    type DelegationPeriodUntil = 'EXPLICIT_RETURN' | 'NEXT_TURN';
}
export declare namespace dialog {
    /**
     * Structured input data to send to a dialog manager. Currently, this is an Alexa Conversations input instance.
     * @interface
     */
    interface Input {
        /**
         * The Alexa Conversations input name as dictated in the Conversations model.
         */
        'name': string;
        /**
         * A map of input slots by slot name.
         */
        'slots'?: {
            [key: string]: Slot;
        };
    }
}
export declare namespace dialog {
    /**
     * The updated request to delegate. Null will delegate the current request.
     * @interface
     */
    type UpdatedRequest = dialog.UpdatedInputRequest | dialog.UpdatedIntentRequest;
}
export declare namespace dynamicEndpoints {
    /**
     * Base response type.
     * @interface
     */
    type BaseResponse = dynamicEndpoints.FailureResponse | dynamicEndpoints.SuccessResponse;
}
export declare namespace dynamicEndpoints {
    /**
     * Request from a Dynamic endpoint connection.
     * @interface
     */
    interface Request {
        /**
         * The version of the request message schema used.
         */
        'version': string;
        /**
         * Denotes type of request.
         */
        'type': string;
        /**
         * The requestId for the dynamic endpoint request.
         */
        'requestId': string;
        /**
         * The request payload.
         */
        'requestPayload': string;
    }
}
export declare namespace er.dynamic {
    /**
     * Represents an entity that the skill wants to store. An entity has an optional Id and the value and the synonyms for the entity
     * @interface
     */
    interface Entity {
        /**
         * An unique id associated with the entity
         */
        'id'?: string;
        'name': er.dynamic.EntityValueAndSynonyms;
    }
}
export declare namespace er.dynamic {
    /**
     * Represents an array of entities of a particular type.
     * @interface
     */
    interface EntityListItem {
        /**
         * The entity type. Must match the slot type as defined in the interaction model.
         */
        'name': string;
        /**
         * A list of dynamic entities which are of the same type
         */
        'values': Array<er.dynamic.Entity>;
    }
}
export declare namespace er.dynamic {
    /**
     * A container object with value and synomyms for the entity
     * @interface
     */
    interface EntityValueAndSynonyms {
        /**
         * The entity value
         */
        'value': string;
        /**
         * An array of synonyms for the entity
         */
        'synonyms'?: Array<string>;
    }
}
export declare namespace er.dynamic {
    /**
     * Replace the existing dynamic entities or clear them from the catalog
     * @enum
     */
    type UpdateBehavior = 'REPLACE' | 'CLEAR';
}
export declare namespace events.skillevents {
    /**
     *
     * @interface
     */
    interface AccountLinkedBody {
        'accessToken'?: string;
    }
}
export declare namespace events.skillevents {
    /**
     *
     * @interface
     */
    interface NotificationSubscriptionChangedBody {
        /**
         * The list of to Topics that this user has subscribed/permitted to receive notification from your skill. If a customer unsubscribes for a Topic, this list will contain remaining Topics to which the customer is still subscribed to receive from your skill. If the list of subscriptions is empty, this customer has removed notification subscription for all Topics from your skill.
         */
        'subscriptions'?: Array<events.skillevents.NotificationSubscriptionEvent>;
    }
}
export declare namespace events.skillevents {
    /**
     *
     * @interface
     */
    interface NotificationSubscriptionEvent {
        /**
         * The topicId will be one of the Topics specified in your Skill's manifest file.
         */
        'topicId'?: string;
    }
}
export declare namespace events.skillevents {
    /**
     *
     * @interface
     */
    interface Permission {
        /**
         * The value representing the permission scope.
         */
        'scope'?: string;
    }
}
export declare namespace events.skillevents {
    /**
     *
     * @interface
     */
    interface PermissionBody {
        /**
         * The current list of permissions consented to on the account level. It can be an empty list if there are no account level permissions consented to.
         */
        'acceptedPermissions'?: Array<events.skillevents.Permission>;
        /**
         * The current list of permissions consented to on the person level. This is only present if the request contains the ```person``` object. It can be an empty list if there are no person level permissions consented to.
         */
        'acceptedPersonPermissions'?: Array<events.skillevents.Permission>;
    }
}
export declare namespace events.skillevents {
    /**
     *
     * @interface
     */
    interface ProactiveSubscriptionChangedBody {
        /**
         * The list of events that this customer is currently subscribed to. If a customer unsubscribes from an event, this list will contain remaining event types to which the customer is still subscribed to receive from your skill. If the list of subscriptions is empty, this customer has unsubscribed from all event types from your skill.
         */
        'subscriptions'?: Array<events.skillevents.ProactiveSubscriptionEvent>;
    }
}
export declare namespace events.skillevents {
    /**
     *
     * @interface
     */
    interface ProactiveSubscriptionEvent {
        'eventName'?: string;
    }
}
export declare namespace interfaces.alexa.advertisement {
    /**
     * The interface provides skills with the ability to seamlessly integrate advertisements during their interactions with users.
     * @interface
     */
    interface AlexaAdvertisementInterface {
    }
}
export declare namespace interfaces.alexa.advertisement {
    /**
     * The object encapsulates information regarding the reasons why the ad is not being rendered.
     * @interface
     */
    interface Reason {
        /**
         * The enum represents various details explaining why the ad is not being rendered.
         */
        'type'?: interfaces.alexa.advertisement.ReasonCode;
        /**
         * The message provides an explanation of the specific details as to why the ad is not being rendered.
         */
        'message'?: string;
    }
}
export declare namespace interfaces.alexa.advertisement {
    /**
     * The enum represents various details explaining why the ad is not being rendered.
     * @enum
     */
    type ReasonCode = 'DEVICE_OCCUPIED' | 'UNSUPPORTED_DEVICE' | 'SKILL_DAILY_CAP_LIMIT_REACHED' | 'DOMAIN_DAILY_CAP_LIMIT_REACHED' | 'INTERNAL_SERVER_ERROR' | 'AD_NOT_AVAILABLE';
}
export declare namespace interfaces.alexa.comms.messagingcontroller {
    /**
     * A map whose key is the new status and value is the message ID list. The status of the messages whose IDs are in the list will be updated to the new status from the key.
     * @interface
     */
    interface StatusMap {
        /**
         * List of read messages
         */
        'read'?: Array<string>;
        /**
         * List of deleted messages
         */
        'deleted'?: Array<string>;
    }
}
export declare namespace interfaces.alexa.datastore {
    /**
     * DataStore error object payload.
     * @interface
     */
    type CommandsError = interfaces.alexa.datastore.DeviceUnavailableError | interfaces.alexa.datastore.DevicePermanantlyUnavailableError | interfaces.alexa.datastore.DataStoreInternalError | interfaces.alexa.datastore.StorageLimitExeceededError;
}
export declare namespace interfaces.alexa.datastore {
    /**
     * Content of a commands dispatch error.
     * @interface
     */
    interface DispatchErrorContent {
        /**
         * Identifier of the device where execution error happens.
         */
        'deviceId': string;
        /**
         * Commands in the same order of request time so that skill can extend deliver expiry.
         */
        'commands': Array<services.datastore.v1.Command>;
    }
}
export declare namespace interfaces.alexa.datastore {
    /**
     * Type of error. Modules can also use this event to report global error like permission denied. Supported values [STORAGE_LIMIT_EXCEEDED, PERMISSION_DENIED, VALIDATION_ERROR, DATASTORE_INTERNAL_ERROR]
     * @interface
     */
    interface Error {
        /**
         * Type of error. Modules can also use this event to report global error like permission denied
         */
        'type': string;
        /**
         * Opaque payload which will contain additional details about error.
         */
        'content'?: any;
    }
}
export declare namespace interfaces.alexa.datastore {
    /**
     * Content of an execution error.
     * @interface
     */
    interface ExecutionErrorContent {
        /**
         * Identifier of the device where execution error happens.
         */
        'deviceId': string;
        /**
         * the command that was not executed successfully because of the error.
         */
        'failedCommand': services.datastore.v1.Command;
        /**
         * Opaque message describing the error.
         */
        'message'?: string;
    }
}
export declare namespace interfaces.alexa.datastore.packagemanager {
    /**
     * Interface using which skills communicate with DataStore Package Manager on the device.
     * @interface
     */
    interface AlexaDataStorePackageManagerInterface {
    }
}
export declare namespace interfaces.alexa.datastore.packagemanager {
    /**
     * Type of package error. Allowed values are [INTERNAL_ERROR]
     * @enum
     */
    type ErrorType = 'INTERNAL_ERROR';
}
export declare namespace interfaces.alexa.datastore.packagemanager {
    /**
     * Location where the package can be rendered on the device.
     * @enum
     */
    type Locations = 'FAVORITE';
}
export declare namespace interfaces.alexa.datastore.packagemanager {
    /**
     * Information of the package that is being installed on the device.
     * @interface
     */
    interface Package {
        /**
         * Version of a package manifest schema. Currently supported schema version is 1.0.
         */
        'packageVersion': string;
    }
}
export declare namespace interfaces.alexa.datastore.packagemanager {
    /**
     * Additional information about the package installation/update error.
     * @interface
     */
    interface PackageError {
        'type': interfaces.alexa.datastore.packagemanager.ErrorType;
        /**
         * Opaque payload which will contain additional details about error.
         */
        'content'?: any;
    }
}
export declare namespace interfaces.alexa.datastore.packagemanager {
    /**
     * Places where the package is going to be used on the device. This object is passed as part of the InstallRequest to the skill.
     * @interface
     */
    interface PackageInstallUsage {
        'location': interfaces.alexa.datastore.packagemanager.Locations;
        /**
         * Identifier of the instance of the package.
         */
        'instanceId'?: string;
    }
}
export declare namespace interfaces.alexa.datastore.packagemanager {
    /**
     * Provides context about the list of packages installed on the device.
     * @interface
     */
    interface PackageManagerState {
        /**
         * Includes all installed packages on the device.
         */
        'installedPackages'?: Array<interfaces.alexa.datastore.packagemanager.PackageStateInformation>;
    }
}
export declare namespace interfaces.alexa.datastore.packagemanager {
    /**
     * Places where the package is going to be not used anymore on the device. This object is passed as part of the PackageRemovedRequest to the skill.
     * @interface
     */
    interface PackageRemoveUsage {
        'location': interfaces.alexa.datastore.packagemanager.Locations;
        /**
         * Identifier of the instance of the package.
         */
        'instanceId'?: string;
    }
}
export declare namespace interfaces.alexa.datastore.packagemanager {
    /**
     * State information of the DataStore package version installed on the device.
     * @interface
     */
    interface PackageStateInformation {
        /**
         * Unique package identifier for a client.
         */
        'packageId': string;
        /**
         * Unique version of a package.
         */
        'version': string;
    }
}
export declare namespace interfaces.alexa.datastore.packagemanager {
    /**
     * Information about the package that is going to be installed on the device and also where its going to be used on the device.
     * @interface
     */
    interface UsagesInstallRequest {
        /**
         * Unique package identifier for a client.
         */
        'packageId': string;
        /**
         * Version of a package being installed on the device.
         */
        'packageVersion': string;
        /**
         * Areas where package is going to be used on the device.
         */
        'usages': Array<interfaces.alexa.datastore.packagemanager.PackageInstallUsage>;
    }
}
export declare namespace interfaces.alexa.datastore.packagemanager {
    /**
     * Information about where the package has been removed and where its not being used anymore.
     * @interface
     */
    interface UsagesRemovedRequest {
        /**
         * Unique package identifier for a client.
         */
        'packageId': string;
        /**
         * Version of a package being removed from the device.
         */
        'packageVersion': string;
        /**
         * Areas where package is going to be not used on the device.
         */
        'usages': Array<interfaces.alexa.datastore.packagemanager.PackageRemoveUsage>;
    }
}
export declare namespace interfaces.alexa.experimentation {
    /**
     * Represents the state of an active experiment's assignment
     * @interface
     */
    interface ExperimentAssignment {
        'id'?: string;
        'treatmentId'?: interfaces.alexa.experimentation.TreatmentId;
    }
}
export declare namespace interfaces.alexa.experimentation {
    /**
     * Experiment trigger response from skill
     * @interface
     */
    interface ExperimentTriggerResponse {
        /**
         * Contains array of triggered experiment ids
         */
        'triggeredExperiments'?: Array<string>;
    }
}
export declare namespace interfaces.alexa.experimentation {
    /**
     *
     * @interface
     */
    interface ExperimentationState {
        'activeExperiments'?: Array<interfaces.alexa.experimentation.ExperimentAssignment>;
    }
}
export declare namespace interfaces.alexa.experimentation {
    /**
     * Experiment treatment identifier
     * @enum
     */
    type TreatmentId = 'C' | 'T1';
}
export declare namespace interfaces.alexa.extension {
    /**
     * This object describes an extension that skill can request at runtime.
     * @interface
     */
    interface AvailableExtension {
    }
}
export declare namespace interfaces.alexa.extension {
    /**
     *
     * @interface
     */
    interface ExtensionsState {
        /**
         * A map from extension URI to extension object where the object space is reserved for providing authorization information or other such data in the future.
         */
        'available': {
            [key: string]: interfaces.alexa.extension.AvailableExtension;
        };
    }
}
export declare namespace interfaces.alexa.presentation {
    /**
     * Provides context about presentations at the time of the request.
     * @interface
     */
    interface PresentationState {
        /**
         * Includes all presentation contexts owned by the skill which were perceptible at the time of the request.
         */
        'contexts'?: Array<interfaces.alexa.presentation.PresentationStateContext>;
    }
}
export declare namespace interfaces.alexa.presentation {
    /**
     *
     * @interface
     */
    type PresentationStateContext = interfaces.alexa.presentation.AplPresentationStateContext;
}
export declare namespace interfaces.alexa.presentation.apl {
    /**
     *
     * @interface
     */
    interface AlexaPresentationAplInterface {
        'runtime'?: interfaces.alexa.presentation.apl.Runtime;
    }
}
export declare namespace interfaces.alexa.presentation.apl {
    /**
     * The alignment of the item after scrolling. Defaults to visible.
     * @enum
     */
    type Align = 'center' | 'first' | 'last' | 'visible';
}
export declare namespace interfaces.alexa.presentation.apl {
    /**
     * How repeated animations will play.
     * @enum
     */
    type AnimateItemRepeatMode = 'restart' | 'reverse';
}
export declare namespace interfaces.alexa.presentation.apl {
    /**
     *
     * @interface
     */
    type AnimatedProperty = interfaces.alexa.presentation.apl.AnimatedOpacityProperty | interfaces.alexa.presentation.apl.AnimatedTransformProperty;
}
export declare namespace interfaces.alexa.presentation.apl {
    /**
     * The audio track to play on. Defaults to “foreground”
     * @enum
     */
    type AudioTrack = 'foreground' | 'background' | 'none';
}
export declare namespace interfaces.alexa.presentation.apl {
    /**
     * The type of back navigation to use. Defaults to count.
     * @enum
     */
    type BackType = 'count' | 'index' | 'id';
}
export declare namespace interfaces.alexa.presentation.apl {
    /**
     * A message that can change the visual or audio presentation of the content on the screen.
     * @interface
     */
    type Command = interfaces.alexa.presentation.apl.SetPageCommand | interfaces.alexa.presentation.apl.ControlMediaCommand | interfaces.alexa.presentation.apl.FinishCommand | interfaces.alexa.presentation.apl.AutoPageCommand | interfaces.alexa.presentation.apl.PlayMediaCommand | interfaces.alexa.presentation.apl.GoBackCommand | interfaces.alexa.presentation.apl.ScrollCommand | interfaces.alexa.presentation.apl.IdleCommand | interfaces.alexa.presentation.apl.AnimateItemCommand | interfaces.alexa.presentation.apl.SendEventCommand | interfaces.alexa.presentation.apl.ShowOverlayCommand | interfaces.alexa.presentation.apl.SpeakListCommand | interfaces.alexa.presentation.apl.SelectCommand | interfaces.alexa.presentation.apl.HideOverlayCommand | interfaces.alexa.presentation.apl.SequentialCommand | interfaces.alexa.presentation.apl.SetStateCommand | interfaces.alexa.presentation.apl.SpeakItemCommand | interfaces.alexa.presentation.apl.ParallelCommand | interfaces.alexa.presentation.apl.OpenUrlCommand | interfaces.alexa.presentation.apl.ReinflateCommand | interfaces.alexa.presentation.apl.ClearFocusCommand | interfaces.alexa.presentation.apl.ScrollToIndexCommand | interfaces.alexa.presentation.apl.SetValueCommand | interfaces.alexa.presentation.apl.SetFocusCommand | interfaces.alexa.presentation.apl.ScrollToComponentCommand;
}
export declare namespace interfaces.alexa.presentation.apl {
    /**
     * The entity context data which was attached to an element.
     * @interface
     */
    interface ComponentEntity {
        'type'?: string;
        'value'?: string;
        'id'?: string;
    }
}
export declare namespace interfaces.alexa.presentation.apl {
    /**
     * Component state.
     * @enum
     */
    type ComponentState = 'checked' | 'disabled' | 'focused';
}
export declare namespace interfaces.alexa.presentation.apl {
    /**
     * Definition of a visible APL element shown on screen.
     * @interface
     */
    interface ComponentVisibleOnScreen {
        /**
         * All child elements of the displayed element.
         */
        'children'?: Array<interfaces.alexa.presentation.apl.ComponentVisibleOnScreen>;
        /**
         * The entities which were attached to the element.
         */
        'entities'?: Array<interfaces.alexa.presentation.apl.ComponentEntity>;
        /**
         * The id of the element.
         */
        'id': string;
        /**
         * Global position of the element (as seen by the device user).
         */
        'position': string;
        /**
         * The tags which were attached to the element.
         */
        'tags': interfaces.alexa.presentation.apl.ComponentVisibleOnScreenTags;
        /**
         * The transform which was applied to the element's position, specified as a 6-element numeric array containing the 2D homogeneous transformation matrix. The center of the transformation coordinate system is the center of the component. The transformation array is ordered as [A,B,C,D,Tx,Ty]. For more information refer to the W3C's CSS transforms documentation.
         */
        'transform'?: Array<number>;
        /**
         * The visual appearance of the element.
         */
        'type': string;
        /**
         * The system-generated uid of the element.
         */
        'uid': string;
        /**
         * The relative visibility of the element. 0 = not visible, 1 = fully visible on screen.
         */
        'visibility'?: number;
    }
}
export declare namespace interfaces.alexa.presentation.apl {
    /**
     * An element in a scrolling list
     * @interface
     */
    interface ComponentVisibleOnScreenListItemTag {
        /**
         * The zero-based index of this item in its parent.
         */
        'index'?: number;
    }
}
export declare namespace interfaces.alexa.presentation.apl {
    /**
     * An ordered list of items
     * @interface
     */
    interface ComponentVisibleOnScreenListTag {
        /**
         * The total number of items in the list.
         */
        'itemCount'?: number;
        /**
         * The index of the lowest item seen.
         */
        'lowestIndexSeen'?: number;
        /**
         * The index of the highest item seen.
         */
        'highestIndexSeen'?: number;
        /**
         * The ordinal of the lowest ordinal-equipped item seen.
         */
        'lowestOrdinalSeen'?: number;
        /**
         * The ordinal of the highest ordinal-equipped item seen.
         */
        'highestOrdinalSeen'?: number;
    }
}
export declare namespace interfaces.alexa.presentation.apl {
    /**
     * Media player
     * @interface
     */
    interface ComponentVisibleOnScreenMediaTag {
        /**
         * Current position of the play head from the start of the track.
         */
        'positionInMilliseconds'?: number;
        'state'?: interfaces.alexa.presentation.apl.ComponentVisibleOnScreenMediaTagStateEnum;
        /**
         * Whether the user may seek forward relative to the current position.
         */
        'allowAdjustSeekPositionForward'?: boolean;
        /**
         * Whether the user may seek backwards relative to the current position.
         */
        'allowAdjustSeekPositionBackwards'?: boolean;
        /**
         * Whether the user may move forward to the next track.
         */
        'allowNext'?: boolean;
        /**
         * Whether the user may move backward to the previous track.
         */
        'allowPrevious'?: boolean;
        'entities'?: Array<interfaces.alexa.presentation.apl.ComponentEntity>;
        /**
         * The URL of the current media track.
         */
        'url'?: string;
    }
}
export declare namespace interfaces.alexa.presentation.apl {
    /**
     * Media player stage posible states
     * @enum
     */
    type ComponentVisibleOnScreenMediaTagStateEnum = 'idle' | 'playing' | 'paused';
}
export declare namespace interfaces.alexa.presentation.apl {
    /**
     * A collection of items that are displayed one at a time.
     * @interface
     */
    interface ComponentVisibleOnScreenPagerTag {
        /**
         * The index of the current page.
         */
        'index'?: number;
        /**
         * The total number of pages.
         */
        'pageCount'?: number;
        /**
         * Indicates whether the pager will accept a forward command.
         */
        'allowForward'?: boolean;
        /**
         * Indicates whether the pager will accept a backward command.
         */
        'allowBackwards'?: boolean;
    }
}
export declare namespace interfaces.alexa.presentation.apl {
    /**
     * A scrollable region.
     * @interface
     */
    interface ComponentVisibleOnScreenScrollableTag {
        'direction'?: interfaces.alexa.presentation.apl.ComponentVisibleOnScreenScrollableTagDirectionEnum;
        /**
         * Whether scrolling forward is accepted.
         */
        'allowForward'?: boolean;
        /**
         * Whether scrolling backward is accepted.
         */
        'allowBackward'?: boolean;
    }
}
export declare namespace interfaces.alexa.presentation.apl {
    /**
     * Scrolling direction
     * @enum
     */
    type ComponentVisibleOnScreenScrollableTagDirectionEnum = 'horizontal' | 'vertical';
}
export declare namespace interfaces.alexa.presentation.apl {
    /**
     * The tags which were attached to an element.
     * @interface
     */
    interface ComponentVisibleOnScreenTags {
        /**
         * The checked state of a component that has two states.
         */
        'checked'?: boolean;
        /**
         * A button or item that can be pressed.
         */
        'clickable'?: boolean;
        /**
         * Whether the element is disabled.
         */
        'disabled'?: boolean;
        /**
         * The focused state of a component that can take focus.
         */
        'focused'?: boolean;
        /**
         * An ordered list of items.
         */
        'list'?: interfaces.alexa.presentation.apl.ComponentVisibleOnScreenListTag;
        /**
         * An element in a sequence.
         */
        'listItem'?: interfaces.alexa.presentation.apl.ComponentVisibleOnScreenListItemTag;
        /**
         * Media player
         */
        'media'?: interfaces.alexa.presentation.apl.ComponentVisibleOnScreenMediaTag;
        /**
         * A visibly numbered element.
         */
        'ordinal'?: number;
        /**
         * A collection of items that are displayed one at a time.
         */
        'pager'?: interfaces.alexa.presentation.apl.ComponentVisibleOnScreenPagerTag;
        /**
         * A scrolling region
         */
        'scrollable'?: interfaces.alexa.presentation.apl.ComponentVisibleOnScreenScrollableTag;
        /**
         * A region of the screen that can be read out by TTS
         */
        'spoken'?: boolean;
        /**
         * The entire screen in which a document is rendered.
         */
        'viewport'?: interfaces.alexa.presentation.apl.ComponentVisibleOnScreenViewportTag;
    }
}
export declare namespace interfaces.alexa.presentation.apl {
    /**
     * The entire screen in which a document is rendered.
     * @interface
     */
    interface ComponentVisibleOnScreenViewportTag {
    }
}
export declare namespace interfaces.alexa.presentation.apl {
    /**
     * How highlighting is applied: on a line-by-line basis, or to the entire block. Defaults to block.
     * @enum
     */
    type HighlightMode = 'block' | 'line';
}
export declare namespace interfaces.alexa.presentation.apl {
    /**
     * The reason for the failure.
     * @enum
     */
    type ListRuntimeErrorReason = 'INVALID_PRESENTATION_TOKEN' | 'INVALID_LIST_ID' | 'INVALID_DATASOURCE' | 'INVALID_OPERATION' | 'MISSING_LIST_VERSION' | 'DUPLICATE_LIST_VERSION' | 'LIST_INDEX_OUT_OF_RANGE' | 'MISSING_LIST_VERSION_IN_SEND_DATA' | 'LOAD_TIMEOUT' | 'INCONSISTENT_LIST_ID' | 'INCONSISTENT_PAGE_TOKEN' | 'INCONSISTENT_PAGE_ITEMS' | 'DUPLICATE_PAGE_TOKEN' | 'OCCUPIED_LIST_INDEX' | 'LOAD_INDEX_OUT_OF_RANGE' | 'INCONSISTENT_RANGE' | 'MISSING_LIST_ITEMS' | 'INTERNAL_ERROR';
}
export declare namespace interfaces.alexa.presentation.apl {
    /**
     * The command enumerated value is the operation that should be performed on the media player.
     * @enum
     */
    type MediaCommandType = 'play' | 'pause' | 'next' | 'previous' | 'rewind' | 'seek' | 'setTrack';
}
export declare namespace interfaces.alexa.presentation.apl {
    /**
     * Whether the value is a relative or absolute offset. Defaults to absolute.
     * @enum
     */
    type Position = 'absolute' | 'relative';
}
export declare namespace interfaces.alexa.presentation.apl {
    /**
     * Provides context for any APL content shown on screen.
     * @interface
     */
    interface RenderedDocumentState {
        /**
         * The token specified in the RenderDocument directive which rendered the content shown on screen.
         */
        'token'?: string;
        /**
         * The APL version of the document which rendered the content shown on screen.
         */
        'version'?: string;
        /**
         * List of the visible APL components currently shown on screen.
         */
        'componentsVisibleOnScreen'?: Array<interfaces.alexa.presentation.apl.ComponentVisibleOnScreen>;
        /**
         * List of registered data sources' associated metadata
         */
        'dataSources'?: Array<any>;
    }
}
export declare namespace interfaces.alexa.presentation.apl {
    /**
     * Contains the runtime information for the interface.
     * @interface
     */
    interface Runtime {
        /**
         * Maximum APL version supported by the runtime.
         */
        'maxVersion'?: string;
    }
}
export declare namespace interfaces.alexa.presentation.apl {
    /**
     * A description of an error in APL functionality.
     * @interface
     */
    type RuntimeError = interfaces.alexa.presentation.apl.ListRuntimeError;
}
export declare namespace interfaces.alexa.presentation.apl {
    /**
     * Transform property to apply to a component.
     * @interface
     */
    type TransformProperty = interfaces.alexa.presentation.apl.MoveTransformProperty | interfaces.alexa.presentation.apl.ScaleTransformProperty | interfaces.alexa.presentation.apl.RotateTransformProperty | interfaces.alexa.presentation.apl.SkewTransformProperty;
}
export declare namespace interfaces.alexa.presentation.apl {
    /**
     * The source property holds the video clip or sequence of video clips to play.
     * @interface
     */
    interface VideoSource {
        /**
         * Optional description of this source material
         */
        'description'?: string;
        /**
         * Duration of time to play. If not set, defaults to the entire stream. Expressed in milliseconds.
         */
        'duration'?: number | string;
        /**
         * Media source material
         */
        'url': string;
        /**
         * Number of times to loop the video. Defaults to 0.
         */
        'repeatCount'?: number | string;
        /**
         * Offset to start playing at in the stream (defaults to 0).
         */
        'offset'?: number | string;
    }
}
export declare namespace interfaces.alexa.presentation.apl.listoperations {
    /**
     * An operation which adds, removes or replaces item(s) defined in a dynamicIndexList.
     * @interface
     */
    type Operation = interfaces.alexa.presentation.apl.listoperations.SetItemOperation | interfaces.alexa.presentation.apl.listoperations.InsertMultipleItemsOperation | interfaces.alexa.presentation.apl.listoperations.DeleteMultipleItemsOperation | interfaces.alexa.presentation.apl.listoperations.InsertItemOperation | interfaces.alexa.presentation.apl.listoperations.DeleteItemOperation;
}
export declare namespace interfaces.alexa.presentation.apla {
    /**
     * The reason for the failure.
     * @enum
     */
    type AudioSourceErrorReason = 'UNKNOWN_ERROR' | 'INTERNAL_SERVER_ERROR' | 'NOT_FOUND_ERROR' | 'SSL_HANDSHAKE_ERROR' | 'TIMEOUT_ERROR' | 'INVALID_URI_ERROR' | 'HTTPS_ERROR';
}
export declare namespace interfaces.alexa.presentation.apla {
    /**
     * The reason for the failure.
     * @enum
     */
    type DocumentErrorReason = 'UNKNOWN_ERROR' | 'INTERNAL_SERVER_ERROR';
}
export declare namespace interfaces.alexa.presentation.apla {
    /**
     * The reason for the failure.
     * @enum
     */
    type LinkErrorReason = 'UNKNOWN_ERROR' | 'INTERNAL_SERVER_ERROR' | 'NOT_FOUND_ERROR';
}
export declare namespace interfaces.alexa.presentation.apla {
    /**
     * The reason for the failure.
     * @enum
     */
    type RenderErrorReason = 'UNKNOWN_ERROR' | 'INTERNAL_SERVER_ERROR';
}
export declare namespace interfaces.alexa.presentation.apla {
    /**
     * A description of an error in APLA functionality.
     * @interface
     */
    type RuntimeError = interfaces.alexa.presentation.apla.AudioSourceRuntimeError | interfaces.alexa.presentation.apla.RenderRuntimeError | interfaces.alexa.presentation.apla.DocumentRuntimeError | interfaces.alexa.presentation.apla.LinkRuntimeError;
}
export declare namespace interfaces.alexa.presentation.aplt {
    /**
     *
     * @interface
     */
    interface AlexaPresentationApltInterface {
        'runtime'?: interfaces.alexa.presentation.aplt.Runtime;
    }
}
export declare namespace interfaces.alexa.presentation.aplt {
    /**
     * A message that can change the visual or audio presentation of the content on the screen.
     * @interface
     */
    type Command = interfaces.alexa.presentation.aplt.SetValueCommand | interfaces.alexa.presentation.aplt.IdleCommand | interfaces.alexa.presentation.aplt.AutoPageCommand | interfaces.alexa.presentation.aplt.ScrollCommand | interfaces.alexa.presentation.aplt.SendEventCommand | interfaces.alexa.presentation.aplt.ParallelCommand | interfaces.alexa.presentation.aplt.SetPageCommand | interfaces.alexa.presentation.aplt.SequentialCommand;
}
export declare namespace interfaces.alexa.presentation.aplt {
    /**
     * Whether the value is a relative or absolute offset. Defaults to absolute.
     * @enum
     */
    type Position = 'absolute' | 'relative';
}
export declare namespace interfaces.alexa.presentation.aplt {
    /**
     * Contains the runtime information for the interface.
     * @interface
     */
    interface Runtime {
        /**
         * Maximum APL-T version supported by the runtime.
         */
        'maxVersion'?: string;
    }
}
export declare namespace interfaces.alexa.presentation.aplt {
    /**
     * Name of a supported profile on character display.
     * @enum
     */
    type TargetProfile = 'FOUR_CHARACTER_CLOCK' | 'NONE';
}
export declare namespace interfaces.alexa.presentation.html {
    /**
     *
     * @interface
     */
    interface AlexaPresentationHtmlInterface {
        'runtime'?: interfaces.alexa.presentation.html.Runtime;
    }
}
export declare namespace interfaces.alexa.presentation.html {
    /**
     *
     * @interface
     */
    interface Configuration {
        /**
         * The number of seconds the content can stay on the screen without user interaction. Default value is 30 seconds. Maximum allowed value is 5 minutes.
         */
        'timeoutInSeconds'?: number;
    }
}
export declare namespace interfaces.alexa.presentation.html {
    /**
     * Contains the runtime information for the interface.
     * @interface
     */
    interface Runtime {
        /**
         * The max version of the HTML runtime supported by the device.
         */
        'maxVersion': string;
    }
}
export declare namespace interfaces.alexa.presentation.html {
    /**
     *
     * @interface
     */
    interface RuntimeError {
        'reason': interfaces.alexa.presentation.html.RuntimeErrorReason;
        /**
         * Details about why the error occurred
         */
        'message'?: string;
        /**
         * Error code
         */
        'code'?: string;
    }
}
export declare namespace interfaces.alexa.presentation.html {
    /**
     *
     * @enum
     */
    type RuntimeErrorReason = 'HTTP_REQUEST_ERROR' | 'TIMED_OUT' | 'FILE_TYPE_NOT_SUPPORTED' | 'APPLICATION_ERROR';
}
export declare namespace interfaces.alexa.presentation.html {
    /**
     *
     * @interface
     */
    interface StartRequest {
        'method': interfaces.alexa.presentation.html.StartRequestMethod;
        /**
         * HTTPS URI of the HTML page to load. This URI must abide by the [URI RFC 3986](https://tools.ietf.org/html/rfc3986). The HTML runtime must perform secure requests, using the HTTPS schema. Maximum size 8000 characters
         */
        'uri'?: string;
        /**
         * HTTP headers that the HTML runtime requires to access resources. Only the Authorization header and custom headers are allowed
         */
        'headers'?: any;
    }
}
export declare namespace interfaces.alexa.presentation.html {
    /**
     *
     * @enum
     */
    type StartRequestMethod = 'GET';
}
export declare namespace interfaces.alexa.presentation.html {
    /**
     * Properties for performing text to speech transformations. These are the same properties that [APL transformers](https://developer.amazon.com/docs/alexa-presentation-language/apl-data-source.html#transformer-properties-and-conversion-rules) use.
     * @interface
     */
    interface Transformer {
        'transformer': interfaces.alexa.presentation.html.TransformerType;
        /**
         * A JSON path that points to either a single entity in the message object, or a set of entities using wildcard or unresolved arrays. Examples 'family[*].name', 'address.street'. See [APL transformer properties](https://developer.amazon.com/docs/alexa-presentation-language/apl-data-source.html#transformer-properties-and-conversion-rules) for more details.
         */
        'inputPath': string;
        /**
         * Name of the output property to add to the message object. For example, if the inputPath is \"address.street\", the transformer output will be stored at \"address.outputName\". If no outputName is supplied, the transformer output will override the value at inputPath.
         */
        'outputName'?: string;
    }
}
export declare namespace interfaces.alexa.presentation.html {
    /**
     *
     * @enum
     */
    type TransformerType = 'ssmlToSpeech' | 'textToSpeech' | 'textToHint' | 'ssmlToText';
}
export declare namespace interfaces.amazonpay.model.request {
    /**
     *
     * @interface
     */
    type BaseAmazonPayEntity = interfaces.amazonpay.model.request.SellerBillingAgreementAttributes | interfaces.amazonpay.model.request.Price | interfaces.amazonpay.request.ChargeAmazonPayRequest | interfaces.amazonpay.model.request.BillingAgreementAttributes | interfaces.amazonpay.model.request.SellerOrderAttributes | interfaces.amazonpay.model.request.ProviderAttributes | interfaces.amazonpay.model.request.AuthorizeAttributes | interfaces.amazonpay.request.SetupAmazonPayRequest | interfaces.amazonpay.model.request.ProviderCredit;
}
export declare namespace interfaces.amazonpay.model.request {
    /**
     * * This is used to specify applicable billing agreement type. * CustomerInitiatedTransaction – customer is present at the time of processing payment for the order. * MerchantInitiatedTransaction – customer is not present at the time of processing payment for the order.
     * @enum
     */
    type BillingAgreementType = 'CustomerInitiatedTransaction' | 'MerchantInitiatedTransaction';
}
export declare namespace interfaces.amazonpay.model.request {
    /**
     * * This is used to specify applicable payment action. * Authorize – you want to confirm the order and authorize a certain amount, but you do not want to capture at this time. * AuthorizeAndCapture – you want to confirm the order, authorize for the given amount, and capture the funds.
     * @enum
     */
    type PaymentAction = 'Authorize' | 'AuthorizeAndCapture';
}
export declare namespace interfaces.amazonpay.model.response {
    /**
     * Indicates if the contract is for a Live (Production) or Sandbox environment.
     * @enum
     */
    type ReleaseEnvironment = 'LIVE' | 'SANDBOX';
}
export declare namespace interfaces.amazonpay.model.response {
    /**
     * Indicates the state that the Authorization object is in. For more information see “Authorization states and reason codes” under “States and reason codes” section in Amazon Pay API Reference Guide.
     * @enum
     */
    type State = 'Pending' | 'Open' | 'Declined' | 'Closed';
}
export declare namespace interfaces.amazonpay.model.v1 {
    /**
     * This object encapsulates details about an Authorization object including the status, amount captured and fee charged.
     * @interface
     */
    interface AuthorizationDetails {
        /**
         * This is AmazonPay generated identifier for this authorization transaction.
         */
        'amazonAuthorizationId'?: string;
        /**
         * This is 3P seller's identifier for this authorization transaction. This identifier must be unique for all of your authorization transactions.
         */
        'authorizationReferenceId'?: string;
        /**
         * A description for the transaction that is included in emails to the user. Appears only when AuthorizeAndCapture is chosen.
         */
        'sellerAuthorizationNote'?: string;
        'authorizationAmount'?: interfaces.amazonpay.model.v1.Price;
        'capturedAmount'?: interfaces.amazonpay.model.v1.Price;
        'authorizationFee'?: interfaces.amazonpay.model.v1.Price;
        /**
         * list of AmazonCaptureId identifiers that have been requested on this Authorization object.
         */
        'idList'?: Array<string>;
        /**
         * This is the time at which the authorization was created.
         */
        'creationTimestamp'?: string;
        /**
         * This is the time at which the authorization expires.
         */
        'expirationTimestamp'?: string;
        'authorizationStatus'?: interfaces.amazonpay.model.v1.AuthorizationStatus;
        /**
         * This indicates whether an authorization resulted in a soft decline.
         */
        'softDecline'?: boolean;
        /**
         * This indicates whether a direct capture against the payment contract was specified.
         */
        'captureNow'?: boolean;
        /**
         * This is the description to be shown on the buyer's payment instrument statement if AuthorizeAndCapture was chosen.
         */
        'softDescriptor'?: string;
    }
}
export declare namespace interfaces.amazonpay.model.v1 {
    /**
     * Indicates the current status of an Authorization object, a Capture object, or a Refund object.
     * @interface
     */
    interface AuthorizationStatus {
        'state'?: interfaces.amazonpay.model.v1.State;
        /**
         * The reason that the Authorization object, Capture object, or Refund object is in the current state. For more information, see - https://pay.amazon.com/us/developer/documentation/apireference/201752950
         */
        'reasonCode'?: string;
        /**
         * Reason desciption corresponding to the reason code
         */
        'reasonDescription'?: string;
        /**
         * A timestamp that indicates the time when the authorization, capture, or refund state was last updated. In ISO 8601 format
         */
        'lastUpdateTimestamp'?: string;
    }
}
export declare namespace interfaces.amazonpay.model.v1 {
    /**
     * This is an object to set the attributes specified in the AuthorizeAttributes table. See the “AuthorizationDetails” section of the Amazon Pay API reference guide for details about this object.
     * @interface
     */
    interface AuthorizeAttributes {
        /**
         * This is 3P seller's identifier for this authorization transaction. This identifier must be unique for all of your authorization transactions.
         */
        'authorizationReferenceId': string;
        'authorizationAmount': interfaces.amazonpay.model.v1.Price;
        /**
         * The maximum number of minutes allocated for the Authorize operation call to be processed. After this the authorization is automatically declined and you cannot capture funds against the authorization. The default value for Alexa transactions is 0. In order to speed up checkout time for voice users we recommend to not change this value.
         */
        'transactionTimeout'?: number;
        /**
         * A description for the transaction that is included in emails to the user. Appears only when AuthorizeAndCapture is chosen.
         */
        'sellerAuthorizationNote'?: string;
        /**
         * The description to be shown on the user's payment instrument statement if AuthorizeAndCapture is chosen. Format of soft descriptor sent to the payment processor is \"AMZ* <soft descriptor specified here>\". Default is \"AMZ*<SELLER_NAME> amzn.com/ pmts WA\". Maximum length can be 16 characters.
         */
        'softDescriptor'?: string;
    }
}
export declare namespace interfaces.amazonpay.model.v1 {
    /**
     * The merchant can choose to set the attributes specified in the BillingAgreementAttributes.
     * @interface
     */
    interface BillingAgreementAttributes {
        /**
         * Represents the SellerId of the Solution Provider that developed the eCommerce platform. This value is only used by Solution Providers, for whom it is required. It should not be provided by merchants creating their own custom integration. Do not specify the SellerId of the merchant for this request parameter. If you are a merchant, do not enter a PlatformId.
         */
        'platformId'?: string;
        /**
         * Represents a description of the billing agreement that is displayed in emails to the buyer.
         */
        'sellerNote'?: string;
        'sellerBillingAgreementAttributes'?: interfaces.amazonpay.model.v1.SellerBillingAgreementAttributes;
        'billingAgreementType'?: interfaces.amazonpay.model.v1.BillingAgreementType;
        'subscriptionAmount'?: interfaces.amazonpay.model.v1.Price;
    }
}
export declare namespace interfaces.amazonpay.model.v1 {
    /**
     * The result attributes from successful SetupAmazonPay call.
     * @interface
     */
    interface BillingAgreementDetails {
        /**
         * Billing agreement id which can be used for one time and recurring purchases
         */
        'billingAgreementId': string;
        /**
         * Time at which billing agreement details created.
         */
        'creationTimestamp'?: string;
        /**
         * The default shipping address of the buyer. Returned if needAmazonShippingAddress is set to true.
         */
        'destination'?: interfaces.amazonpay.model.v1.Destination;
        /**
         * Merchant's preferred language of checkout.
         */
        'checkoutLanguage'?: string;
        'releaseEnvironment': interfaces.amazonpay.model.v1.ReleaseEnvironment;
        'billingAgreementStatus': interfaces.amazonpay.model.v1.BillingAgreementStatus;
    }
}
export declare namespace interfaces.amazonpay.model.v1 {
    /**
     * Indicates the current status of the billing agreement. For more information about the State and ReasonCode response elements, see Billing agreement states and reason codes - https://pay.amazon.com/us/developer/documentation/apireference/201752870
     * @enum
     */
    type BillingAgreementStatus = 'CANCELED' | 'CLOSED' | 'DRAFT' | 'OPEN' | 'SUSPENDED';
}
export declare namespace interfaces.amazonpay.model.v1 {
    /**
     * * This is used to specify applicable billing agreement type. * CustomerInitiatedTransaction – customer is present at the time of processing payment for the order. * MerchantInitiatedTransaction – customer is not present at the time of processing payment for the order.
     * @enum
     */
    type BillingAgreementType = 'CustomerInitiatedTransaction' | 'MerchantInitiatedTransaction';
}
export declare namespace interfaces.amazonpay.model.v1 {
    /**
     * Destination object containing the details of an Address.
     * @interface
     */
    interface Destination {
        /**
         * The name or business name
         */
        'name'?: string;
        /**
         * The company name
         */
        'companyName'?: string;
        /**
         * The first line of the address. At least one AddressLine (AddressLine1, AddressLine2, or AddressLine3) is required.
         */
        'addressLine1'?: string;
        /**
         * The second line of the address. At least one AddressLine (AddressLine1, AddressLine2, or AddressLine3) is required.
         */
        'addressLine2'?: string;
        /**
         * The third line of the address. At least one AddressLine (AddressLine1, AddressLine2, or AddressLine3) is required.
         */
        'addressLine3'?: string;
        /**
         * The city
         */
        'city'?: string;
        /**
         * The district or County
         */
        'districtOrCounty'?: string;
        /**
         * The state or region. This element is free text and can be either a 2-character code, fully spelled out, or abbreviated. Required. Note :- This response element is returned only in the U.S.
         */
        'stateOrRegion'?: string;
        /**
         * The postal code.
         */
        'postalCode'?: string;
        /**
         * The country code, in ISO 3166 format
         */
        'countryCode'?: string;
        /**
         * The phone number
         */
        'phone'?: string;
    }
}
export declare namespace interfaces.amazonpay.model.v1 {
    /**
     * * This is used to specify applicable payment action. * Authorize – you want to confirm the order and authorize a certain amount, but you do not want to capture at this time. * AuthorizeAndCapture – you want to confirm the order, authorize for the given amount, and capture the funds.
     * @enum
     */
    type PaymentAction = 'Authorize' | 'AuthorizeAndCapture';
}
export declare namespace interfaces.amazonpay.model.v1 {
    /**
     * This object specifies amount and currency authorized/captured.
     * @interface
     */
    interface Price {
        /**
         * Amount authorized/captured.
         */
        'amount': string;
        /**
         * Currency code for the amount.
         */
        'currencyCode': string;
    }
}
export declare namespace interfaces.amazonpay.model.v1 {
    /**
     * This is required only for Ecommerce provider (Solution provider) use cases.
     * @interface
     */
    interface ProviderAttributes {
        /**
         * Solution provider ID.
         */
        'providerId': string;
        /**
         * List of provider credit.
         */
        'providerCreditList': Array<interfaces.amazonpay.model.v1.ProviderCredit>;
    }
}
export declare namespace interfaces.amazonpay.model.v1 {
    /**
     *
     * @interface
     */
    interface ProviderCredit {
        /**
         * This is required only for Ecommerce provider (Solution provider) use cases.
         */
        'providerId'?: string;
        'credit'?: interfaces.amazonpay.model.v1.Price;
    }
}
export declare namespace interfaces.amazonpay.model.v1 {
    /**
     * Indicates if the order is for a Live (Production) or Sandbox environment.
     * @enum
     */
    type ReleaseEnvironment = 'LIVE' | 'SANDBOX';
}
export declare namespace interfaces.amazonpay.model.v1 {
    /**
     * Provides more context about the billing agreement that is represented by this Billing Agreement object.
     * @interface
     */
    interface SellerBillingAgreementAttributes {
        /**
         * The merchant-specified identifier of this billing agreement. At least one request parameter must be specified. Amazon recommends that you use only the following characters:- lowercase a-z, uppercase A-Z, numbers 0-9, dash (-), underscore (_).
         */
        'sellerBillingAgreementId'?: string;
        /**
         * The identifier of the store from which the order was placed. This overrides the default value in Seller Central under Settings > Account Settings. It is displayed to the buyer in their emails and transaction history on the Amazon Payments website.
         */
        'storeName'?: string;
        /**
         * Any additional information that you wish to include with this billing agreement. At least one request parameter must be specified.
         */
        'customInformation'?: string;
    }
}
export declare namespace interfaces.amazonpay.model.v1 {
    /**
     * This object includes elements shown to buyers in emails and in their transaction history. See the “SellerOrderAttributes” section of the Amazon Pay API reference guide for details about this object.
     * @interface
     */
    interface SellerOrderAttributes {
        /**
         * The merchant-specified identifier of this order. This is shown to the buyer in their emails and transaction history on the Amazon Pay website.
         */
        'sellerOrderId'?: string;
        /**
         * The identifier of the store from which the order was placed. This overrides the default value in Seller Central under Settings > Account Settings. It is displayed to the buyer in their emails and transaction history on the Amazon Payments website.
         */
        'storeName'?: string;
        /**
         * Any additional information that you want to include with this order reference.
         */
        'customInformation'?: string;
        /**
         * This represents a description of the order that is displayed in emails to the buyer.
         */
        'sellerNote'?: string;
    }
}
export declare namespace interfaces.amazonpay.model.v1 {
    /**
     * Indicates the state that the Authorization object, Capture object, or Refund object is in. For more information see - https://pay.amazon.com/us/developer/documentation/apireference/201752950
     * @enum
     */
    type State = 'Pending' | 'Open' | 'Declined' | 'Closed' | 'Completed';
}
export declare namespace interfaces.amazonpay.response {
    /**
     * Setup Amazon Pay Result Object. It is sent as part of the response to SetupAmazonPayRequest.
     * @interface
     */
    interface SetupAmazonPayResult {
        'billingAgreementDetails': interfaces.amazonpay.model.response.BillingAgreementDetails;
    }
}
export declare namespace interfaces.amazonpay.v1 {
    /**
     * Error response for SetupAmazonPay and ChargeAmazonPay calls.
     * @interface
     */
    interface AmazonPayErrorResponse {
        /**
         * Error code indicating the succinct cause of error
         */
        'errorCode': string;
        /**
         * Description of the error.
         */
        'errorMessage': string;
    }
}
export declare namespace interfaces.amazonpay.v1 {
    /**
     * Charge Amazon Pay Request Object
     * @interface
     */
    interface ChargeAmazonPay {
        /**
         * Authorization token that contains the permissions consented to by the user.
         */
        'consentToken'?: string;
        /**
         * The seller ID (also known as merchant ID). If you are an Ecommerce Provider (Solution Provider), please specify the ID of the merchant, not your provider ID.
         */
        'sellerId': string;
        /**
         * The payment contract i.e. billing agreement created for the user.
         */
        'billingAgreementId': string;
        'paymentAction': interfaces.amazonpay.model.v1.PaymentAction;
        'authorizeAttributes': interfaces.amazonpay.model.v1.AuthorizeAttributes;
        'sellerOrderAttributes'?: interfaces.amazonpay.model.v1.SellerOrderAttributes;
        'providerAttributes'?: interfaces.amazonpay.model.v1.ProviderAttributes;
    }
}
export declare namespace interfaces.amazonpay.v1 {
    /**
     * Charge Amazon Pay Result Object. It is sent as part of the reponse to ChargeAmazonPay request.
     * @interface
     */
    interface ChargeAmazonPayResult {
        /**
         * The order reference identifier.
         */
        'amazonOrderReferenceId': string;
        'authorizationDetails': interfaces.amazonpay.model.v1.AuthorizationDetails;
    }
}
export declare namespace interfaces.amazonpay.v1 {
    /**
     * Setup Amazon Pay Request Object
     * @interface
     */
    interface SetupAmazonPay {
        /**
         * Authorization token that contains the permissions consented to by the user.
         */
        'consentToken'?: string;
        /**
         * The seller ID (also known as merchant ID). If you are an Ecommerce Provider (Solution Provider), please specify the ID of the merchant, not your provider ID.
         */
        'sellerId': string;
        /**
         * The country in which the merchant has registered, as an Amazon Payments legal entity.
         */
        'countryOfEstablishment': string;
        /**
         * The currency of the merchant’s ledger account.
         */
        'ledgerCurrency': string;
        /**
         * The merchant's preferred language for checkout.
         */
        'checkoutLanguage'?: string;
        'billingAgreementAttributes'?: interfaces.amazonpay.model.v1.BillingAgreementAttributes;
        /**
         * To receive the default user shipping address in the response, set this parameter to true. Not required if a user shipping address is not required.
         */
        'needAmazonShippingAddress'?: boolean;
        /**
         * To test in Sandbox mode, set this parameter to true.
         */
        'sandboxMode'?: boolean;
        /**
         * Use this parameter to create a Sandbox payment object. In order to use this parameter, you first create a Sandbox user account in Seller Central. Then, pass the email address associated with that Sandbox user account.
         */
        'sandboxCustomerEmailId'?: string;
    }
}
export declare namespace interfaces.amazonpay.v1 {
    /**
     * Setup Amazon Pay Result Object. It is sent as part of the reponse to SetupAmazonPay request.
     * @interface
     */
    interface SetupAmazonPayResult {
        'billingAgreementDetails': interfaces.amazonpay.model.v1.BillingAgreementDetails;
    }
}
export declare namespace interfaces.applink {
    /**
     *
     * @interface
     */
    interface AppLinkInterface {
        'version'?: string;
    }
}
export declare namespace interfaces.applink {
    /**
     *
     * @interface
     */
    interface AppLinkState {
        'supportedCatalogTypes'?: Array<interfaces.applink.CatalogTypes>;
        'directLaunch'?: interfaces.applink.DirectLaunch;
        'sendToDevice'?: interfaces.applink.SendToDevice;
    }
}
export declare namespace interfaces.applink {
    /**
     * Accepted catalog types.
     * @enum
     */
    type CatalogTypes = 'IOS_APP_STORE' | 'GOOGLE_PLAY_STORE';
}
export declare namespace interfaces.applink {
    /**
     * direct launch availability
     * @interface
     */
    interface DirectLaunch {
        'IOS_APP_STORE'?: any;
        'GOOGLE_PLAY_STORE'?: any;
    }
}
export declare namespace interfaces.applink {
    /**
     * send to device availability
     * @interface
     */
    interface SendToDevice {
    }
}
export declare namespace interfaces.audioplayer {
    /**
     *
     * @interface
     */
    interface AudioItem {
        'stream'?: interfaces.audioplayer.Stream;
        'metadata'?: interfaces.audioplayer.AudioItemMetadata;
    }
}
export declare namespace interfaces.audioplayer {
    /**
     * Encapsulates the metadata about an AudioItem.
     * @interface
     */
    interface AudioItemMetadata {
        /**
         * An optional title of the audio item.
         */
        'title'?: string;
        /**
         * An optional subtitle of the audio item.
         */
        'subtitle'?: string;
        /**
         * An optional cover art image for the audio item.
         */
        'art'?: interfaces.display.Image;
        /**
         * An optional background image for the audio item.
         */
        'backgroundImage'?: interfaces.display.Image;
    }
}
export declare namespace interfaces.audioplayer {
    /**
     *
     * @interface
     */
    interface AudioPlayerInterface {
    }
}
export declare namespace interfaces.audioplayer {
    /**
     *
     * @interface
     */
    interface AudioPlayerState {
        'offsetInMilliseconds'?: number;
        'token'?: string;
        'playerActivity'?: interfaces.audioplayer.PlayerActivity;
    }
}
export declare namespace interfaces.audioplayer {
    /**
     *
     * @interface
     */
    interface CaptionData {
        /**
         * This contains the caption text.
         */
        'content'?: string;
        /**
         * Type of the caption source.
         */
        'type'?: interfaces.audioplayer.CaptionType;
    }
}
export declare namespace interfaces.audioplayer {
    /**
     *
     * @enum
     */
    type CaptionType = 'WEBVTT';
}
export declare namespace interfaces.audioplayer {
    /**
     *
     * @enum
     */
    type ClearBehavior = 'CLEAR_ALL' | 'CLEAR_ENQUEUED';
}
export declare namespace interfaces.audioplayer {
    /**
     *
     * @interface
     */
    interface CurrentPlaybackState {
        'offsetInMilliseconds'?: number;
        'playerActivity'?: interfaces.audioplayer.PlayerActivity;
        'token'?: string;
    }
}
export declare namespace interfaces.audioplayer {
    /**
     *
     * @interface
     */
    interface Error {
        'message'?: string;
        'type'?: interfaces.audioplayer.ErrorType;
    }
}
export declare namespace interfaces.audioplayer {
    /**
     *
     * @enum
     */
    type ErrorType = 'MEDIA_ERROR_INTERNAL_DEVICE_ERROR' | 'MEDIA_ERROR_INTERNAL_SERVER_ERROR' | 'MEDIA_ERROR_INVALID_REQUEST' | 'MEDIA_ERROR_SERVICE_UNAVAILABLE' | 'MEDIA_ERROR_UNKNOWN';
}
export declare namespace interfaces.audioplayer {
    /**
     *
     * @enum
     */
    type PlayBehavior = 'ENQUEUE' | 'REPLACE_ALL' | 'REPLACE_ENQUEUED';
}
export declare namespace interfaces.audioplayer {
    /**
     *
     * @enum
     */
    type PlayerActivity = 'PLAYING' | 'PAUSED' | 'FINISHED' | 'BUFFER_UNDERRUN' | 'IDLE' | 'STOPPED';
}
export declare namespace interfaces.audioplayer {
    /**
     *
     * @interface
     */
    interface Stream {
        'expectedPreviousToken'?: string;
        'token': string;
        'url': string;
        'offsetInMilliseconds': number;
        'captionData'?: interfaces.audioplayer.CaptionData;
    }
}
export declare namespace interfaces.automotive {
    /**
     * This object contains the automotive specific information of the device
     * @interface
     */
    interface AutomotiveState {
    }
}
export declare namespace interfaces.connections {
    /**
     * Connection Status indicates a high level understanding of the result of ConnectionsRequest.
     * @interface
     */
    interface ConnectionsStatus {
        /**
         * This is a code signifying the status of the request sent by the skill. Protocol adheres to HTTP status codes.
         */
        'code': string;
        /**
         * This is a message that goes along with response code that can provide more information about what occurred
         */
        'message'?: string;
    }
}
export declare namespace interfaces.connections {
    /**
     * This defines the callback mechanism when the task is completed, i.e., whether the requester wants to be resumed after the task is fulfilled or just be notified about errors without being resumed.
     * @enum
     */
    type OnCompletion = 'RESUME_SESSION' | 'SEND_ERRORS_ONLY';
}
export declare namespace interfaces.connections.entities {
    /**
     *
     * @interface
     */
    type BaseEntity = interfaces.connections.entities.PostalAddress | interfaces.connections.entities.Restaurant;
}
export declare namespace interfaces.connections.requests {
    /**
     *
     * @interface
     */
    type BaseRequest = interfaces.connections.requests.ScheduleFoodEstablishmentReservationRequest | interfaces.connections.requests.PrintImageRequest | interfaces.connections.requests.PrintWebPageRequest | interfaces.connections.requests.PrintPDFRequest | interfaces.connections.requests.ScheduleTaxiReservationRequest;
}
export declare namespace interfaces.conversations {
    /**
     * API request object
     * @interface
     */
    interface APIRequest {
        /**
         * API name
         */
        'name'?: string;
        /**
         * Object containing values for API arguments
         */
        'arguments'?: {
            [key: string]: any;
        };
        'slots'?: {
            [key: string]: SlotValue;
        };
    }
}
export declare namespace interfaces.customInterfaceController {
    /**
     * The endpoint of a gadget.
     * @interface
     */
    interface Endpoint {
        /**
         * The endpoint ID of the gadget.
         */
        'endpointId': string;
    }
}
export declare namespace interfaces.customInterfaceController {
    /**
     * An Event object defining a single event sent by an endpoint
     * @interface
     */
    interface Event {
        /**
         * The object that contains the header of the event.
         */
        'header': interfaces.customInterfaceController.Header;
        /**
         * The free form JSON object.
         */
        'payload': any;
        /**
         * Identifies where the event orginated from.
         */
        'endpoint'?: interfaces.customInterfaceController.Endpoint;
    }
}
export declare namespace interfaces.customInterfaceController {
    /**
     * Defines the Jsonlogic event filter expression and its corresponding match action.  This filter is applied to all events during the event handler's duration.  Events that are rejected by the filter expression are not sent to the skill.
     * @interface
     */
    interface EventFilter {
        /**
         * The JSON object that represents the Jsonlogic expression against which the events are evaluated. If this expression is satisfied, the corresponding match action is performed.
         */
        'filterExpression': any;
        'filterMatchAction': interfaces.customInterfaceController.FilterMatchAction;
    }
}
export declare namespace interfaces.customInterfaceController {
    /**
     * This object defines the duration of the Event Handler and the optional JSON payload that is delivered to the skill when the timer expires.
     * @interface
     */
    interface Expiration {
        /**
         * The length of time, in milliseconds, for which events from connected gadgets will be  passed to the skill. Your skill will continue to receive events until this duration  expires or the event handler is otherwise stopped.
         */
        'durationInMilliseconds': number;
        /**
         * The payload that was defined in the StartEventHandlerDirective. The skill will receive if and only if the Event Handler duration expired.
         */
        'expirationPayload'?: any;
    }
}
export declare namespace interfaces.customInterfaceController {
    /**
     * The behavior to be performed by the platform on a successful filter expression match.
     * @enum
     */
    type FilterMatchAction = 'SEND_AND_TERMINATE' | 'SEND';
}
export declare namespace interfaces.customInterfaceController {
    /**
     * Endpoint Event header
     * @interface
     */
    interface Header {
        /**
         * The developer-defined namespace for the custom interface.
         */
        'namespace': string;
        /**
         * The developer-defined name of the custom interface.
         */
        'name': string;
    }
}
export declare namespace interfaces.display {
    /**
     *
     * @enum
     */
    type BackButtonBehavior = 'HIDDEN' | 'VISIBLE';
}
export declare namespace interfaces.display {
    /**
     *
     * @interface
     */
    interface DisplayInterface {
        'templateVersion'?: string;
        'markupVersion'?: string;
    }
}
export declare namespace interfaces.display {
    /**
     *
     * @interface
     */
    interface DisplayState {
        'token'?: string;
    }
}
export declare namespace interfaces.display {
    /**
     *
     * @interface
     */
    type Hint = interfaces.display.PlainTextHint;
}
export declare namespace interfaces.display {
    /**
     *
     * @interface
     */
    interface Image {
        'contentDescription'?: string;
        'sources'?: Array<interfaces.display.ImageInstance>;
    }
}
export declare namespace interfaces.display {
    /**
     *
     * @interface
     */
    interface ImageInstance {
        'url': string;
        'size'?: interfaces.display.ImageSize;
        'widthPixels'?: number;
        'heightPixels'?: number;
    }
}
export declare namespace interfaces.display {
    /**
     *
     * @enum
     */
    type ImageSize = 'X_SMALL' | 'SMALL' | 'MEDIUM' | 'LARGE' | 'X_LARGE';
}
export declare namespace interfaces.display {
    /**
     *
     * @interface
     */
    interface ListItem {
        'token': string;
        'image'?: interfaces.display.Image;
        'textContent'?: interfaces.display.TextContent;
    }
}
export declare namespace interfaces.display {
    /**
     *
     * @interface
     */
    type Template = interfaces.display.ListTemplate2 | interfaces.display.ListTemplate1 | interfaces.display.BodyTemplate7 | interfaces.display.BodyTemplate6 | interfaces.display.BodyTemplate3 | interfaces.display.BodyTemplate2 | interfaces.display.BodyTemplate1;
}
export declare namespace interfaces.display {
    /**
     *
     * @interface
     */
    interface TextContent {
        'primaryText'?: interfaces.display.TextField;
        'secondaryText'?: interfaces.display.TextField;
        'tertiaryText'?: interfaces.display.TextField;
    }
}
export declare namespace interfaces.display {
    /**
     *
     * @interface
     */
    type TextField = interfaces.display.RichText | interfaces.display.PlainText;
}
export declare namespace interfaces.geolocation {
    /**
     * A string representing if Alexa has access to location services running on the hostOS of device.
     * @enum
     */
    type Access = 'ENABLED' | 'DISABLED' | 'UNKNOWN';
}
export declare namespace interfaces.geolocation {
    /**
     * An object containing the altitude information of the device.
     * @interface
     */
    interface Altitude {
        /**
         * A double representing the altitude of the device in meters.
         */
        'altitudeInMeters': number;
        /**
         * A double representing the accuracy of the altitude measurement in meters.
         */
        'accuracyInMeters': number;
    }
}
export declare namespace interfaces.geolocation {
    /**
     * An object containing the location information of the device.
     * @interface
     */
    interface Coordinate {
        /**
         * A double representing the latitude in degrees of the device.
         */
        'latitudeInDegrees': number;
        /**
         * A double representing the longitude in degrees of the device.
         */
        'longitudeInDegrees': number;
        /**
         * A double representing the accuracy of geolocation data in meters.
         */
        'accuracyInMeters': number;
    }
}
export declare namespace interfaces.geolocation {
    /**
     * The common object to define the basic geolocation states
     * @interface
     */
    interface GeolocationCommonState {
        /**
         * Specifies the time when the geolocation data was last collected on the device.
         */
        'timestamp'?: string;
        'coordinate'?: interfaces.geolocation.Coordinate;
        'altitude'?: interfaces.geolocation.Altitude;
        'heading'?: interfaces.geolocation.Heading;
        'speed'?: interfaces.geolocation.Speed;
    }
}
export declare namespace interfaces.geolocation {
    /**
     *
     * @interface
     */
    interface GeolocationInterface {
    }
}
export declare namespace interfaces.geolocation {
    /**
     * An object containing the heading direction information of the device.
     * @interface
     */
    interface Heading {
        /**
         * A double representing the direction of the device in degrees.
         */
        'directionInDegrees': number;
        /**
         * A double representing the accuracy of the heading measurement in degrees.
         */
        'accuracyInDegrees'?: number;
    }
}
export declare namespace interfaces.geolocation {
    /**
     * An object containing status and access.
     * @interface
     */
    interface LocationServices {
        /**
         * A string representing the status of whether location services is currently running or not on the host OS of device.
         */
        'status': interfaces.geolocation.Status;
        /**
         * A string representing if Alexa has access to location services running on the hostOS of device.
         */
        'access': interfaces.geolocation.Access;
    }
}
export declare namespace interfaces.geolocation {
    /**
     * An object containing the speed information of the device.
     * @interface
     */
    interface Speed {
        /**
         * A double representing the speed of the device in meters.
         */
        'speedInMetersPerSecond': number;
        /**
         * A double representing the accuracy of the speed measurement in meters.
         */
        'accuracyInMetersPerSecond'?: number;
    }
}
export declare namespace interfaces.geolocation {
    /**
     * A string representing the status of whether location services is currently running or not on the host OS of device.
     * @enum
     */
    type Status = 'RUNNING' | 'STOPPED';
}
export declare namespace interfaces.monetization.v1 {
    /**
     * Entity to define In Skill Product over which actions will be performed.
     * @interface
     */
    interface InSkillProduct {
        /**
         * The product ID of In Skill Product.
         */
        'productId': string;
    }
}
export declare namespace interfaces.monetization.v1 {
    /**
     * Response from purchase directives:   * ACCEPTED - User have accepted the offer to purchase the product   * DECLINED - User have declined the offer to purchase the product   * NOT_ENTITLED - User tries to cancel/return a product he/she is  not entitled to.   * ALREADY_PURCHASED - User has already purchased the product   * ERROR - An internal error occurred
     * @enum
     */
    type PurchaseResult = 'ACCEPTED' | 'DECLINED' | 'NOT_ENTITLED' | 'ERROR' | 'ALREADY_PURCHASED';
}
export declare namespace interfaces.navigation {
    /**
     *
     * @interface
     */
    interface NavigationInterface {
    }
}
export declare namespace interfaces.system {
    /**
     *
     * @interface
     */
    interface Error {
        'type': interfaces.system.ErrorType;
        'message'?: string;
    }
}
export declare namespace interfaces.system {
    /**
     *
     * @interface
     */
    interface ErrorCause {
        'requestId': string;
    }
}
export declare namespace interfaces.system {
    /**
     *
     * @enum
     */
    type ErrorType = 'INVALID_RESPONSE' | 'DEVICE_COMMUNICATION_ERROR' | 'INTERNAL_SERVICE_ERROR';
}
export declare namespace interfaces.system {
    /**
     *
     * @interface
     */
    interface SystemState {
        'application': Application;
        'user': User;
        'device'?: Device;
        'person'?: Person;
        'unit'?: interfaces.systemUnit.Unit;
        /**
         * A string that references the correct base URI to refer to by region, for use with APIs such as the Device Location API and Progressive Response API.
         */
        'apiEndpoint': string;
        /**
         * A bearer token string that can be used by the skill (during the skill session) to access Alexa APIs resources of the registered Alexa customer and/or person who is making the request. This token encapsulates the permissions authorized under the registered Alexa account and device, and (optionally) the recognized person. Some resources, such as name or email, require explicit customer consent.\"
         */
        'apiAccessToken'?: string;
    }
}
export declare namespace interfaces.systemUnit {
    /**
     * An object that represents a logical entity for organizing actors and resources that interact with Alexa systems.
     * @interface
     */
    interface Unit {
        /**
         * A string that represents a unique identifier for the unit in the context of a request.  The length of this identifier can vary, but is never more than 255 characters.  Alexa generates this string only when a request made to your skill has a valid unit context.  This identifier is scoped to a skill. Normally, disabling and re-enabling a skill generates a new identifier.
         */
        'unitId'?: string;
        /**
         * A string that represents a unique identifier for the unit in the context of a request.  The length of this identifier can vary, but is never more than 255 characters.  Alexa generates this string only when the request made to your skill has a valid unit context.  This is another unit identifier associated with an organization's developer account.  Only registered Alexa for Residential and Alexa for Hospitality vendors can see the Read PersistentUnitId toggle in the Alexa skills developers console. This identifier is scoped to a vendor, therefore all skills that belong to particular vendor share this identifier, therefore it will stay the same regardless of skill enablement.
         */
        'persistentUnitId'?: string;
    }
}
export declare namespace interfaces.videoapp {
    /**
     *
     * @interface
     */
    interface Metadata {
        'title'?: string;
        'subtitle'?: string;
    }
}
export declare namespace interfaces.videoapp {
    /**
     *
     * @interface
     */
    interface VideoAppInterface {
    }
}
export declare namespace interfaces.videoapp {
    /**
     *
     * @interface
     */
    interface VideoItem {
        'source': string;
        'metadata'?: interfaces.videoapp.Metadata;
    }
}
export declare namespace interfaces.viewport {
    /**
     * Indicates that dialog playback is supported or desired in the given interaction mode. Player interface abilities controlled by this field are any directives that would render audio on the dialog channel.
     * @enum
     */
    type Dialog = 'SUPPORTED' | 'UNSUPPORTED';
}
export declare namespace interfaces.viewport {
    /**
     * An experience represents a viewing mode used to interact with the device.
     * @interface
     */
    interface Experience {
        /**
         * The number of horizontal arc minutes the viewport occupies in the user's visual field when viewed within this experience.
         */
        'arcMinuteWidth'?: number;
        /**
         * The number of vertical arc minutes the viewport occupies in the user's visual field when viewed within this experience.
         */
        'arcMinuteHeight'?: number;
        /**
         * Indicates if the viewport can be rotated through 90 degrees.
         */
        'canRotate'?: boolean;
        /**
         * Indicates if the viewport can be resized, limiting the area which can be used to render the APL response.
         */
        'canResize'?: boolean;
    }
}
export declare namespace interfaces.viewport {
    /**
     * Represents a physical button input mechanism which can be used to interact with elements shown on the viewport.
     * @enum
     */
    type Keyboard = 'DIRECTION';
}
export declare namespace interfaces.viewport {
    /**
     * The expected use case of the device's viewport, encapsulating the available input mechanisms and user viewing distance.
     * @enum
     */
    type Mode = 'AUTO' | 'HUB' | 'MOBILE' | 'PC' | 'TV';
}
export declare namespace interfaces.viewport {
    /**
     * Type of the viewport.   * `STANDARD` Indicates that this viewport occupies an exclusive area of the screen.   * `OVERLAY` Indicates that the viewport is an overlay, sharing the screen with other experiences.
     * @enum
     */
    type PresentationType = 'STANDARD' | 'OVERLAY';
}
export declare namespace interfaces.viewport {
    /**
     * The shape of the viewport.
     * @enum
     */
    type Shape = 'RECTANGLE' | 'ROUND';
}
export declare namespace interfaces.viewport {
    /**
     * Represents a type of touch input suppported by the device.
     * @enum
     */
    type Touch = 'SINGLE';
}
export declare namespace interfaces.viewport {
    /**
     *
     * @interface
     */
    type TypedViewportState = interfaces.viewport.APLViewportState | interfaces.viewport.APLTViewportState;
}
export declare namespace interfaces.viewport {
    /**
     * This object contains the characteristics related to the device's viewport.
     * @interface
     */
    interface ViewportState {
        /**
         * The experiences supported by the device, in descending order of arcMinuteWidth and arcMinuteHeight.
         */
        'experiences'?: Array<interfaces.viewport.Experience>;
        'mode'?: interfaces.viewport.Mode;
        'shape'?: interfaces.viewport.Shape;
        /**
         * The number of pixels present in the viewport at its maximum width.
         */
        'pixelWidth'?: number;
        /**
         * The number of pixels present in the viewport at its maximum height.
         */
        'pixelHeight'?: number;
        /**
         * The pixel density of the viewport.
         */
        'dpi'?: number;
        /**
         * The number of horizontal pixels in the viewport that are currently available for Alexa to render an experience.
         */
        'currentPixelWidth'?: number;
        /**
         * The number of vertical pixels in the viewport that are currently available for Alexa to render an experience.
         */
        'currentPixelHeight'?: number;
        /**
         * The types of touch supported by the device. An empty array indicates no touch support.
         */
        'touch'?: Array<interfaces.viewport.Touch>;
        /**
         * The physical button input mechanisms supported by the device. An empty array indicates physical button input is unsupported.
         */
        'keyboard'?: Array<interfaces.viewport.Keyboard>;
        'video'?: interfaces.viewport.ViewportStateVideo;
    }
}
export declare namespace interfaces.viewport {
    /**
     * Details of the technologies which are available for playing video on the device.
     * @interface
     */
    interface ViewportStateVideo {
        /**
         * Codecs which are available for playing video on the device.
         */
        'codecs'?: Array<interfaces.viewport.video.Codecs>;
    }
}
export declare namespace interfaces.viewport {
    /**
     * Details of the technologies which are available for playing video on the device.
     * @interface
     */
    interface ViewportVideo {
        /**
         * Codecs which are available for playing video on the device.
         */
        'codecs'?: Array<interfaces.viewport.video.Codecs>;
    }
}
export declare namespace interfaces.viewport.apl {
    /**
     * The viewport configuration at the time of the request.
     * @interface
     */
    interface CurrentConfiguration {
        'mode': interfaces.viewport.Mode;
        'video'?: interfaces.viewport.ViewportVideo;
        'size': interfaces.viewport.size.ViewportSize;
        'dialog'?: interfaces.viewport.Dialog;
    }
}
export declare namespace interfaces.viewport.apl {
    /**
     *
     * @interface
     */
    interface ViewportConfiguration {
        'current': interfaces.viewport.apl.CurrentConfiguration;
    }
}
export declare namespace interfaces.viewport.aplt {
    /**
     * Supported character set on a text display   * `SEVEN_SEGMENT` - 7-segment display
     * @enum
     */
    type CharacterFormat = 'SEVEN_SEGMENT';
}
export declare namespace interfaces.viewport.aplt {
    /**
     *
     * @interface
     */
    interface InterSegment {
        /**
         * horizontal position (0-based index) in characters
         */
        'x': number;
        /**
         * vertical position (0-based index) in rows
         */
        'y': number;
        /**
         * list of characters that can be rendered
         */
        'characters': string;
    }
}
export declare namespace interfaces.viewport.aplt {
    /**
     * name of viewport's profile
     * @enum
     */
    type ViewportProfile = 'FOUR_CHARACTER_CLOCK';
}
export declare namespace interfaces.viewport.size {
    /**
     * Information regarding the range of sizes for a configuration.
     * @interface
     */
    type ViewportSize = interfaces.viewport.size.ContinuousViewportSize | interfaces.viewport.size.DiscreteViewportSize;
}
export declare namespace interfaces.viewport.video {
    /**
     * A named bundle of codecs which are available for playing video on the viewport.
     * @enum
     */
    type Codecs = 'H_264_41' | 'H_264_42';
}
export declare namespace services.datastore.v1 {
    /**
     *
     * @interface
     */
    interface CancelCommandsRequestError {
        'type': services.datastore.v1.CancelCommandsRequestErrorType;
        /**
         * Descriptive error message.
         */
        'message'?: string;
    }
}
export declare namespace services.datastore.v1 {
    /**
     * Error code of the response. * `COMMANDS_DELIVERED` - The pending commands have been delivered. * `CONCURRENCY_ERROR` - There are concurrent attempts to deliver the pending commands. * `NOT_FOUND` - Unable to find pending request for the given queuedResultId. * `INVALID_ACCESS_TOKEN` - Access token is expire or invalid. * `DATASTORE_SUPPORT_REQUIRED` - Client has not opted into DataStore interface in skill manifest. * `TOO_MANY_REQUESTS` - The request has been throttled because client has exceed maximum allowed request rate. * `DATASTORE_UNAVAILABLE` - Internal service error.
     * @enum
     */
    type CancelCommandsRequestErrorType = 'COMMANDS_DELIVERED' | 'CONCURRENCY_ERROR' | 'NOT_FOUND' | 'INVALID_ACCESS_TOKEN' | 'DATASTORE_SUPPORT_REQUIRED' | 'TOO_MANY_REQUESTS' | 'DATASTORE_UNAVAILABLE';
}
export declare namespace services.datastore.v1 {
    /**
     * DataStore command which will run in DataStore.
     * @interface
     */
    type Command = services.datastore.v1.RemoveNamespaceCommand | services.datastore.v1.RemoveObjectCommand | services.datastore.v1.PutObjectCommand | services.datastore.v1.ClearCommand | services.datastore.v1.PutNamespaceCommand;
}
export declare namespace services.datastore.v1 {
    /**
     *
     * @interface
     */
    interface CommandsDispatchResult {
        /**
         * identifier of a device.
         */
        'deviceId': string;
        'type': services.datastore.v1.DispatchResultType;
        /**
         * Opaque description of the error.
         */
        'message'?: string;
    }
}
export declare namespace services.datastore.v1 {
    /**
     *
     * @interface
     */
    interface CommandsRequest {
        /**
         * Collection of ordered commands which needs to be executed in DataStore.
         */
        'commands': Array<services.datastore.v1.Command>;
        /**
         * Target where update needs to be published.
         */
        'target': services.datastore.v1.Target;
        /**
         * Date and time, in ISO-8601 representation, when to halt the attempt to deliver the commands.
         */
        'attemptDeliveryUntil'?: string;
    }
}
export declare namespace services.datastore.v1 {
    /**
     *
     * @interface
     */
    interface CommandsRequestError {
        'type': services.datastore.v1.CommandsRequestErrorType;
        /**
         * Descriptive error message.
         */
        'message'?: string;
    }
}
export declare namespace services.datastore.v1 {
    /**
     * Error code of the response. * `COMMANDS_PAYLOAD_EXCEEDS_LIMIT` - The total size of commands cannot exceed maximum size in UTF-encoding. * `TOO_MANY_TARGETS` - Number of target exceeds limits. * `NO_TARGET_DEFINED` - There is no target defined. * `INVALID_REQUEST` - request payload does not compliant with JSON schema. * `INVALID_ACCESS_TOKEN` - Access token is expire or invalid. * `DATASTORE_SUPPORT_REQUIRED` - Client has not opted into DataStore interface in skill manifest. * `TOO_MANY_REQUESTS` - The request has been throttled because client has exceed maximum allowed request rate. * `DATASTORE_UNAVAILABLE` - Internal service error.
     * @enum
     */
    type CommandsRequestErrorType = 'COMMANDS_PAYLOAD_EXCEEDS_LIMIT' | 'TOO_MANY_TARGETS' | 'NO_TARGET_DEFINED' | 'INVALID_REQUEST' | 'INVALID_ACCESS_TOKEN' | 'DATASTORE_SUPPORT_REQUIRED' | 'TOO_MANY_REQUESTS' | 'DATASTORE_UNAVAILABLE';
}
export declare namespace services.datastore.v1 {
    /**
     *
     * @interface
     */
    interface CommandsResponse {
        /**
         * List of results for each dispatch to a device target. This indicates the results of 1st attempt of deliveries.
         */
        'results': Array<services.datastore.v1.CommandsDispatchResult>;
        /**
         * A unique identifier to query result for queued delivery for offline devices (DEVICE_UNAVAILABLE). If there is no offline device, this value is not specified. The result will be available for query at least one hour after attemptDeliveryUntil.
         */
        'queuedResultId'?: string;
    }
}
export declare namespace services.datastore.v1 {
    /**
     * Defines success or a type of error from dispatch. * `SUCCESS` - device has received the payload. * `INVALID_DEVICE` - device is not capable of processing the payload. * `DEVICE_UNAVAILABLE` - dispatch failed because device is offline. * `DEVICE_PERMANENTLY_UNAVAILABLE` - target no longer available to receive data. This is reported for a failed delivery attempt related to an unregistered device. * `CONCURRENCY_ERROR` - there are concurrent attempts to update to the same device. * `INTERNAL_ERROR`- dispatch failed because of unknown error - see message. * `PENDING_REQUEST_COUNT_EXCEEDS_LIMIT` - the count of pending requests exceeds the limit.
     * @enum
     */
    type DispatchResultType = 'SUCCESS' | 'INVALID_DEVICE' | 'DEVICE_UNAVAILABLE' | 'DEVICE_PERMANENTLY_UNAVAILABLE' | 'CONCURRENCY_ERROR' | 'INTERNAL_ERROR' | 'PENDING_REQUEST_COUNT_EXCEEDS_LIMIT';
}
export declare namespace services.datastore.v1 {
    /**
     *
     * @interface
     */
    interface QueuedResultRequestError {
        'type': services.datastore.v1.QueuedResultRequestErrorType;
        /**
         * Descriptive error message.
         */
        'message'?: string;
    }
}
export declare namespace services.datastore.v1 {
    /**
     * Error code of the response. * `NOT_FOUND` - queuedResultId is not found for the skill. * `INVALID_REQUEST` - One or more request parameters are invalid, see message for more details. * `INVALID_ACCESS_TOKEN` - Access token is expire or invalid. * `DATASTORE_SUPPORT_REQUIRED` - Client has not opted into DataStore interface in skill manifest. * `TOO_MANY_REQUESTS` - The request has been throttled because client has exceed maximum allowed request rate. * `DATASTORE_UNAVAILABLE` - Internal service error.
     * @enum
     */
    type QueuedResultRequestErrorType = 'NOT_FOUND' | 'INVALID_REQUEST' | 'INVALID_ACCESS_TOKEN' | 'DATASTORE_SUPPORT_REQUIRED' | 'TOO_MANY_REQUESTS' | 'DATASTORE_UNAVAILABLE';
}
export declare namespace services.datastore.v1 {
    /**
     * Response for queued deliveries query.
     * @interface
     */
    interface QueuedResultResponse {
        /**
         * The array only contains results which have not been a SUCCESS delivery. An empty response means that all targeted devices has been received the commands payload.
         */
        'items': Array<services.datastore.v1.CommandsDispatchResult>;
        'paginationContext'?: services.datastore.v1.ResponsePaginationContext;
    }
}
export declare namespace services.datastore.v1 {
    /**
     *
     * @interface
     */
    interface ResponsePaginationContext {
        /**
         * The total number of results at the time of current response.
         */
        'totalCount': number;
        /**
         * The token of previous page - Not specified for the response of first page.
         */
        'previousToken'?: string;
        /**
         * The token of next page - Not specified for the response of last page.
         */
        'nextToken'?: string;
    }
}
export declare namespace services.datastore.v1 {
    /**
     *
     * @interface
     */
    type Target = services.datastore.v1.User | services.datastore.v1.Devices;
}
export declare namespace services.deviceAddress {
    /**
     * Represents the full address response from the service.
     * @interface
     */
    interface Address {
        'addressLine1'?: string;
        'addressLine2'?: string;
        'addressLine3'?: string;
        'countryCode'?: string;
        'stateOrRegion'?: string;
        'city'?: string;
        'districtOrCounty'?: string;
        'postalCode'?: string;
    }
}
export declare namespace services.deviceAddress {
    /**
     *
     * @interface
     */
    interface Error {
        /**
         * The corresponding type of the http status code being returned.
         */
        'type'?: string;
        /**
         * A human readable description of error.
         */
        'message'?: string;
    }
}
export declare namespace services.deviceAddress {
    /**
     *
     * @interface
     */
    interface ShortAddress {
        'countryCode'?: string;
        'postalCode'?: string;
    }
}
export declare namespace services.directive {
    /**
     *
     * @interface
     */
    type Directive = services.directive.SpeakDirective;
}
export declare namespace services.directive {
    /**
     *
     * @interface
     */
    interface Error {
        /**
         * error code to find more information in developer.amazon.com.
         */
        'code': number;
        /**
         * Readable description of error.
         */
        'message': string;
    }
}
export declare namespace services.directive {
    /**
     *
     * @interface
     */
    interface Header {
        /**
         * This represents the current requestId for what the skill/speechlet was invoked.
         */
        'requestId': string;
    }
}
export declare namespace services.directive {
    /**
     * Send Directive Request payload.
     * @interface
     */
    interface SendDirectiveRequest {
        /**
         * contains the header attributes of the send directive request.
         */
        'header': services.directive.Header;
        /**
         * Directive Content.
         */
        'directive': services.directive.Directive;
    }
}
export declare namespace services.endpointEnumeration {
    /**
     *
     * @interface
     */
    interface EndpointCapability {
        /**
         * The name of the capability interface.
         */
        'interface'?: string;
        /**
         * The type of capability interface. This is usually AlexaInterface.
         */
        'type'?: string;
        /**
         * The version of the capability interface that the endpoint supports.
         */
        'version'?: string;
    }
}
export declare namespace services.endpointEnumeration {
    /**
     * Contains the list of endpoints.
     * @interface
     */
    interface EndpointEnumerationResponse {
        /**
         * The list of endpoints.
         */
        'endpoints'?: Array<services.endpointEnumeration.EndpointInfo>;
    }
}
export declare namespace services.endpointEnumeration {
    /**
     * Contains the list of connected endpoints and their declared capabilities.
     * @interface
     */
    interface EndpointInfo {
        /**
         * A unique identifier for the endpoint.
         */
        'endpointId'?: string;
        /**
         * The name of the endpoint. Because this name might be changed by the user or the platform, it might be different than the Bluetooth friendly name.
         */
        'friendlyName'?: string;
        /**
         * The list of endpoint capabilities.
         */
        'capabilities'?: Array<services.endpointEnumeration.EndpointCapability>;
    }
}
export declare namespace services.endpointEnumeration {
    /**
     *
     * @interface
     */
    interface Error {
        /**
         * Domain specific error code.
         */
        'code'?: string;
        /**
         * Detailed error message.
         */
        'message'?: string;
    }
}
export declare namespace services.gadgetController {
    /**
     * The action that triggers the animation. Possible values are as follows   * `buttonDown` - Play the animation when the button is pressed.   * `buttonUp` - Play the animation when the button is released.   * `none` - Play the animation as soon as it arrives.
     * @enum
     */
    type TriggerEventType = 'buttonDown' | 'buttonUp' | 'none';
}
export declare namespace services.gadgetController {
    /**
     *
     * @interface
     */
    interface AnimationStep {
        /**
         * The duration in milliseconds to render this step.
         */
        'durationMs': number;
        /**
         * The color to render specified in RGB hexadecimal values. There are a number of Node.js libraries available for working with color.
         */
        'color': string;
        /**
         * A boolean that indicates whether to interpolate from the previous color into this one over the course of this directive's durationMs.
         */
        'blend': boolean;
    }
}
export declare namespace services.gadgetController {
    /**
     *
     * @interface
     */
    interface LightAnimation {
        /**
         * The number of times to play this animation.
         */
        'repeat'?: number;
        /**
         * An array of strings that represent the light addresses on the target gadgets that this animation will be applied to. Because the Echo Button has one light only, use [\"1\"] to signify that this animation should be sent to light one.
         */
        'targetLights'?: Array<string>;
        /**
         * The animation steps to render in order. The maximum number of steps that you can define is 38. The minimum is 0. Each step must have the following fields, all of which are required.
         */
        'sequence'?: Array<services.gadgetController.AnimationStep>;
    }
}
export declare namespace services.gadgetController {
    /**
     * Arguments that pertain to animating the buttons.
     * @interface
     */
    interface SetLightParameters {
        'triggerEvent'?: services.gadgetController.TriggerEventType;
        'triggerEventTimeMs'?: number;
        'animations'?: Array<services.gadgetController.LightAnimation>;
    }
}
export declare namespace services.gameEngine {
    /**
     * Specifies what raw button presses to put in the inputEvents field of the event.  * history - All button presses since this Input Handler was started. * matches - Just the button presses that contributed to this event (that is, were in the recognizers). To receive no raw button presses, leave this array empty or do not specify it at all.
     * @enum
     */
    type EventReportingType = 'history' | 'matches';
}
export declare namespace services.gameEngine {
    /**
     *
     * @interface
     */
    interface InputEvent {
        /**
         * The identifier of the Echo Button in question. It matches the gadgetId that you will have discovered in roll call.
         */
        'gadgetId'?: string;
        /**
         * The event's original moment of occurrence, in ISO format.
         */
        'timestamp'?: string;
        'action'?: services.gameEngine.InputEventActionType;
        /**
         * The hexadecimal RGB values of the button LED at the time of the event.
         */
        'color'?: string;
        /**
         * For gadgets with multiple features, this is the feature that the event represents. Echo Buttons have one feature only, so this is always `press`.
         */
        'feature'?: string;
    }
}
export declare namespace services.gameEngine {
    /**
     * Either \"down\" for a button pressed or \"up\" for a button released.
     * @enum
     */
    type InputEventActionType = 'down' | 'up';
}
export declare namespace services.gameEngine {
    /**
     *
     * @interface
     */
    interface InputHandlerEvent {
        /**
         * The name of the event as you defined it in your GameEngine.StartInputHandler directive.
         */
        'name'?: string;
        /**
         * A chronologically ordered report of the raw Button Events that contributed to this Input Handler Event.
         */
        'inputEvents'?: Array<services.gameEngine.InputEvent>;
    }
}
export declare namespace services.gameEngine {
    /**
     * Where the pattern must appear in the history of this input handler. * `start` -  (Default) The first event in the pattern must be the first event in the history of raw Echo Button events. * `end` - The last event in the pattern must be the last event in the history of raw Echo Button events. * `anywhere` - The pattern may appear anywhere in the history of raw Echo Button events.
     * @enum
     */
    type PatternRecognizerAnchorType = 'start' | 'end' | 'anywhere';
}
export declare namespace services.gameEngine {
    /**
     * The events object is where you define the conditions that must be met for your skill to be notified of Echo Button input. You must define at least one event.
     * @interface
     */
    interface Event {
        /**
         * Whether the Input Handler should end after this event fires. If true, the Input Handler will stop and no further events will be sent to your skill unless you call StartInputHandler again.
         */
        'shouldEndInputHandler': boolean;
        'meets': Array<string>;
        'fails'?: Array<string>;
        'reports'?: services.gameEngine.EventReportingType;
        /**
         * Enables you to limit the number of times that the skill is notified about the same event during the course of the Input Handler. The default value is 1. This property is mutually exclusive with triggerTimeMilliseconds.
         */
        'maximumInvocations'?: number;
        /**
         * Adds a time constraint to the event. Instead of being considered whenever a raw button event occurs, an event that has this parameter will only be considered once at triggerTimeMilliseconds after the Input Handler has started. Because a time-triggered event can only fire once, the maximumInvocations value is ignored. Omit this property entirely if you do not want to time-constrain the event.
         */
        'triggerTimeMilliseconds'?: number;
    }
}
export declare namespace services.gameEngine {
    /**
     * An object that provides all of the events that need to occur, in a specific order, for this recognizer to be true. Omitting any parameters in this object means \"match anything\".
     * @interface
     */
    interface Pattern {
        /**
         * A whitelist of gadgetIds that are eligible for this match.
         */
        'gadgetIds'?: Array<string>;
        /**
         * A whitelist of colors that are eligible for this match.
         */
        'colors'?: Array<string>;
        'action'?: services.gameEngine.InputEventActionType;
        /**
         * The number of times that the specified action must occur to be considered complete.
         */
        'repeat'?: number;
    }
}
export declare namespace services.gameEngine {
    /**
     * Recognizers are conditions that, at any moment, are either true or false, based on all the raw button events that the Input Handler has received in the time elapsed since the Input Handler session started.
     * @interface
     */
    type Recognizer = services.gameEngine.PatternRecognizer | services.gameEngine.DeviationRecognizer | services.gameEngine.ProgressRecognizer;
}
export declare namespace services.listManagement {
    /**
     *
     * @interface
     */
    interface AlexaList {
        'listId'?: string;
        'name'?: string;
        'state'?: services.listManagement.ListState;
        'version'?: number;
        'items'?: Array<services.listManagement.AlexaListItem>;
        'links'?: services.listManagement.Links;
    }
}
export declare namespace services.listManagement {
    /**
     *
     * @interface
     */
    interface AlexaListItem {
        'id'?: string;
        'version'?: number;
        'value'?: string;
        'status'?: services.listManagement.ListItemState;
        'createdTime'?: string;
        'updatedTime'?: string;
        /**
         * URL to retrieve the item from.
         */
        'href'?: string;
    }
}
export declare namespace services.listManagement {
    /**
     *
     * @interface
     */
    interface AlexaListMetadata {
        'listId'?: string;
        'name'?: string;
        'state'?: services.listManagement.ListState;
        'version'?: number;
        'statusMap'?: Array<services.listManagement.Status>;
    }
}
export declare namespace services.listManagement {
    /**
     *
     * @interface
     */
    interface AlexaListsMetadata {
        'lists'?: Array<services.listManagement.AlexaListMetadata>;
    }
}
export declare namespace services.listManagement {
    /**
     *
     * @interface
     */
    interface CreateListItemRequest {
        'value'?: string;
        'status'?: services.listManagement.ListItemState;
    }
}
export declare namespace services.listManagement {
    /**
     *
     * @interface
     */
    interface CreateListRequest {
        'name'?: string;
        'state'?: services.listManagement.ListState;
    }
}
export declare namespace services.listManagement {
    /**
     *
     * @interface
     */
    interface Error {
        'type'?: string;
        'message'?: string;
    }
}
export declare namespace services.listManagement {
    /**
     *
     * @interface
     */
    interface ForbiddenError {
        'Message'?: string;
    }
}
export declare namespace services.listManagement {
    /**
     *
     * @interface
     */
    interface Links {
        'next'?: string;
    }
}
export declare namespace services.listManagement {
    /**
     *
     * @interface
     */
    interface ListBody {
        'listId'?: string;
    }
}
export declare namespace services.listManagement {
    /**
     *
     * @interface
     */
    interface ListItemBody {
        'listId'?: string;
        'listItemIds'?: Array<string>;
    }
}
export declare namespace services.listManagement {
    /**
     *
     * @enum
     */
    type ListItemState = 'active' | 'completed';
}
export declare namespace services.listManagement {
    /**
     *
     * @enum
     */
    type ListState = 'active' | 'archived';
}
export declare namespace services.listManagement {
    /**
     *
     * @interface
     */
    interface Status {
        'url'?: string;
        'status'?: services.listManagement.ListItemState;
    }
}
export declare namespace services.listManagement {
    /**
     *
     * @interface
     */
    interface UpdateListItemRequest {
        /**
         * New item value
         */
        'value'?: string;
        /**
         * Item Status
         */
        'status'?: services.listManagement.ListItemState;
        /**
         * Item version when it was read.
         */
        'version'?: number;
    }
}
export declare namespace services.listManagement {
    /**
     *
     * @interface
     */
    interface UpdateListRequest {
        'name'?: string;
        'state'?: services.listManagement.ListState;
        'version'?: number;
    }
}
export declare namespace services.monetization {
    /**
     * State determining if the user is entitled to the product. Note - Any new values introduced later should be treated as 'NOT_ENTITLED'. * 'ENTITLED' - The user is entitled to the product. * 'NOT_ENTITLED' - The user is not entitled to the product.
     * @enum
     */
    type EntitledState = 'ENTITLED' | 'NOT_ENTITLED';
}
export declare namespace services.monetization {
    /**
     * Reason for the entitlement status. * 'PURCHASED' - The user is entitled to the product because they purchased it directly. * 'NOT_PURCHASED' - The user is not entitled to the product because they have not purchased it. * 'AUTO_ENTITLED' - The user is auto entitled to the product because they have subscribed to a broader service. * 'BUNDLE_ENTITLED' - The user is entitled to the product because they purchased it indirectly as part of a bundle. If the user is entitled via both PURCHASED and BUNDLE_ENTITLED, then BUNDLE_ENTITLED takes priority.
     * @enum
     */
    type EntitlementReason = 'PURCHASED' | 'NOT_PURCHASED' | 'AUTO_ENTITLED' | 'BUNDLE_ENTITLED';
}
export declare namespace services.monetization {
    /**
     * Describes error detail
     * @interface
     */
    interface Error {
        /**
         * Readable description of error
         */
        'message'?: string;
    }
}
export declare namespace services.monetization {
    /**
     *
     * @interface
     */
    interface InSkillProduct {
        /**
         * Product Id
         */
        'productId': string;
        /**
         * Developer selected in-skill product name. This is for developer reference only.
         */
        'referenceName': string;
        /**
         * Name of the product in the language from the \"Accept-Language\" header
         */
        'name': string;
        'type': services.monetization.ProductType;
        /**
         * Product summary in the language from the \"Accept-Language\" header
         */
        'summary': string;
        'purchasable': services.monetization.PurchasableState;
        'entitled': services.monetization.EntitledState;
        'entitlementReason': services.monetization.EntitlementReason;
        /**
         * Total active purchases of the product made by the user. Note - For ENTITLEMENT and SUBSCRIPTION product types, the value is either zero(NOT_ENTITLED) or one(ENTITLED). For CONSUMABLE product type the value is zero or more, as CONSUMABLE can be re-purchased.
         */
        'activeEntitlementCount': number;
        'purchaseMode': services.monetization.PurchaseMode;
    }
}
export declare namespace services.monetization {
    /**
     *
     * @interface
     */
    interface InSkillProductTransactionsResponse {
        /**
         * List of transactions of in skill products purchases
         */
        'results': Array<services.monetization.Transactions>;
        'metadata': services.monetization.Metadata;
    }
}
export declare namespace services.monetization {
    /**
     *
     * @interface
     */
    interface InSkillProductsResponse {
        /**
         * List of In-Skill Products
         */
        'inSkillProducts': Array<services.monetization.InSkillProduct>;
        'isTruncated': boolean;
        'nextToken': string;
    }
}
export declare namespace services.monetization {
    /**
     *
     * @interface
     */
    interface Metadata {
        'resultSet'?: services.monetization.ResultSet;
    }
}
export declare namespace services.monetization {
    /**
     * Product type. * 'SUBSCRIPTION' - Once purchased, customers will own the content for the subscription period. * 'ENTITLEMENT' - Once purchased, customers will own the content forever. * 'CONSUMABLE' - Once purchased, customers will be entitled to the content until it is consumed. It can also be re-purchased.
     * @enum
     */
    type ProductType = 'SUBSCRIPTION' | 'ENTITLEMENT' | 'CONSUMABLE';
}
export declare namespace services.monetization {
    /**
     * State determining if the product is purchasable by the user. Note - Any new values introduced later should be treated as 'NOT_PURCHASABLE'. * 'PURCHASABLE' - The product is purchasable by the user. * 'NOT_PURCHASABLE' - The product is not purchasable by the user.
     * @enum
     */
    type PurchasableState = 'PURCHASABLE' | 'NOT_PURCHASABLE';
}
export declare namespace services.monetization {
    /**
     * Indicates if the entitlements are for TEST or LIVE purchases. * 'TEST' - test purchases made by developers or beta testers. Purchase not sent to payment processing. * 'LIVE' - purchases made by live customers. Purchase sent to payment processing.
     * @enum
     */
    type PurchaseMode = 'TEST' | 'LIVE';
}
export declare namespace services.monetization {
    /**
     *
     * @interface
     */
    interface ResultSet {
        'nextToken'?: string;
    }
}
export declare namespace services.monetization {
    /**
     * Transaction status for in skill product purchases. * 'PENDING_APPROVAL_BY_PARENT' - The transaction is pending approval from parent. * 'APPROVED_BY_PARENT' - The transaction was approved by parent and fulfilled successfully.. * 'DENIED_BY_PARENT' - The transaction was declined by parent and hence not fulfilled. * 'EXPIRED_NO_ACTION_BY_PARENT' - The transaction was expired due to no response from parent and hence not fulfilled. * 'ERROR' - The transaction was not fullfiled as there was an error while processing the transaction.
     * @enum
     */
    type Status = 'PENDING_APPROVAL_BY_PARENT' | 'APPROVED_BY_PARENT' | 'DENIED_BY_PARENT' | 'EXPIRED_NO_ACTION_BY_PARENT' | 'ERROR';
}
export declare namespace services.monetization {
    /**
     *
     * @interface
     */
    interface Transactions {
        'status'?: services.monetization.Status;
        /**
         * Product Id
         */
        'productId'?: string;
        /**
         * Time at which transaction's was initiated in ISO 8601 format i.e. yyyy-MM-dd'T'HH:mm:ss.SSS'Z'
         */
        'createdTime'?: string;
        /**
         * Time at which transaction's status was last updated in ISO 8601 format i.e. yyyy-MM-dd'T'HH:mm:ss.SSS'Z'
         */
        'lastModifiedTime'?: string;
    }
}
export declare namespace services.proactiveEvents {
    /**
     *
     * @interface
     */
    interface CreateProactiveEventRequest {
        /**
         * The date and time of the event associated with this request, in ISO 8601 format.
         */
        'timestamp': string;
        /**
         * Client-supplied ID for correlating the event with external entities. The allowed characters for the referenceId field are alphanumeric and ~, and the length of the referenceId field must be 1-100 characters.
         */
        'referenceId': string;
        /**
         * The date and time, in ISO 8601 format, when the service will automatically delete the notification if it is still in the pending state.
         */
        'expiryTime': string;
        'event': services.proactiveEvents.Event;
        /**
         * A list of items, each of which contains the set of event attributes that requires localization support.
         */
        'localizedAttributes': Array<any>;
        'relevantAudience': services.proactiveEvents.RelevantAudience;
    }
}
export declare namespace services.proactiveEvents {
    /**
     *
     * @interface
     */
    interface Error {
        'code'?: number;
        'message'?: string;
    }
}
export declare namespace services.proactiveEvents {
    /**
     * The event data to be sent to customers, conforming to the schema associated with this event.
     * @interface
     */
    interface Event {
        'name': string;
        'payload': any;
    }
}
export declare namespace services.proactiveEvents {
    /**
     * The audience for this event.
     * @interface
     */
    interface RelevantAudience {
        'type': services.proactiveEvents.RelevantAudienceType;
        /**
         * If relevantAudience.type is set to Multicast, then the payload object is empty. Otherwise, the userId value for which the event is targeted is required.
         */
        'payload': any;
    }
}
export declare namespace services.proactiveEvents {
    /**
     * The audience for this event. Use Multicast to target information to all customers subscribed to that event, or use Unicast to target information containing the actual userId for individual events.
     * @enum
     */
    type RelevantAudienceType = 'Unicast' | 'Multicast';
}
export declare namespace services.proactiveEvents {
    /**
     * Stage for creating Proactive events. Since proactive events can be created on the DEVELOPMENT and LIVE stages of the skill, this enum provides the stage values that can be used to pass to the service call.
     * @enum
     */
    type SkillStage = 'DEVELOPMENT' | 'LIVE';
}
export declare namespace services.reminderManagement {
    /**
     *
     * @interface
     */
    interface Error {
        /**
         * Domain specific error code
         */
        'code'?: string;
        /**
         * Detailed error message
         */
        'message'?: string;
    }
}
export declare namespace services.reminderManagement {
    /**
     *
     * @interface
     */
    interface Event {
        'status'?: services.reminderManagement.Status;
        'alertToken'?: string;
    }
}
export declare namespace services.reminderManagement {
    /**
     * Response object for get reminders request
     * @interface
     */
    interface GetRemindersResponse {
        /**
         * Total count of reminders returned
         */
        'totalCount'?: string;
        /**
         * List of reminders
         */
        'alerts'?: Array<services.reminderManagement.Reminder>;
        /**
         * Link to retrieve next set of alerts if total count is greater than max results
         */
        'links'?: string;
    }
}
export declare namespace services.reminderManagement {
    /**
     * Reminder object
     * @interface
     */
    interface Reminder {
        /**
         * Unique id of this reminder alert
         */
        'alertToken'?: string;
        /**
         * Valid ISO 8601 format - Creation time of this reminder alert
         */
        'createdTime'?: string;
        /**
         * Valid ISO 8601 format - Last updated time of this reminder alert
         */
        'updatedTime'?: string;
        'status'?: services.reminderManagement.Status;
        'trigger'?: services.reminderManagement.Trigger;
        'alertInfo'?: services.reminderManagement.AlertInfo;
        'pushNotification'?: services.reminderManagement.PushNotification;
        /**
         * Version of reminder alert
         */
        'version'?: string;
    }
}
export declare namespace services.reminderManagement {
    /**
     *
     * @interface
     */
    interface ReminderDeletedEvent {
        'alertTokens'?: Array<string>;
    }
}
export declare namespace services.reminderManagement {
    /**
     * Input request for creating a reminder
     * @interface
     */
    interface ReminderRequest {
        /**
         * Valid ISO 8601 format - Creation time of this reminder alert
         */
        'requestTime'?: string;
        'trigger'?: services.reminderManagement.Trigger;
        'alertInfo'?: services.reminderManagement.AlertInfo;
        'pushNotification'?: services.reminderManagement.PushNotification;
    }
}
export declare namespace services.reminderManagement {
    /**
     * Response object for post/put/delete reminder request
     * @interface
     */
    interface ReminderResponse {
        /**
         * Unique id of this reminder alert
         */
        'alertToken'?: string;
        /**
         * Valid ISO 8601 format - Creation time of this reminder alert
         */
        'createdTime'?: string;
        /**
         * Valid ISO 8601 format - Last updated time of this reminder alert
         */
        'updatedTime'?: string;
        'status'?: services.reminderManagement.Status;
        /**
         * Version of reminder alert
         */
        'version'?: string;
        /**
         * URI to retrieve the created alert
         */
        'href'?: string;
    }
}
export declare namespace services.reminderManagement {
    /**
     * Alert info for VUI / GUI
     * @interface
     */
    interface AlertInfo {
        'spokenInfo'?: services.reminderManagement.SpokenInfo;
    }
}
export declare namespace services.reminderManagement {
    /**
     * Enable / disable reminders push notifications to Alexa mobile apps
     * @interface
     */
    interface PushNotification {
        'status'?: services.reminderManagement.PushNotificationStatus;
    }
}
export declare namespace services.reminderManagement {
    /**
     * Push notification status - Enabled/Disabled
     * @enum
     */
    type PushNotificationStatus = 'ENABLED' | 'DISABLED';
}
export declare namespace services.reminderManagement {
    /**
     * Recurring date/time using the RFC 5545 standard in JSON object form
     * @interface
     */
    interface Recurrence {
        'freq'?: services.reminderManagement.RecurrenceFreq;
        'byDay'?: Array<services.reminderManagement.RecurrenceDay>;
        /**
         * contains a positive integer representing at which intervals the recurrence rule repeats
         */
        'interval'?: number;
        /**
         * Valid ISO 8601 format - optional start DateTime of recurrence.
         */
        'startDateTime'?: string;
        /**
         * Valid ISO 8601 format - optional end DateTime of recurrence
         */
        'endDateTime'?: string;
        'recurrenceRules'?: Array<string>;
    }
}
export declare namespace services.reminderManagement {
    /**
     * Day of recurrence. Deprecated.
     * @enum
     */
    type RecurrenceDay = 'SU' | 'MO' | 'TU' | 'WE' | 'TH' | 'FR' | 'SA';
}
export declare namespace services.reminderManagement {
    /**
     * Frequency of recurrence. Deprecated.
     * @enum
     */
    type RecurrenceFreq = 'WEEKLY' | 'DAILY';
}
export declare namespace services.reminderManagement {
    /**
     * Parameters for VUI presentation of the reminder
     * @interface
     */
    interface SpokenInfo {
        'content': Array<services.reminderManagement.SpokenText>;
    }
}
export declare namespace services.reminderManagement {
    /**
     *
     * @interface
     */
    interface SpokenText {
        /**
         * The locale in which the spoken text is rendered. e.g. en-US
         */
        'locale'?: string;
        /**
         * Spoken text in SSML format.
         */
        'ssml'?: string;
        /**
         * Spoken text in plain text format.
         */
        'text'?: string;
    }
}
export declare namespace services.reminderManagement {
    /**
     * Status of reminder
     * @enum
     */
    type Status = 'ON' | 'COMPLETED';
}
export declare namespace services.reminderManagement {
    /**
     * Trigger information for Reminder
     * @interface
     */
    interface Trigger {
        'type'?: services.reminderManagement.TriggerType;
        /**
         * Valid ISO 8601 format - Intended trigger time
         */
        'scheduledTime'?: string;
        /**
         * If reminder is set using relative time, use this field to specify the time after which reminder ll ring (in seconds)
         */
        'offsetInSeconds'?: number;
        /**
         * Intended reminder's timezone
         */
        'timeZoneId'?: string;
        'recurrence'?: services.reminderManagement.Recurrence;
    }
}
export declare namespace services.reminderManagement {
    /**
     * Type of reminder - Absolute / Relative
     * @enum
     */
    type TriggerType = 'SCHEDULED_ABSOLUTE' | 'SCHEDULED_RELATIVE';
}
export declare namespace services.skillMessaging {
    /**
     *
     * @interface
     */
    interface Error {
        'code'?: number;
        'message'?: string;
    }
}
export declare namespace services.skillMessaging {
    /**
     * The message that needs to be sent to the skill
     * @interface
     */
    interface SendSkillMessagingRequest {
        /**
         * The payload data to send with the message. The data must be in the form of JSON-formatted key-value pairs. Both keys and values must be of type String. The total size of the data cannot be greater than 6KB. For calculation purposes, this includes keys and values, the quotes that surround them, the \":\" character that separates them, the commas that separate the pairs, and the opening and closing braces around the field. However, any whitespace between key/value pairs is not included in the calculation of the payload size. If the message does not include payload data, as in the case of a sync message, you can pass in an empty JSON object \"{}\".
         */
        'data': any;
        /**
         * The number of seconds that the message will be retained to retry if message delivery is not successful. Allowed values are from 60 (1 minute) to 86400 (1 day), inclusive. The default is 3600 (1 hour). Multiple retries may occur during this interval. The retry logic is exponential. The first retry executes after 30 seconds, and this time period doubles on every retry. The retries will end when the total time elapsed since the message was first sent has exceeded the value you provided for expiresAfterSeconds. Message expiry is rarely a problem if the message handler has been set up correctly. With a correct setup, you will receive the message once promptly. This mechanism for retries is provided as a safeguard in case your skill goes down during a message delivery.
         */
        'expiresAfterSeconds'?: number;
    }
}
export declare namespace services.timerManagement {
    /**
     * Whether the native Timer GUI is shown for 8-seconds upon Timer Creation.
     * @interface
     */
    interface CreationBehavior {
        'displayExperience'?: services.timerManagement.DisplayExperience;
    }
}
export declare namespace services.timerManagement {
    /**
     * Multi model presentation of the timer creation.
     * @interface
     */
    interface DisplayExperience {
        'visibility'?: services.timerManagement.Visibility;
    }
}
export declare namespace services.timerManagement {
    /**
     * Error object for Response.
     * @interface
     */
    interface Error {
        /**
         * Domain specific error code
         */
        'code'?: string;
        /**
         * Detailed error message
         */
        'message'?: string;
    }
}
export declare namespace services.timerManagement {
    /**
     * notification of the timer expiration.
     * @interface
     */
    interface NotificationConfig {
        /**
         * Whether the native trigger CX is employed for this timer. By extension, this also denote whether an explicit ‘Stop’ is required.
         */
        'playAudible'?: boolean;
    }
}
export declare namespace services.timerManagement {
    /**
     * Triggering information for Timer.
     * @interface
     */
    type Operation = services.timerManagement.LaunchTaskOperation | services.timerManagement.AnnounceOperation | services.timerManagement.NotifyOnlyOperation;
}
export declare namespace services.timerManagement {
    /**
     * Status of timer
     * @enum
     */
    type Status = 'ON' | 'PAUSED' | 'OFF';
}
export declare namespace services.timerManagement {
    /**
     * Custom task passed by skill developers when the operation type is \"LAUNCH_TASK\"
     * @interface
     */
    interface Task {
        /**
         * task name
         */
        'name'?: string;
        /**
         * task version E.g. \"1\"
         */
        'version'?: string;
        /**
         * Developers can pass in any dictionary they need for the skill
         */
        'input'?: any;
    }
}
export declare namespace services.timerManagement {
    /**
     * When the operation type is \"ANNOUNCE\", announces a certain text that the developer wants to be read out at the expiration of the timer.
     * @interface
     */
    interface TextToAnnounce {
        /**
         * The locale in which the announcement text is rendered.
         */
        'locale'?: string;
        /**
         * If provided, triggerText will be delivered by Timers speechlet upon trigger dismissal or immediately upon timer expiry if playAudible = false.
         */
        'text'?: string;
    }
}
export declare namespace services.timerManagement {
    /**
     * When the operation type is \"LAUNCH_TASK\", confirm with the customer at the expiration of the timer.
     * @interface
     */
    interface TextToConfirm {
        /**
         * The locale in which the confirmation text is rendered.
         */
        'locale'?: string;
        /**
         * Prompt will be given to user upon trigger dismissal or timer expiry (depending on playAudible). %s (placeholder for “continue with Skill Name”) is mandatory.
         */
        'text'?: string;
    }
}
export declare namespace services.timerManagement {
    /**
     * Input request for creating a timer.
     * @interface
     */
    interface TimerRequest {
        /**
         * An ISO-8601 representation of duration. E.g. for 2 minutes and 3 seconds - \"PT2M3S\".
         */
        'duration': string;
        /**
         * Label of this timer alert, maximum of 256 characters.
         */
        'timerLabel'?: string;
        'creationBehavior': services.timerManagement.CreationBehavior;
        'triggeringBehavior': services.timerManagement.TriggeringBehavior;
    }
}
export declare namespace services.timerManagement {
    /**
     * Timer object
     * @interface
     */
    interface TimerResponse {
        /**
         * Unique id of this timer alert
         */
        'id'?: string;
        'status'?: services.timerManagement.Status;
        /**
         * An ISO-8601 representation of duration. E.g. for 2 minutes and 3 seconds - \"PT2M3S\".
         */
        'duration'?: string;
        /**
         * Valid ISO 8601 format - Trigger time of this timer alert.
         */
        'triggerTime'?: string;
        /**
         * Label of this timer alert, maximum of 256 character.
         */
        'timerLabel'?: string;
        /**
         * Valid ISO 8601 format - Creation time of this timer alert.
         */
        'createdTime'?: string;
        /**
         * Valid ISO 8601 format - Last updated time of this timer alert.
         */
        'updatedTime'?: string;
        /**
         * An ISO-8601 representation of duration remaining since the timer was last paused. E.g. for 1 hour, 3 minutes and 31 seconds - \"PT1H3M31S\".
         */
        'remainingTimeWhenPaused'?: string;
    }
}
export declare namespace services.timerManagement {
    /**
     * Timers object with paginated list of multiple timers
     * @interface
     */
    interface TimersResponse {
        /**
         * Total count of timers returned.
         */
        'totalCount'?: number;
        /**
         * List of multiple Timer objects
         */
        'timers'?: Array<services.timerManagement.TimerResponse>;
        /**
         * Link to retrieve next set of timers if total count is greater than max results.
         */
        'nextToken'?: string;
    }
}
export declare namespace services.timerManagement {
    /**
     * The triggering behavior upon Timer Expired.
     * @interface
     */
    interface TriggeringBehavior {
        'operation'?: services.timerManagement.Operation;
        'notificationConfig'?: services.timerManagement.NotificationConfig;
    }
}
export declare namespace services.timerManagement {
    /**
     * The default native Timer GUI \"visible\" is shown for 8-seconds upon Timer Creation. Otherwise, \"hidden\" will not show default native Timer GUI.
     * @enum
     */
    type Visibility = 'VISIBLE' | 'HIDDEN';
}
export declare namespace services.ups {
    /**
     *
     * @enum
     */
    type DistanceUnits = 'METRIC' | 'IMPERIAL';
}
export declare namespace services.ups {
    /**
     *
     * @interface
     */
    interface Error {
        'code'?: services.ups.ErrorCode;
        /**
         * A human readable description of error.
         */
        'message'?: string;
    }
}
export declare namespace services.ups {
    /**
     * A more precise error code. Some of these codes may not apply to some APIs. - INVALID_KEY: the setting key is not supported - INVALID_VALUE: the setting value is not valid - INVALID_TOKEN: the token is invalid - INVALID_URI: the uri is invalid - DEVICE_UNREACHABLE: the device is offline - UNKNOWN_ERROR: internal service error
     * @enum
     */
    type ErrorCode = 'INVALID_KEY' | 'INVALID_VALUE' | 'INVALID_TOKEN' | 'INVALID_URI' | 'DEVICE_UNREACHABLE' | 'UNKNOWN_ERROR';
}
export declare namespace services.ups {
    /**
     *
     * @interface
     */
    interface PhoneNumber {
        'countryCode'?: string;
        'phoneNumber'?: string;
    }
}
export declare namespace services.ups {
    /**
     *
     * @enum
     */
    type TemperatureUnit = 'CELSIUS' | 'FAHRENHEIT';
}
export declare namespace slu.entityresolution {
    /**
     * Represents a possible authority for entity resolution
     * @interface
     */
    interface Resolution {
        'authority': string;
        'status': slu.entityresolution.Status;
        'values': Array<slu.entityresolution.ValueWrapper>;
    }
}
export declare namespace slu.entityresolution {
    /**
     * Represents the results of resolving the words captured from the user's utterance. This is included for slots that use a custom slot type or a built-in slot type that you have extended with your own values. Note that resolutions is not included for built-in slot types that you have not extended.
     * @interface
     */
    interface Resolutions {
        'resolutionsPerAuthority'?: Array<slu.entityresolution.Resolution>;
    }
}
export declare namespace slu.entityresolution {
    /**
     *
     * @interface
     */
    interface Status {
        /**
         * Indication of the results of attempting to resolve the user utterance against the defined slot types.
         */
        'code': slu.entityresolution.StatusCode;
    }
}
export declare namespace slu.entityresolution {
    /**
     * Indication of the results of attempting to resolve the user utterance against the defined slot types.
     * @enum
     */
    type StatusCode = 'ER_SUCCESS_MATCH' | 'ER_SUCCESS_NO_MATCH' | 'ER_ERROR_TIMEOUT' | 'ER_ERROR_EXCEPTION';
}
export declare namespace slu.entityresolution {
    /**
     * Represents the resolved value for the slot, based on the user’s utterance and slot type definition.
     * @interface
     */
    interface Value {
        /**
         * The name for the resolution value.
         */
        'name': string;
        /**
         * The id for the resolution value.
         */
        'id': string;
    }
}
export declare namespace slu.entityresolution {
    /**
     * A wrapper class for an entity resolution value used for JSON serialization.
     * @interface
     */
    interface ValueWrapper {
        'value': slu.entityresolution.Value;
    }
}
export declare namespace ui {
    /**
     *
     * @interface
     */
    type Card = ui.AskForPermissionsConsentCard | ui.LinkAccountCard | ui.StandardCard | ui.SimpleCard;
}
export declare namespace ui {
    /**
     *
     * @interface
     */
    interface Image {
        'smallImageUrl'?: string;
        'largeImageUrl'?: string;
    }
}
export declare namespace ui {
    /**
     *
     * @interface
     */
    type OutputSpeech = ui.SsmlOutputSpeech | ui.PlainTextOutputSpeech;
}
export declare namespace ui {
    /**
     * Determines whether Alexa will queue or play this output speech immediately interrupting other speech
     * @enum
     */
    type PlayBehavior = 'ENQUEUE' | 'REPLACE_ALL' | 'REPLACE_ENQUEUED';
}
export declare namespace ui {
    /**
     *
     * @interface
     */
    interface Reprompt {
        'outputSpeech'?: ui.OutputSpeech;
        'directives'?: Array<Directive>;
    }
}
/**
 * Represents the status and result needed to resume a skill's suspended session.
 * @interface
 */
export interface ConnectionCompleted {
    'type': 'ConnectionCompleted';
    /**
     * This is an echo back string that skills send when during Connections.StartConnection directive. They will receive it when they get the SessionResumedRequest. It is never sent to the skill handling the request.
     */
    'token'?: string;
    'status'?: Status;
    /**
     * This is the result object to resume the skill's suspended session.
     */
    'result'?: any;
}
/**
 * An IntentRequest is an object that represents a request made to a skill based on what the user wants to do.
 * @interface
 */
export interface IntentRequest {
    'type': 'IntentRequest';
    /**
     * Represents the unique identifier for the specific request.
     */
    'requestId': string;
    /**
     * Provides the date and time when Alexa sent the request as an ISO 8601 formatted string. Used to verify the request when hosting your skill as a web service.
     */
    'timestamp': string;
    /**
     * A string indicating the user’s locale. For example: en-US. This value is only provided with certain request types.
     */
    'locale'?: string;
    /**
     * Enumeration indicating the status of the multi-turn dialog. This property is included if the skill meets the requirements to use the Dialog directives. Note that COMPLETED is only possible when you use the Dialog.Delegate directive. If you use intent confirmation, dialogState is considered COMPLETED if the user denies the entire intent (for instance, by answering “no” when asked the confirmation prompt). Be sure to also check the confirmationStatus property on the Intent object before fulfilling the user’s request.
     */
    'dialogState': DialogState;
    /**
     * An object that represents what the user wants.
     */
    'intent': Intent;
}
/**
 * Represents that a user made a request to an Alexa skill, but did not provide a specific intent.
 * @interface
 */
export interface LaunchRequest {
    'type': 'LaunchRequest';
    /**
     * Represents the unique identifier for the specific request.
     */
    'requestId': string;
    /**
     * Provides the date and time when Alexa sent the request as an ISO 8601 formatted string. Used to verify the request when hosting your skill as a web service.
     */
    'timestamp': string;
    /**
     * A string indicating the user’s locale. For example: en-US. This value is only provided with certain request types.
     */
    'locale'?: string;
    'task'?: Task;
}
/**
 * Slot value containing a list of other slot value objects.
 * @interface
 */
export interface ListSlotValue {
    'type': 'List';
    /**
     * An array containing the values captured for this slot.
     */
    'values': Array<SlotValue>;
}
/**
 * A SessionEndedRequest is an object that represents a request made to an Alexa skill to notify that a session was ended. Your service receives a SessionEndedRequest when a currently open session is closed for one of the following reasons: <ol><li>The user says “exit”</li><li>the user does not respond or says something that does not match an intent defined in your voice interface while the device is listening for the user’s response</li><li>an error occurs</li></ol>
 * @interface
 */
export interface SessionEndedRequest {
    'type': 'SessionEndedRequest';
    /**
     * Represents the unique identifier for the specific request.
     */
    'requestId': string;
    /**
     * Provides the date and time when Alexa sent the request as an ISO 8601 formatted string. Used to verify the request when hosting your skill as a web service.
     */
    'timestamp': string;
    /**
     * A string indicating the user’s locale. For example: en-US. This value is only provided with certain request types.
     */
    'locale'?: string;
    /**
     * Describes why the session ended.
     */
    'reason': SessionEndedReason;
    /**
     * An error object providing more information about the error that occurred.
     */
    'error'?: SessionEndedError;
}
/**
 * The request to resume a skill's session and tells the skill why it is resumed.
 * @interface
 */
export interface SessionResumedRequest {
    'type': 'SessionResumedRequest';
    /**
     * Represents the unique identifier for the specific request.
     */
    'requestId': string;
    /**
     * Provides the date and time when Alexa sent the request as an ISO 8601 formatted string. Used to verify the request when hosting your skill as a web service.
     */
    'timestamp': string;
    /**
     * A string indicating the user’s locale. For example: en-US. This value is only provided with certain request types.
     */
    'locale'?: string;
    'cause'?: Cause;
}
/**
 * Slot value containing a single string value and resolutions.
 * @interface
 */
export interface SimpleSlotValue {
    'type': 'Simple';
    /**
     * A string that represents the value the user spoke for the slot. This is the actual value the user spoke, not necessarily the canonical value or one of the synonyms defined for the entity. Note that AMAZON.LITERAL slot values sent to your service are always in all lower case.
     */
    'value'?: string;
    /**
     * Contains the results of entity resolution. These are organized by authority. An authority represents the source for the data provided for the slot. For a custom slot type, the authority is the slot type you defined.
     */
    'resolutions'?: slu.entityresolution.Resolutions;
}
export declare namespace authorization {
    /**
     * Represents an authorization code delivered to a skill that has out-of-session permissions without requiring account linking.
     * @interface
     */
    interface AuthorizationGrantRequest {
        'type': 'Alexa.Authorization.Grant';
        /**
         * Represents the unique identifier for the specific request.
         */
        'requestId': string;
        /**
         * Provides the date and time when Alexa sent the request as an ISO 8601 formatted string. Used to verify the request when hosting your skill as a web service.
         */
        'timestamp': string;
        /**
         * A string indicating the user’s locale. For example: en-US. This value is only provided with certain request types.
         */
        'locale'?: string;
        'body': authorization.AuthorizationGrantBody;
    }
}
export declare namespace canfulfill {
    /**
     * An object that represents a request made to skill to query whether the skill can understand and fulfill the intent request with detected slots, before actually asking the skill to take action. Skill should be aware this is not to actually take action, skill should handle this request without causing side-effect, skill should not modify some state outside its scope or has an observable interaction with its calling functions or the outside world besides returning a value, such as playing sound,turning on/off lights, committing a transaction or a charge.
     * @interface
     */
    interface CanFulfillIntentRequest {
        'type': 'CanFulfillIntentRequest';
        /**
         * Represents the unique identifier for the specific request.
         */
        'requestId': string;
        /**
         * Provides the date and time when Alexa sent the request as an ISO 8601 formatted string. Used to verify the request when hosting your skill as a web service.
         */
        'timestamp': string;
        /**
         * A string indicating the user’s locale. For example: en-US. This value is only provided with certain request types.
         */
        'locale'?: string;
        'dialogState'?: DialogState;
        'intent': Intent;
    }
}
export declare namespace dialog {
    /**
     *
     * @interface
     */
    interface ConfirmIntentDirective {
        'type': 'Dialog.ConfirmIntent';
        'updatedIntent'?: Intent;
    }
}
export declare namespace dialog {
    /**
     *
     * @interface
     */
    interface ConfirmSlotDirective {
        'type': 'Dialog.ConfirmSlot';
        'updatedIntent'?: Intent;
        'slotToConfirm': string;
    }
}
export declare namespace dialog {
    /**
     *
     * @interface
     */
    interface DelegateDirective {
        'type': 'Dialog.Delegate';
        'updatedIntent'?: Intent;
    }
}
export declare namespace dialog {
    /**
     *
     * @interface
     */
    interface DelegateRequestDirective {
        'type': 'Dialog.DelegateRequest';
        /**
         * The delegation target.
         */
        'target': string;
        'period': dialog.DelegationPeriod;
        'updatedRequest'?: dialog.UpdatedRequest;
    }
}
export declare namespace dialog {
    /**
     *
     * @interface
     */
    interface DynamicEntitiesDirective {
        'type': 'Dialog.UpdateDynamicEntities';
        'updateBehavior': er.dynamic.UpdateBehavior;
        'types'?: Array<er.dynamic.EntityListItem>;
    }
}
export declare namespace dialog {
    /**
     *
     * @interface
     */
    interface ElicitSlotDirective {
        'type': 'Dialog.ElicitSlot';
        'updatedIntent'?: Intent;
        'slotToElicit': string;
    }
}
export declare namespace dialog {
    /**
     * A request representing structured data used to provide dialog input to a dialog manager.
     * @interface
     */
    interface InputRequest {
        'type': 'Dialog.InputRequest';
        /**
         * Represents the unique identifier for the specific request.
         */
        'requestId': string;
        /**
         * Provides the date and time when Alexa sent the request as an ISO 8601 formatted string. Used to verify the request when hosting your skill as a web service.
         */
        'timestamp': string;
        /**
         * A string indicating the user’s locale. For example: en-US. This value is only provided with certain request types.
         */
        'locale'?: string;
        'input': dialog.Input;
    }
}
export declare namespace dialog {
    /**
     *
     * @interface
     */
    interface UpdatedInputRequest {
        'type': 'Dialog.InputRequest';
        'input': dialog.Input;
    }
}
export declare namespace dialog {
    /**
     *
     * @interface
     */
    interface UpdatedIntentRequest {
        'type': 'IntentRequest';
        'intent': Intent;
    }
}
export declare namespace dynamicEndpoints {
    /**
     * Failure skill response for a Dynamic endpoint request.
     * @interface
     */
    interface FailureResponse {
        'type': 'SkillResponseFailureMessage';
        /**
         * The version of the response message schema used.
         */
        'version': string;
        /**
         * The same request identifier as the Dynamic endpoint request for this response.
         */
        'originalRequestId': string;
        /**
         * The error code for the failure. Standard HTTP error codes will be used.
         */
        'errorCode'?: string;
        /**
         * Description of the failure.
         */
        'errorMessage'?: string;
    }
}
export declare namespace dynamicEndpoints {
    /**
     * Success response for a Dynamic endpoint request.
     * @interface
     */
    interface SuccessResponse {
        'type': 'SkillResponseSuccessMessage';
        /**
         * The version of the response message schema used.
         */
        'version': string;
        /**
         * The same request identifier as the Dynamic endpoint request for this response.
         */
        'originalRequestId': string;
        /**
         * The response payload.
         */
        'responsePayload'?: string;
    }
}
export declare namespace events.skillevents {
    /**
     * This event indicates that a customer has linked an account in a third-party application with the Alexa app. This event is useful for an application that support out-of-session (non-voice) user interactions so that this application can be notified when the internal customer can be associated with the Alexa customer. This event is required for many applications that synchronize customer Alexa lists with application lists. During the account linking process, the Alexa app directs the user to the skill website where the customer logs in. When the customer logs in, the skill then provides an access token and a consent token to Alexa. The event includes the same access token and consent token.
     * @interface
     */
    interface AccountLinkedRequest {
        'type': 'AlexaSkillEvent.SkillAccountLinked';
        /**
         * Represents the unique identifier for the specific request.
         */
        'requestId': string;
        /**
         * Provides the date and time when Alexa sent the request as an ISO 8601 formatted string. Used to verify the request when hosting your skill as a web service.
         */
        'timestamp': string;
        /**
         * A string indicating the user’s locale. For example: en-US. This value is only provided with certain request types.
         */
        'locale'?: string;
        'body': events.skillevents.AccountLinkedBody;
        'eventCreationTime'?: string;
        'eventPublishingTime'?: string;
    }
}
export declare namespace events.skillevents {
    /**
     * When a customer changes his topic subscriptions Alexa will send an event back to the skill endpoint notifying the skill owner with the most recent state of the customer's subscriptions. This is to notify skill owners of customers' interest in receiving events from one or more schemas. This event indicates a customer permission to receive notifications from your skill and contains information for that user. You need this information to know the userId in order to send notifications to individual users. Note that these events can arrive out of order, so ensure that your skill service uses the timestamp in the event to correctly record the latest topic subscription state for a customer.
     * @interface
     */
    interface NotificationSubscriptionChangedRequest {
        'type': 'AlexaSkillEvent.NotificationSubscriptionChanged';
        /**
         * Represents the unique identifier for the specific request.
         */
        'requestId': string;
        /**
         * Provides the date and time when Alexa sent the request as an ISO 8601 formatted string. Used to verify the request when hosting your skill as a web service.
         */
        'timestamp': string;
        /**
         * A string indicating the user’s locale. For example: en-US. This value is only provided with certain request types.
         */
        'locale'?: string;
        'body': events.skillevents.NotificationSubscriptionChangedBody;
    }
}
export declare namespace events.skillevents {
    /**
     *
     * @interface
     */
    interface PermissionAcceptedRequest {
        'type': 'AlexaSkillEvent.SkillPermissionAccepted';
        /**
         * Represents the unique identifier for the specific request.
         */
        'requestId': string;
        /**
         * Provides the date and time when Alexa sent the request as an ISO 8601 formatted string. Used to verify the request when hosting your skill as a web service.
         */
        'timestamp': string;
        /**
         * A string indicating the user’s locale. For example: en-US. This value is only provided with certain request types.
         */
        'locale'?: string;
        'body'?: events.skillevents.PermissionBody;
        'eventCreationTime'?: string;
        'eventPublishingTime'?: string;
    }
}
export declare namespace events.skillevents {
    /**
     *
     * @interface
     */
    interface PermissionChangedRequest {
        'type': 'AlexaSkillEvent.SkillPermissionChanged';
        /**
         * Represents the unique identifier for the specific request.
         */
        'requestId': string;
        /**
         * Provides the date and time when Alexa sent the request as an ISO 8601 formatted string. Used to verify the request when hosting your skill as a web service.
         */
        'timestamp': string;
        /**
         * A string indicating the user’s locale. For example: en-US. This value is only provided with certain request types.
         */
        'locale'?: string;
        'body'?: events.skillevents.PermissionBody;
        'eventCreationTime'?: string;
        'eventPublishingTime'?: string;
    }
}
export declare namespace events.skillevents {
    /**
     * This event indicates a customer subscription to receive events from your skill and contains information for that user and person, if recognized. You need this information to know the userId and personId in order to send events to individual users. Note that these events can arrive out of order, so ensure that your skill service uses the timestamp in the event to correctly record the latest subscription state for a customer.
     * @interface
     */
    interface ProactiveSubscriptionChangedRequest {
        'type': 'AlexaSkillEvent.ProactiveSubscriptionChanged';
        /**
         * Represents the unique identifier for the specific request.
         */
        'requestId': string;
        /**
         * Provides the date and time when Alexa sent the request as an ISO 8601 formatted string. Used to verify the request when hosting your skill as a web service.
         */
        'timestamp': string;
        /**
         * A string indicating the user’s locale. For example: en-US. This value is only provided with certain request types.
         */
        'locale'?: string;
        'body': events.skillevents.ProactiveSubscriptionChangedBody;
    }
}
export declare namespace events.skillevents {
    /**
     *
     * @interface
     */
    interface SkillDisabledRequest {
        'type': 'AlexaSkillEvent.SkillDisabled';
        /**
         * Represents the unique identifier for the specific request.
         */
        'requestId': string;
        /**
         * Provides the date and time when Alexa sent the request as an ISO 8601 formatted string. Used to verify the request when hosting your skill as a web service.
         */
        'timestamp': string;
        /**
         * A string indicating the user’s locale. For example: en-US. This value is only provided with certain request types.
         */
        'locale'?: string;
        'eventCreationTime'?: string;
        'eventPublishingTime'?: string;
    }
}
export declare namespace events.skillevents {
    /**
     *
     * @interface
     */
    interface SkillEnabledRequest {
        'type': 'AlexaSkillEvent.SkillEnabled';
        /**
         * Represents the unique identifier for the specific request.
         */
        'requestId': string;
        /**
         * Provides the date and time when Alexa sent the request as an ISO 8601 formatted string. Used to verify the request when hosting your skill as a web service.
         */
        'timestamp': string;
        /**
         * A string indicating the user’s locale. For example: en-US. This value is only provided with certain request types.
         */
        'locale'?: string;
        'eventCreationTime'?: string;
        'eventPublishingTime'?: string;
    }
}
export declare namespace interfaces.alexa.advertisement {
    /**
     * The skill receives this event when the ad playback is finished. More details: https://tiny.amazon.com/tbfio2ru/wamazbinviewAlexTeamASKTInSk
     * @interface
     */
    interface AdCompleted {
        'type': 'Alexa.Advertisement.AdCompleted';
        /**
         * Represents the unique identifier for the specific request.
         */
        'requestId': string;
        /**
         * Provides the date and time when Alexa sent the request as an ISO 8601 formatted string. Used to verify the request when hosting your skill as a web service.
         */
        'timestamp': string;
        /**
         * A string indicating the user’s locale. For example: en-US. This value is only provided with certain request types.
         */
        'locale'?: string;
        /**
         * The current token representing the ad stream being played.
         */
        'token'?: string;
    }
}
export declare namespace interfaces.alexa.advertisement {
    /**
     * The skill receives this event when the ad cannot be displayed or played due to certain reasons. More details: https://tiny.amazon.com/16bnoj5db/wamazbinviewAlexTeamASKTInSk
     * @interface
     */
    interface AdNotRendered {
        'type': 'Alexa.Advertisement.AdNotRendered';
        /**
         * Represents the unique identifier for the specific request.
         */
        'requestId': string;
        /**
         * Provides the date and time when Alexa sent the request as an ISO 8601 formatted string. Used to verify the request when hosting your skill as a web service.
         */
        'timestamp': string;
        /**
         * A string indicating the user’s locale. For example: en-US. This value is only provided with certain request types.
         */
        'locale'?: string;
        /**
         * The object encapsulates information regarding the reasons why the ad is not being rendered.
         */
        'reason'?: interfaces.alexa.advertisement.Reason;
    }
}
export declare namespace interfaces.alexa.advertisement {
    /**
     *
     * @interface
     */
    interface InjectAds {
        'type': 'Alexa.Advertisement.InjectAds';
        /**
         * The optional expected previous token represents the content currently being played, and it is utilized to enqueue the advertisement after the ongoing audio content. More details: https://tiny.amazon.com/l9h6ejjr/wamazbinviewAlexTeamASKTInSk
         */
        'expectedPreviousToken'?: string;
    }
}
export declare namespace interfaces.alexa.advertisement {
    /**
     * This event is sent to the skill as a signal that it can enqueue the next audio content in the audio player. This allows the third-party skill to resume content playback after the advertisement.
     * @interface
     */
    interface ReadyToEnqueueAudio {
        'type': 'Alexa.Advertisement.ReadyToEnqueueAudio';
        /**
         * Represents the unique identifier for the specific request.
         */
        'requestId': string;
        /**
         * Provides the date and time when Alexa sent the request as an ISO 8601 formatted string. Used to verify the request when hosting your skill as a web service.
         */
        'timestamp': string;
        /**
         * A string indicating the user’s locale. For example: en-US. This value is only provided with certain request types.
         */
        'locale'?: string;
        /**
         * The token currently representing the ad stream being played can be used as the expectedPreviousToken in the AudioPlayer.Play directive. This allows the skill to enqueue the next content seamlessly after the ad stream.
         */
        'token'?: string;
        /**
         * The expectedPreviousToken passed in the InjectAds request, which can be utilized by a skill to maintain an ordered list and find the next content from the current content.
         */
        'previousToken'?: string;
    }
}
export declare namespace interfaces.alexa.datastore {
    /**
     * This event is sent by DSCS to forward ExecutionError from device or to inform about delivery error.
     * @interface
     */
    interface DataStoreError {
        'type': 'Alexa.DataStore.Error';
        /**
         * Represents the unique identifier for the specific request.
         */
        'requestId': string;
        /**
         * Provides the date and time when Alexa sent the request as an ISO 8601 formatted string. Used to verify the request when hosting your skill as a web service.
         */
        'timestamp': string;
        /**
         * A string indicating the user’s locale. For example: en-US. This value is only provided with certain request types.
         */
        'locale'?: string;
        'error': interfaces.alexa.datastore.CommandsError;
    }
}
export declare namespace interfaces.alexa.datastore {
    /**
     * Describes an execution error for unknown error from device DataStore.
     * @interface
     */
    interface DataStoreInternalError {
        'type': 'DATASTORE_INTERNAL_ERROR';
        'content': interfaces.alexa.datastore.ExecutionErrorContent;
    }
}
export declare namespace interfaces.alexa.datastore {
    /**
     * Describes a dispatch error when device is no longer available. Skill must stop pushing data to this device in the future.
     * @interface
     */
    interface DevicePermanantlyUnavailableError {
        'type': 'DEVICE_PERMANENTLY_UNAVAILABLE';
        'content': interfaces.alexa.datastore.DispatchErrorContent;
    }
}
export declare namespace interfaces.alexa.datastore {
    /**
     * Describes a dispatch error when device is not available.
     * @interface
     */
    interface DeviceUnavailableError {
        'type': 'DEVICE_UNAVAILABLE';
        'content': interfaces.alexa.datastore.DispatchErrorContent;
    }
}
export declare namespace interfaces.alexa.datastore {
    /**
     * Describes an execution error for exceeding storage limit.
     * @interface
     */
    interface StorageLimitExeceededError {
        'type': 'STORAGE_LIMIT_EXCEEDED';
        'content': interfaces.alexa.datastore.ExecutionErrorContent;
    }
}
export declare namespace interfaces.alexa.datastore.packagemanager {
    /**
     * This event is sent by device DataStore Package Manager to let the skill developer know that there was a problem installing/updating the package.
     * @interface
     */
    interface InstallationError {
        'type': 'Alexa.DataStore.PackageManager.InstallationError';
        /**
         * Represents the unique identifier for the specific request.
         */
        'requestId': string;
        /**
         * Provides the date and time when Alexa sent the request as an ISO 8601 formatted string. Used to verify the request when hosting your skill as a web service.
         */
        'timestamp': string;
        /**
         * A string indicating the user’s locale. For example: en-US. This value is only provided with certain request types.
         */
        'locale'?: string;
        /**
         * Unique package identifier for a client.
         */
        'packageId': string;
        /**
         * Current version of the package trying to be installed/updated on the device.
         */
        'version': string;
        'error': interfaces.alexa.datastore.packagemanager.PackageError;
    }
}
export declare namespace interfaces.alexa.datastore.packagemanager {
    /**
     * This event is request sent by device DataStore Package Manager asking the skill developer them to update the version of the package on device.
     * @interface
     */
    interface UpdateRequest {
        'type': 'Alexa.DataStore.PackageManager.UpdateRequest';
        /**
         * Represents the unique identifier for the specific request.
         */
        'requestId': string;
        /**
         * Provides the date and time when Alexa sent the request as an ISO 8601 formatted string. Used to verify the request when hosting your skill as a web service.
         */
        'timestamp': string;
        /**
         * A string indicating the user’s locale. For example: en-US. This value is only provided with certain request types.
         */
        'locale'?: string;
        /**
         * Unique package identifier for a client.
         */
        'packageId': string;
        /**
         * Current version of a package installed on the device.
         */
        'fromVersion': string;
        /**
         * Latest version of a package being installed on the device.
         */
        'toVersion': string;
    }
}
export declare namespace interfaces.alexa.datastore.packagemanager {
    /**
     * This event is sent by device DataStore Package Manager to the skill developer to let them know about the usages of the packages being installed on the device.
     * @interface
     */
    interface UsagesInstalled {
        'type': 'Alexa.DataStore.PackageManager.UsagesInstalled';
        /**
         * Represents the unique identifier for the specific request.
         */
        'requestId': string;
        /**
         * Provides the date and time when Alexa sent the request as an ISO 8601 formatted string. Used to verify the request when hosting your skill as a web service.
         */
        'timestamp': string;
        /**
         * A string indicating the user’s locale. For example: en-US. This value is only provided with certain request types.
         */
        'locale'?: string;
        'payload': interfaces.alexa.datastore.packagemanager.UsagesInstallRequest;
    }
}
export declare namespace interfaces.alexa.datastore.packagemanager {
    /**
     * This event is sent by device DataStore Package Manager to let the skill developer know about the usages of packages removed from the device.
     * @interface
     */
    interface UsagesRemoved {
        'type': 'Alexa.DataStore.PackageManager.UsagesRemoved';
        /**
         * Represents the unique identifier for the specific request.
         */
        'requestId': string;
        /**
         * Provides the date and time when Alexa sent the request as an ISO 8601 formatted string. Used to verify the request when hosting your skill as a web service.
         */
        'timestamp': string;
        /**
         * A string indicating the user’s locale. For example: en-US. This value is only provided with certain request types.
         */
        'locale'?: string;
        'payload': interfaces.alexa.datastore.packagemanager.UsagesRemovedRequest;
    }
}
export declare namespace interfaces.alexa.presentation {
    /**
     *
     * @interface
     */
    interface AplPresentationStateContext {
        'type': 'Alexa.Presentation.APL';
        'context'?: interfaces.alexa.presentation.apl.RenderedDocumentState;
    }
}
export declare namespace interfaces.alexa.presentation.apl {
    /**
     * Runs a fixed-duration animation sequence on one or more properties of a single component.
     * @interface
     */
    interface AnimateItemCommand {
        'type': 'AnimateItem';
        /**
         * The delay in milliseconds before this command starts executing; must be non-negative. Defaults to 0.
         */
        'delay'?: number | string;
        /**
         * A user-provided description of this command.
         */
        'description'?: string;
        /**
         * If true, disable the Interaction Timer.
         */
        'screenLock'?: boolean;
        /**
         * Specify the sequencer that should execute this command.
         */
        'sequencer'?: string;
        /**
         * If false, the execution of the command is skipped. Defaults to true.
         */
        'when'?: boolean;
        /**
         * The ID of the animated component.
         */
        'componentId': string;
        /**
         * The duration of the animation (in milliseconds).
         */
        'duration': number | string;
        /**
         * The easing curve.
         */
        'easing'?: string;
        /**
         * Number of times to repeat.
         */
        'repeatCount'?: number | string;
        'repeatMode'?: interfaces.alexa.presentation.apl.AnimateItemRepeatMode;
        /**
         * An array of animated properties.
         */
        'value': Array<interfaces.alexa.presentation.apl.AnimatedProperty>;
    }
}
export declare namespace interfaces.alexa.presentation.apl {
    /**
     *
     * @interface
     */
    interface AnimatedOpacityProperty {
        'property': 'opacity';
        /**
         * The starting value of the property.
         */
        'from'?: number | string;
        /**
         * The ending value of the property.
         */
        'to': number | string;
    }
}
export declare namespace interfaces.alexa.presentation.apl {
    /**
     *
     * @interface
     */
    interface AnimatedTransformProperty {
        'property': 'transform';
        /**
         * The starting value of the property.
         */
        'from': Array<interfaces.alexa.presentation.apl.TransformProperty>;
        /**
         * The ending value of the property.
         */
        'to': Array<interfaces.alexa.presentation.apl.TransformProperty>;
    }
}
export declare namespace interfaces.alexa.presentation.apl {
    /**
     * Automatically progress through a series of pages displayed in a Pager component. The AutoPage command finishes after the last page has been displayed for the requested time period.
     * @interface
     */
    interface AutoPageCommand {
        'type': 'AutoPage';
        /**
         * The delay in milliseconds before this command starts executing; must be non-negative. Defaults to 0.
         */
        'delay'?: number | string;
        /**
         * A user-provided description of this command.
         */
        'description'?: string;
        /**
         * If true, disable the Interaction Timer.
         */
        'screenLock'?: boolean;
        /**
         * Specify the sequencer that should execute this command.
         */
        'sequencer'?: string;
        /**
         * If false, the execution of the command is skipped. Defaults to true.
         */
        'when'?: boolean;
        /**
         * The id of the Pager component.
         */
        'componentId': string;
        /**
         * Number of pages to display. Defaults to all of them.
         */
        'count'?: number | string;
        /**
         * Time to wait between pages (in milliseconds). Defaults to 0.
         */
        'duration'?: number | string;
    }
}
export declare namespace interfaces.alexa.presentation.apl {
    /**
     * Removes focus from the component that is currently in focus.
     * @interface
     */
    interface ClearFocusCommand {
        'type': 'ClearFocus';
        /**
         * The delay in milliseconds before this command starts executing; must be non-negative. Defaults to 0.
         */
        'delay'?: number | string;
        /**
         * A user-provided description of this command.
         */
        'description'?: string;
        /**
         * If true, disable the Interaction Timer.
         */
        'screenLock'?: boolean;
        /**
         * Specify the sequencer that should execute this command.
         */
        'sequencer'?: string;
        /**
         * If false, the execution of the command is skipped. Defaults to true.
         */
        'when'?: boolean;
    }
}
export declare namespace interfaces.alexa.presentation.apl {
    /**
     * Control a media player to play, pause, change tracks, or perform some other common action.
     * @interface
     */
    interface ControlMediaCommand {
        'type': 'ControlMedia';
        /**
         * The delay in milliseconds before this command starts executing; must be non-negative. Defaults to 0.
         */
        'delay'?: number | string;
        /**
         * A user-provided description of this command.
         */
        'description'?: string;
        /**
         * If true, disable the Interaction Timer.
         */
        'screenLock'?: boolean;
        /**
         * Specify the sequencer that should execute this command.
         */
        'sequencer'?: string;
        /**
         * If false, the execution of the command is skipped. Defaults to true.
         */
        'when'?: boolean;
        /**
         * The command to issue on the media player
         */
        'command': interfaces.alexa.presentation.apl.MediaCommandType;
        /**
         * The name of the media playing component
         */
        'componentId'?: string;
        /**
         * Optional data value
         */
        'value'?: number | string;
    }
}
export declare namespace interfaces.alexa.presentation.apl {
    /**
     * Alexa.Presentation.APL.ExecuteCommands directive used to send APL commands to a device.
     * @interface
     */
    interface ExecuteCommandsDirective {
        'type': 'Alexa.Presentation.APL.ExecuteCommands';
        /**
         * List of Command instances
         */
        'commands': Array<interfaces.alexa.presentation.apl.Command>;
        /**
         * A skill defined token, unique for each presentation. Must match the token provided by the skill in the RenderDocument directive used to render the original APL document.
         */
        'token': string;
    }
}
export declare namespace interfaces.alexa.presentation.apl {
    /**
     * The finish command closes the current APL document and exits.
     * @interface
     */
    interface FinishCommand {
        'type': 'Finish';
        /**
         * The delay in milliseconds before this command starts executing; must be non-negative. Defaults to 0.
         */
        'delay'?: number | string;
        /**
         * A user-provided description of this command.
         */
        'description'?: string;
        /**
         * If true, disable the Interaction Timer.
         */
        'screenLock'?: boolean;
        /**
         * Specify the sequencer that should execute this command.
         */
        'sequencer'?: string;
        /**
         * If false, the execution of the command is skipped. Defaults to true.
         */
        'when'?: boolean;
    }
}
export declare namespace interfaces.alexa.presentation.apl {
    /**
     * GoBack command POJO for the backstack APL extension.
     * @interface
     */
    interface GoBackCommand {
        'type': 'GoBack';
        /**
         * The delay in milliseconds before this command starts executing; must be non-negative. Defaults to 0.
         */
        'delay'?: number | string;
        /**
         * A user-provided description of this command.
         */
        'description'?: string;
        /**
         * If true, disable the Interaction Timer.
         */
        'screenLock'?: boolean;
        /**
         * Specify the sequencer that should execute this command.
         */
        'sequencer'?: string;
        /**
         * If false, the execution of the command is skipped. Defaults to true.
         */
        'when'?: boolean;
        'backType': interfaces.alexa.presentation.apl.BackType;
        /**
         * The value of go back command.
         */
        'backValue': string;
    }
}
export declare namespace interfaces.alexa.presentation.apl {
    /**
     * HideOverlay Command used by television shopping skill.
     * @interface
     */
    interface HideOverlayCommand {
        'type': 'HideOverlay';
        /**
         * The delay in milliseconds before this command starts executing; must be non-negative. Defaults to 0.
         */
        'delay'?: number | string;
        /**
         * A user-provided description of this command.
         */
        'description'?: string;
        /**
         * If true, disable the Interaction Timer.
         */
        'screenLock'?: boolean;
        /**
         * Specify the sequencer that should execute this command.
         */
        'sequencer'?: string;
        /**
         * If false, the execution of the command is skipped. Defaults to true.
         */
        'when'?: boolean;
        /**
         * The id of overlay Layout.
         */
        'overlayLayoutId': string;
        /**
         * The id of underlying Layout.
         */
        'underlyingLayoutId'?: string;
        /**
         * The overlay width.
         */
        'overlayWidth'?: string;
        /**
         * The duration of HideOverlay Command.
         */
        'duration'?: number;
    }
}
export declare namespace interfaces.alexa.presentation.apl {
    /**
     * The idle command does nothing. It may be a placeholder or used to insert a calculated delay in a longer series of commands.
     * @interface
     */
    interface IdleCommand {
        'type': 'Idle';
        /**
         * The delay in milliseconds before this command starts executing; must be non-negative. Defaults to 0.
         */
        'delay'?: number | string;
        /**
         * A user-provided description of this command.
         */
        'description'?: string;
        /**
         * If true, disable the Interaction Timer.
         */
        'screenLock'?: boolean;
        /**
         * Specify the sequencer that should execute this command.
         */
        'sequencer'?: string;
        /**
         * If false, the execution of the command is skipped. Defaults to true.
         */
        'when'?: boolean;
    }
}
export declare namespace interfaces.alexa.presentation.apl {
    /**
     * Reports an error with list functionality.
     * @interface
     */
    interface ListRuntimeError {
        'type': 'LIST_ERROR';
        /**
         * A human-readable description of the error.
         */
        'message': string;
        /**
         * The token as specified in the presentation's RenderDocument directive.
         */
        'token'?: string;
        'reason': interfaces.alexa.presentation.apl.ListRuntimeErrorReason;
        /**
         * The identifier of the list in which the error occurred.
         */
        'listId': string;
        /**
         * The listVersion in which the error occurred.
         */
        'listVersion'?: number;
        /**
         * The index of the operation which caused the error (if known)
         */
        'operationIndex'?: number;
    }
}
export declare namespace interfaces.alexa.presentation.apl {
    /**
     * The LoadIndexListData event is sent to the skill to retrieve additional list items.
     * @interface
     */
    interface LoadIndexListDataEvent {
        'type': 'Alexa.Presentation.APL.LoadIndexListData';
        /**
         * Represents the unique identifier for the specific request.
         */
        'requestId': string;
        /**
         * Provides the date and time when Alexa sent the request as an ISO 8601 formatted string. Used to verify the request when hosting your skill as a web service.
         */
        'timestamp': string;
        /**
         * A string indicating the user’s locale. For example: en-US. This value is only provided with certain request types.
         */
        'locale'?: string;
        /**
         * The token as specified in the presentation's RenderDocument directive.
         */
        'token': string;
        /**
         * An identifier generated by a device that is used to correlate requests with their corresponding response directives.
         */
        'correlationToken': string;
        /**
         * The identifier of the list whose items to fetch.
         */
        'listId': string;
        /**
         * The lowest index of the items to fetch (inclusive)
         */
        'startIndex': number;
        /**
         * The number of items to fetch. Examples:  startIndex = 10, count = 2: Skill is expected to return items at indexes 10 and 11. startIndex = -2, count = 5: Skill is expected to return items at indexes -2, -1, 0, 1 and 2
         */
        'count': number;
    }
}
export declare namespace interfaces.alexa.presentation.apl {
    /**
     * The LoadTokenListData event is sent to the skill to retrieve additional list items.
     * @interface
     */
    interface LoadTokenListDataEvent {
        'type': 'Alexa.Presentation.APL.LoadTokenListData';
        /**
         * Represents the unique identifier for the specific request.
         */
        'requestId': string;
        /**
         * Provides the date and time when Alexa sent the request as an ISO 8601 formatted string. Used to verify the request when hosting your skill as a web service.
         */
        'timestamp': string;
        /**
         * A string indicating the user’s locale. For example: en-US. This value is only provided with certain request types.
         */
        'locale'?: string;
        /**
         * The token as specified in the presentation's RenderDocument directive.
         */
        'token': string;
        /**
         * An identifier generated by a device that is used to correlate requests with their corresponding response directives.
         */
        'correlationToken': string;
        /**
         * The identifier of the list whose items to fetch.
         */
        'listId': string;
        /**
         * Opaque token of the array of items to fetch. The skill is expected to be able to identify whether the token represents a forward or backward scroll direction.
         */
        'pageToken': string;
    }
}
export declare namespace interfaces.alexa.presentation.apl {
    /**
     *
     * @interface
     */
    interface MoveTransformProperty {
        /**
         * Distance to translate the object to the right.
         */
        'translateX'?: string;
        /**
         * Distance to translate the object down.
         */
        'translateY'?: string;
    }
}
export declare namespace interfaces.alexa.presentation.apl {
    /**
     * Opens a url with web browser or other application on the device. The APL author is responsible for providing a suitable URL that works on the current device.
     * @interface
     */
    interface OpenUrlCommand {
        'type': 'OpenURL';
        /**
         * The delay in milliseconds before this command starts executing; must be non-negative. Defaults to 0.
         */
        'delay'?: number | string;
        /**
         * A user-provided description of this command.
         */
        'description'?: string;
        /**
         * If true, disable the Interaction Timer.
         */
        'screenLock'?: boolean;
        /**
         * Specify the sequencer that should execute this command.
         */
        'sequencer'?: string;
        /**
         * If false, the execution of the command is skipped. Defaults to true.
         */
        'when'?: boolean;
        /**
         * The URL to open
         */
        'source': string;
        /**
         * Commands to execute if the URL fails to open
         */
        'onFail'?: Array<interfaces.alexa.presentation.apl.Command>;
    }
}
export declare namespace interfaces.alexa.presentation.apl {
    /**
     * Execute a series of commands in parallel. The parallel command starts executing all child command simultaneously. The parallel command is considered finished when all of its child commands have finished. When the parallel command is terminated early, all currently executing commands are terminated.
     * @interface
     */
    interface ParallelCommand {
        'type': 'Parallel';
        /**
         * The delay in milliseconds before this command starts executing; must be non-negative. Defaults to 0.
         */
        'delay'?: number | string;
        /**
         * A user-provided description of this command.
         */
        'description'?: string;
        /**
         * If true, disable the Interaction Timer.
         */
        'screenLock'?: boolean;
        /**
         * Specify the sequencer that should execute this command.
         */
        'sequencer'?: string;
        /**
         * If false, the execution of the command is skipped. Defaults to true.
         */
        'when'?: boolean;
        /**
         * An un-ordered array of commands to execute in parallel. Once all commands have finished executing the parallel command finishes. Please note that the delay of parallel command and the delay of each command are additive.
         */
        'commands': Array<interfaces.alexa.presentation.apl.Command>;
    }
}
export declare namespace interfaces.alexa.presentation.apl {
    /**
     * Plays media on a media player (currently only a Video player; audio may be added in the future). The media may be on the background audio track or may be sequenced with speak directives).
     * @interface
     */
    interface PlayMediaCommand {
        'type': 'PlayMedia';
        /**
         * The delay in milliseconds before this command starts executing; must be non-negative. Defaults to 0.
         */
        'delay'?: number | string;
        /**
         * A user-provided description of this command.
         */
        'description'?: string;
        /**
         * If true, disable the Interaction Timer.
         */
        'screenLock'?: boolean;
        /**
         * Specify the sequencer that should execute this command.
         */
        'sequencer'?: string;
        /**
         * If false, the execution of the command is skipped. Defaults to true.
         */
        'when'?: boolean;
        /**
         * The command to issue on the media player
         */
        'audioTrack'?: interfaces.alexa.presentation.apl.AudioTrack;
        /**
         * The name of the media playing component
         */
        'componentId'?: string;
        /**
         * The media source
         */
        'source': Array<interfaces.alexa.presentation.apl.VideoSource>;
    }
}
export declare namespace interfaces.alexa.presentation.apl {
    /**
     * The reinflate command reinflates the current document with updated configuration properties.
     * @interface
     */
    interface ReinflateCommand {
        'type': 'Reinflate';
        /**
         * The delay in milliseconds before this command starts executing; must be non-negative. Defaults to 0.
         */
        'delay'?: number | string;
        /**
         * A user-provided description of this command.
         */
        'description'?: string;
        /**
         * If true, disable the Interaction Timer.
         */
        'screenLock'?: boolean;
        /**
         * Specify the sequencer that should execute this command.
         */
        'sequencer'?: string;
        /**
         * If false, the execution of the command is skipped. Defaults to true.
         */
        'when'?: boolean;
    }
}
export declare namespace interfaces.alexa.presentation.apl {
    /**
     *
     * @interface
     */
    interface RenderDocumentDirective {
        'type': 'Alexa.Presentation.APL.RenderDocument';
        /**
         * A unique identifier for the presentation.
         */
        'token'?: string;
        /**
         * Depending on the document type, it represents either an entire APL document or a reference Link to the document. In a Link object, the value of the 'src' should follow a URI format defined like 'doc://alexa/apl/documents/<document_id>'. The 'document_id' is a reference to the APL document that the developer stores through APL Authoring Tool.
         */
        'document'?: {
            [key: string]: any;
        };
        /**
         * Data sources to bind to the document when rendering.
         */
        'datasources'?: {
            [key: string]: any;
        };
        /**
         * An object containing named documents or links. These documents can be referenced by the “template” parameter in the transformer.
         */
        'sources'?: {
            [key: string]: any;
        };
        /**
         * A list of packages including layouts, styles, and images etc.
         */
        'packages'?: Array<any>;
    }
}
export declare namespace interfaces.alexa.presentation.apl {
    /**
     *
     * @interface
     */
    interface RotateTransformProperty {
        /**
         * Rotation angle, in degrees. Positive angles rotate in the clockwise direction.
         */
        'rotate'?: number | string;
    }
}
export declare namespace interfaces.alexa.presentation.apl {
    /**
     * Notifies the skill of any errors in APL functionality.
     * @interface
     */
    interface RuntimeErrorEvent {
        'type': 'Alexa.Presentation.APL.RuntimeError';
        /**
         * Represents the unique identifier for the specific request.
         */
        'requestId': string;
        /**
         * Provides the date and time when Alexa sent the request as an ISO 8601 formatted string. Used to verify the request when hosting your skill as a web service.
         */
        'timestamp': string;
        /**
         * A string indicating the user’s locale. For example: en-US. This value is only provided with certain request types.
         */
        'locale'?: string;
        /**
         * The unique identifier of the presentation in which the error occurred.
         */
        'token': string;
        /**
         * An array of errors encountered while running the APL presentation.
         */
        'errors': Array<interfaces.alexa.presentation.apl.RuntimeError>;
    }
}
export declare namespace interfaces.alexa.presentation.apl {
    /**
     *
     * @interface
     */
    interface ScaleTransformProperty {
        /**
         * Uniform scaling in both X and Y.
         */
        'scale'?: number | string;
        /**
         * Scaling in the X direction (overrides “scale” if in same group).
         */
        'scaleX'?: number | string;
        /**
         * Scaling in the Y direction (overrides “scale” if in same group).
         */
        'scaleY'?: number | string;
    }
}
export declare namespace interfaces.alexa.presentation.apl {
    /**
     * Scroll a ScrollView or Sequence forward or backward by a number of pages. The Scroll command has the following properties in addition to the regular command properties.
     * @interface
     */
    interface ScrollCommand {
        'type': 'Scroll';
        /**
         * The delay in milliseconds before this command starts executing; must be non-negative. Defaults to 0.
         */
        'delay'?: number | string;
        /**
         * A user-provided description of this command.
         */
        'description'?: string;
        /**
         * If true, disable the Interaction Timer.
         */
        'screenLock'?: boolean;
        /**
         * Specify the sequencer that should execute this command.
         */
        'sequencer'?: string;
        /**
         * If false, the execution of the command is skipped. Defaults to true.
         */
        'when'?: boolean;
        /**
         * The number of pages to scroll. Defaults to 1.
         */
        'distance'?: number | string;
        /**
         * The id of the component.
         */
        'componentId': string;
    }
}
export declare namespace interfaces.alexa.presentation.apl {
    /**
     * Scroll forward or backward through a ScrollView or Sequence to ensure that a particular component is in view.
     * @interface
     */
    interface ScrollToComponentCommand {
        'type': 'ScrollToComponent';
        /**
         * The delay in milliseconds before this command starts executing; must be non-negative. Defaults to 0.
         */
        'delay'?: number | string;
        /**
         * A user-provided description of this command.
         */
        'description'?: string;
        /**
         * If true, disable the Interaction Timer.
         */
        'screenLock'?: boolean;
        /**
         * Specify the sequencer that should execute this command.
         */
        'sequencer'?: string;
        /**
         * If false, the execution of the command is skipped. Defaults to true.
         */
        'when'?: boolean;
        'align'?: interfaces.alexa.presentation.apl.Align;
        /**
         * The id of the component. If omitted, the component issuing the ScrollToComponent command is used.
         */
        'componentId'?: string;
    }
}
export declare namespace interfaces.alexa.presentation.apl {
    /**
     * Scroll forward or backward through a ScrollView or Sequence to ensure that a particular child component is in view.
     * @interface
     */
    interface ScrollToIndexCommand {
        'type': 'ScrollToIndex';
        /**
         * The delay in milliseconds before this command starts executing; must be non-negative. Defaults to 0.
         */
        'delay'?: number | string;
        /**
         * A user-provided description of this command.
         */
        'description'?: string;
        /**
         * If true, disable the Interaction Timer.
         */
        'screenLock'?: boolean;
        /**
         * Specify the sequencer that should execute this command.
         */
        'sequencer'?: string;
        /**
         * If false, the execution of the command is skipped. Defaults to true.
         */
        'when'?: boolean;
        'align'?: interfaces.alexa.presentation.apl.Align;
        /**
         * The id of the component.
         */
        'componentId': string;
        /**
         * The 0-based index of the child to display.
         */
        'index': number | string;
    }
}
export declare namespace interfaces.alexa.presentation.apl {
    /**
     * Select a single command from an array of commands and data.
     * @interface
     */
    interface SelectCommand {
        'type': 'Select';
        /**
         * The delay in milliseconds before this command starts executing; must be non-negative. Defaults to 0.
         */
        'delay'?: number | string;
        /**
         * A user-provided description of this command.
         */
        'description'?: string;
        /**
         * If true, disable the Interaction Timer.
         */
        'screenLock'?: boolean;
        /**
         * Specify the sequencer that should execute this command.
         */
        'sequencer'?: string;
        /**
         * If false, the execution of the command is skipped. Defaults to true.
         */
        'when'?: boolean;
        /**
         * An ordered list of commands to select from.
         */
        'commands': Array<interfaces.alexa.presentation.apl.Command>;
        /**
         * A list of data to map against the commands.
         */
        'data'?: Array<any>;
        /**
         * Commands to execute if nothing else runs.
         */
        'otherwise'?: Array<interfaces.alexa.presentation.apl.Command>;
    }
}
export declare namespace interfaces.alexa.presentation.apl {
    /**
     * The SendEvent command allows the APL author to generate and send an event to Alexa.
     * @interface
     */
    interface SendEventCommand {
        'type': 'SendEvent';
        /**
         * The delay in milliseconds before this command starts executing; must be non-negative. Defaults to 0.
         */
        'delay'?: number | string;
        /**
         * A user-provided description of this command.
         */
        'description'?: string;
        /**
         * If true, disable the Interaction Timer.
         */
        'screenLock'?: boolean;
        /**
         * Specify the sequencer that should execute this command.
         */
        'sequencer'?: string;
        /**
         * If false, the execution of the command is skipped. Defaults to true.
         */
        'when'?: boolean;
        /**
         * An array of argument data to pass to Alexa.
         */
        'arguments'?: Array<string>;
        /**
         * An array of components to extract value data from and provide to Alexa.
         */
        'components'?: Array<string>;
    }
}
export declare namespace interfaces.alexa.presentation.apl {
    /**
     * Returned in response to a LoadIndexListData event, containing the requested items and metadata for further interaction.
     * @interface
     */
    interface SendIndexListDataDirective {
        'type': 'Alexa.Presentation.APL.SendIndexListData';
        /**
         * The correlation token supplied in the LoadTokenListData event. This parameter is mandatory if the skill is responding to a LoadIndexListData request, the skill response will be rejected if the expected correlationToken is not specified.
         */
        'correlationToken'?: string;
        /**
         * The identifier of the list whose items are contained in this response.
         */
        'listId': string;
        /**
         * The new version of the list after loading the items supplied in this directive. List versions increase sequentially, implicitly starting at 0 for the definition specified in the presentation's RenderDocument directive.
         */
        'listVersion'?: number;
        /**
         * Index of the first element in the items array.
         */
        'startIndex': number;
        /**
         * The index of the 1st item in the skill-managed array. When populated, this value replaces any value that was specified in a previous interaction. Continued absence of this property indicates that the minimum index is not yet known and further backwards scrolling is possible. If this is equal to the index of the 1st item returned then no further backwards scrolling is possible.
         */
        'minimumInclusiveIndex'?: number;
        /**
         * The last valid index of the skill-managed array plus one, i.e. exclusive value. When populated, this value replaces any value that was specified in a previous interaction. Continued absence of this property indicates that the maximum index is not yet known and further forwards scrolling is possible. If this is one more than the index of the last item returned then no further forwards scrolling is possible.
         */
        'maximumExclusiveIndex'?: number;
        /**
         * Array of objects to be added to the device cache.
         */
        'items'?: Array<any>;
    }
}
export declare namespace interfaces.alexa.presentation.apl {
    /**
     * Returned in response to a LoadTokenListData event, containing the requested items and metadata for further interaction.
     * @interface
     */
    interface SendTokenListDataDirective {
        'type': 'Alexa.Presentation.APL.SendTokenListData';
        /**
         * The correlation token supplied in the LoadTokenListData event. This parameter is mandatory if the skill is responding to a LoadTokenListData request, the skill response will be rejected if the expected correlationToken is not specified.
         */
        'correlationToken'?: string;
        /**
         * The identifier of the list whose items are contained in this response.
         */
        'listId': string;
        /**
         * Opaque token for the array of items which are contained in this response. Ignored by the system if correlationToken is specified, but considered less cognitive overhead to have the developer always include & assists platform debugging.
         */
        'pageToken': string;
        /**
         * Opaque token to retrieve the next page of list items data. Absence of this property indicates that the last item in the list has been reached in the scroll direction.
         */
        'nextPageToken'?: string;
        /**
         * Array of objects to be added to the device cache.
         */
        'items'?: Array<any>;
    }
}
export declare namespace interfaces.alexa.presentation.apl {
    /**
     * A sequential command executes a series of commands in order. The sequential command executes the command list in order, waiting for the previous command to finish before executing the next. The sequential command is finished when all of its child commands have finished. When the Sequential command is terminated early, the currently executing command is terminated and no further commands are executed.
     * @interface
     */
    interface SequentialCommand {
        'type': 'Sequential';
        /**
         * The delay in milliseconds before this command starts executing; must be non-negative. Defaults to 0.
         */
        'delay'?: number | string;
        /**
         * A user-provided description of this command.
         */
        'description'?: string;
        /**
         * If true, disable the Interaction Timer.
         */
        'screenLock'?: boolean;
        /**
         * Specify the sequencer that should execute this command.
         */
        'sequencer'?: string;
        /**
         * If false, the execution of the command is skipped. Defaults to true.
         */
        'when'?: boolean;
        /**
         * An ordered list of commands to execute if this sequence is prematurely terminated.
         */
        'catch'?: Array<interfaces.alexa.presentation.apl.Command>;
        /**
         * An array of commands to execute. The commands execute in order; each command must finish before the next can begin. Please note that the delay of sequential command and the delay of the first command in the sequence are additive.
         */
        'commands': Array<interfaces.alexa.presentation.apl.Command>;
        /**
         * An ordered list of commands to execute after the normal commands and the catch commands.
         */
        'finally'?: Array<interfaces.alexa.presentation.apl.Command>;
        /**
         * The number of times to repeat this series of commands. Defaults to 0. Negative values will be ignored. Note that the delay assigned to overall sequential command only applies the first time. For example, in the sample sequential command below the first SendEvent fires at 3000 milliseconds, the second at 5000, the first SendEvent fires again at 7000 milliseconds, and so forth. {\"type\": \"Sequential\",\"delay\": 1000,\"repeatCount\": 2,\"commands\": [{ \"type\": \"SendEvent\",\"delay\": 2000},{\"type\": \"SendEvent\",\"delay\": 2000}]}
         */
        'repeatCount'?: number | string;
    }
}
export declare namespace interfaces.alexa.presentation.apl {
    /**
     * Changes the actionable component that is in focus. Only one component may have focus at a time.
     * @interface
     */
    interface SetFocusCommand {
        'type': 'SetFocus';
        /**
         * The delay in milliseconds before this command starts executing; must be non-negative. Defaults to 0.
         */
        'delay'?: number | string;
        /**
         * A user-provided description of this command.
         */
        'description'?: string;
        /**
         * If true, disable the Interaction Timer.
         */
        'screenLock'?: boolean;
        /**
         * Specify the sequencer that should execute this command.
         */
        'sequencer'?: string;
        /**
         * If false, the execution of the command is skipped. Defaults to true.
         */
        'when'?: boolean;
        /**
         * The ID of the component to set focus on.
         */
        'componentId': string;
    }
}
export declare namespace interfaces.alexa.presentation.apl {
    /**
     * Change the page displayed in a Pager component. The SetPage command finishes when the item is fully in view.
     * @interface
     */
    interface SetPageCommand {
        'type': 'SetPage';
        /**
         * The delay in milliseconds before this command starts executing; must be non-negative. Defaults to 0.
         */
        'delay'?: number | string;
        /**
         * A user-provided description of this command.
         */
        'description'?: string;
        /**
         * If true, disable the Interaction Timer.
         */
        'screenLock'?: boolean;
        /**
         * Specify the sequencer that should execute this command.
         */
        'sequencer'?: string;
        /**
         * If false, the execution of the command is skipped. Defaults to true.
         */
        'when'?: boolean;
        /**
         * The id of the Pager component.
         */
        'componentId': string;
        'position'?: interfaces.alexa.presentation.apl.Position;
        /**
         * The distance to move. May be an absolute value or a relative value.
         */
        'value': number | string;
    }
}
export declare namespace interfaces.alexa.presentation.apl {
    /**
     * The SetState command changes one of the component’s state settings. The SetState command can be used to change the checked, disabled, and focused states. The karaoke and pressed states may not be directly set; use the Select command or SpeakItem commands to change those states. Also, note that the focused state may only be set - it can’t be cleared.
     * @interface
     */
    interface SetStateCommand {
        'type': 'SetState';
        /**
         * The delay in milliseconds before this command starts executing; must be non-negative. Defaults to 0.
         */
        'delay'?: number | string;
        /**
         * A user-provided description of this command.
         */
        'description'?: string;
        /**
         * If true, disable the Interaction Timer.
         */
        'screenLock'?: boolean;
        /**
         * Specify the sequencer that should execute this command.
         */
        'sequencer'?: string;
        /**
         * If false, the execution of the command is skipped. Defaults to true.
         */
        'when'?: boolean;
        /**
         * The id of the component whose value should be set.
         */
        'componentId'?: string;
        /**
         * The name of the state to set. Must be one of “checked”, “disabled”, and “focused”.
         */
        'state': interfaces.alexa.presentation.apl.ComponentState;
        /**
         * The value to set on the property
         */
        'value': boolean | string;
    }
}
export declare namespace interfaces.alexa.presentation.apl {
    /**
     * Change a dynamic property of a component without redrawing the screen.
     * @interface
     */
    interface SetValueCommand {
        'type': 'SetValue';
        /**
         * The delay in milliseconds before this command starts executing; must be non-negative. Defaults to 0.
         */
        'delay'?: number | string;
        /**
         * A user-provided description of this command.
         */
        'description'?: string;
        /**
         * If true, disable the Interaction Timer.
         */
        'screenLock'?: boolean;
        /**
         * Specify the sequencer that should execute this command.
         */
        'sequencer'?: string;
        /**
         * If false, the execution of the command is skipped. Defaults to true.
         */
        'when'?: boolean;
        /**
         * The id of the component whose value to set.
         */
        'componentId'?: string;
        /**
         * The name of the property to set.
         */
        'property': string;
        /**
         * The property value to set.
         */
        'value': string;
    }
}
export declare namespace interfaces.alexa.presentation.apl {
    /**
     * ShowOverlay Command used by television shopping skill.
     * @interface
     */
    interface ShowOverlayCommand {
        'type': 'ShowOverlay';
        /**
         * The delay in milliseconds before this command starts executing; must be non-negative. Defaults to 0.
         */
        'delay'?: number | string;
        /**
         * A user-provided description of this command.
         */
        'description'?: string;
        /**
         * If true, disable the Interaction Timer.
         */
        'screenLock'?: boolean;
        /**
         * Specify the sequencer that should execute this command.
         */
        'sequencer'?: string;
        /**
         * If false, the execution of the command is skipped. Defaults to true.
         */
        'when'?: boolean;
        /**
         * The id of overlay Layout.
         */
        'overlayLayoutId': string;
        /**
         * The id of underlying Layout.
         */
        'underlyingLayoutId'?: string;
        /**
         * The overlay width.
         */
        'overlayWidth'?: string;
        /**
         * The duration of ShowOverlay Command.
         */
        'duration'?: number;
    }
}
export declare namespace interfaces.alexa.presentation.apl {
    /**
     *
     * @interface
     */
    interface SkewTransformProperty {
        /**
         * Skew angle for the X-axis, in degrees. X-axis lines remain horizontal.
         */
        'skewX'?: number | string;
        /**
         * Skew angle for the Y-axis, in degrees. Y-axis lines remain vertical.
         */
        'skewY'?: number | string;
    }
}
export declare namespace interfaces.alexa.presentation.apl {
    /**
     * Reads the contents of a single item on the screen. By default the item will be scrolled into view if it is not currently visible.
     * @interface
     */
    interface SpeakItemCommand {
        'type': 'SpeakItem';
        /**
         * The delay in milliseconds before this command starts executing; must be non-negative. Defaults to 0.
         */
        'delay'?: number | string;
        /**
         * A user-provided description of this command.
         */
        'description'?: string;
        /**
         * If true, disable the Interaction Timer.
         */
        'screenLock'?: boolean;
        /**
         * Specify the sequencer that should execute this command.
         */
        'sequencer'?: string;
        /**
         * If false, the execution of the command is skipped. Defaults to true.
         */
        'when'?: boolean;
        'align'?: interfaces.alexa.presentation.apl.Align;
        /**
         * The id of the component to speak.
         */
        'componentId': string;
        'highlightMode'?: interfaces.alexa.presentation.apl.HighlightMode;
        /**
         * The minimum number of milliseconds that an item should be highlighted for. Defaults to 0.
         */
        'minimumDwellTime'?: number | string;
    }
}
export declare namespace interfaces.alexa.presentation.apl {
    /**
     * Read the contents of a range of items inside a common container. Each item will scroll into view before speech. Each item should have a speech property, but it is not required.
     * @interface
     */
    interface SpeakListCommand {
        'type': 'SpeakList';
        /**
         * The delay in milliseconds before this command starts executing; must be non-negative. Defaults to 0.
         */
        'delay'?: number | string;
        /**
         * A user-provided description of this command.
         */
        'description'?: string;
        /**
         * If true, disable the Interaction Timer.
         */
        'screenLock'?: boolean;
        /**
         * Specify the sequencer that should execute this command.
         */
        'sequencer'?: string;
        /**
         * If false, the execution of the command is skipped. Defaults to true.
         */
        'when'?: boolean;
        'align'?: interfaces.alexa.presentation.apl.Align;
        /**
         * The id of the component to read.
         */
        'componentId': string;
        /**
         * The number of items to speak
         */
        'count': number | string;
        /**
         * The minimum number of milliseconds that an item will be highlighted for. Defaults to 0.
         */
        'minimumDwellTime'?: number | string;
        /**
         * The 0-based index of the first item to speak
         */
        'start': number | string;
    }
}
export declare namespace interfaces.alexa.presentation.apl {
    /**
     * Updates the content of an dynamicIndexList datasource which has been previously communicated to an Alexa device.
     * @interface
     */
    interface UpdateIndexListDataDirective {
        'type': 'Alexa.Presentation.APL.UpdateIndexListData';
        /**
         * The unique identifier for the presentation containing the dynamicIndexList.
         */
        'token': string;
        /**
         * The identifier of the dynamicIndexList to update.
         */
        'listId': string;
        /**
         * The new version of the list after applying the updates specified in this directive. List versions increase sequentially, implicitly starting at 0 for the definition specified in the presentation's RenderDocument directive.
         */
        'listVersion': number;
        /**
         * An array of changes which are to be applied to the items in the dynamicIndexList.
         */
        'operations': Array<interfaces.alexa.presentation.apl.listoperations.Operation>;
    }
}
export declare namespace interfaces.alexa.presentation.apl {
    /**
     *
     * @interface
     */
    interface UserEvent {
        'type': 'Alexa.Presentation.APL.UserEvent';
        /**
         * Represents the unique identifier for the specific request.
         */
        'requestId': string;
        /**
         * Provides the date and time when Alexa sent the request as an ISO 8601 formatted string. Used to verify the request when hosting your skill as a web service.
         */
        'timestamp': string;
        /**
         * A string indicating the user’s locale. For example: en-US. This value is only provided with certain request types.
         */
        'locale'?: string;
        /**
         * A unique token for the active presentation.
         */
        'token'?: string;
        /**
         * The array of argument data to pass to Alexa.
         */
        'arguments'?: Array<any>;
        /**
         * Meta-information about what caused the event to be generated.
         */
        'source'?: any;
        /**
         * Components associated with the request.
         */
        'components'?: any;
    }
}
export declare namespace interfaces.alexa.presentation.apl.listoperations {
    /**
     * Deletes an item at a specified index in a dynamicIndexList.
     * @interface
     */
    interface DeleteItemOperation {
        'type': 'DeleteItem';
        /**
         * The position of the item in the dynamicIndexList to which the operation is to be applied. For inserts and deletes that operate on multiple items, this value represents the starting index, with onward inserts/deletes applying to consecutively increasing positions.
         */
        'index': number;
    }
}
export declare namespace interfaces.alexa.presentation.apl.listoperations {
    /**
     * Deletes items at consecutive indexes in a dynamicIndexList.
     * @interface
     */
    interface DeleteMultipleItemsOperation {
        'type': 'DeleteMultipleItems';
        /**
         * The position of the item in the dynamicIndexList to which the operation is to be applied. For inserts and deletes that operate on multiple items, this value represents the starting index, with onward inserts/deletes applying to consecutively increasing positions.
         */
        'index': number;
        /**
         * The number of items to delete.
         */
        'count': number;
    }
}
export declare namespace interfaces.alexa.presentation.apl.listoperations {
    /**
     * Inserts a new item at a specified index in a dynamicIndexList.
     * @interface
     */
    interface InsertItemOperation {
        'type': 'InsertItem';
        /**
         * The position of the item in the dynamicIndexList to which the operation is to be applied. For inserts and deletes that operate on multiple items, this value represents the starting index, with onward inserts/deletes applying to consecutively increasing positions.
         */
        'index': number;
        /**
         * The new item to be inserted.
         */
        'item': any;
    }
}
export declare namespace interfaces.alexa.presentation.apl.listoperations {
    /**
     * Inserts an array of items into consecutive indexes in a dynamicIndexList.
     * @interface
     */
    interface InsertMultipleItemsOperation {
        'type': 'InsertMultipleItems';
        /**
         * The position of the item in the dynamicIndexList to which the operation is to be applied. For inserts and deletes that operate on multiple items, this value represents the starting index, with onward inserts/deletes applying to consecutively increasing positions.
         */
        'index': number;
        /**
         * The new items to be inserted.
         */
        'items': Array<any>;
    }
}
export declare namespace interfaces.alexa.presentation.apl.listoperations {
    /**
     * Sets an item at a specified index in a dynamicIndexList.
     * @interface
     */
    interface SetItemOperation {
        'type': 'SetItem';
        /**
         * The position of the item in the dynamicIndexList to which the operation is to be applied. For inserts and deletes that operate on multiple items, this value represents the starting index, with onward inserts/deletes applying to consecutively increasing positions.
         */
        'index': number;
        /**
         * The replacement item.
         */
        'item': any;
    }
}
export declare namespace interfaces.alexa.presentation.apla {
    /**
     * This error type occurs when the cloud fails to retrieve an audio file from a remote source, such as one specified from within an Audio component.
     * @interface
     */
    interface AudioSourceRuntimeError {
        'type': 'AUDIO_SOURCE_ERROR';
        /**
         * A human-readable description of the error.
         */
        'message': string;
        'reason': interfaces.alexa.presentation.apla.AudioSourceErrorReason;
    }
}
export declare namespace interfaces.alexa.presentation.apla {
    /**
     * This error type occurs when the cloud fails to render due to an incorrect or malformed document or data sources.
     * @interface
     */
    interface DocumentRuntimeError {
        'type': 'DOCUMENT_ERROR';
        /**
         * A human-readable description of the error.
         */
        'message': string;
        'reason': interfaces.alexa.presentation.apla.DocumentErrorReason;
    }
}
export declare namespace interfaces.alexa.presentation.apla {
    /**
     * This error type occurs when the cloud fails to execute a Link typed document.
     * @interface
     */
    interface LinkRuntimeError {
        'type': 'LINK_ERROR';
        /**
         * A human-readable description of the error.
         */
        'message': string;
        'reason': interfaces.alexa.presentation.apla.LinkErrorReason;
    }
}
export declare namespace interfaces.alexa.presentation.apla {
    /**
     *
     * @interface
     */
    interface RenderDocumentDirective {
        'type': 'Alexa.Presentation.APLA.RenderDocument';
        /**
         * A unique identifier for the presentation.
         */
        'token'?: string;
        /**
         * Depending on the document type, it represents either an entire APLA document or a reference Link to the document. In a Link object, the value of the 'src' should follow a URI format defined like 'doc://alexa/apla/documents/<document_id>'. The 'document_id' is a reference to the APLA document that the developer stores through APLA Authoring Tool.
         */
        'document'?: {
            [key: string]: any;
        };
        /**
         * Data sources to bind to the document when rendering.
         */
        'datasources'?: {
            [key: string]: any;
        };
    }
}
export declare namespace interfaces.alexa.presentation.apla {
    /**
     * This error type occurs when the the cloud based audio mixing service fails to render the audio due to service or user failure.
     * @interface
     */
    interface RenderRuntimeError {
        'type': 'RENDER_ERROR';
        /**
         * A human-readable description of the error.
         */
        'message': string;
        'reason': interfaces.alexa.presentation.apla.RenderErrorReason;
    }
}
export declare namespace interfaces.alexa.presentation.apla {
    /**
     * Notifies the skill of any errors in APLA functionality.
     * @interface
     */
    interface RuntimeErrorEvent {
        'type': 'Alexa.Presentation.APLA.RuntimeError';
        /**
         * Represents the unique identifier for the specific request.
         */
        'requestId': string;
        /**
         * Provides the date and time when Alexa sent the request as an ISO 8601 formatted string. Used to verify the request when hosting your skill as a web service.
         */
        'timestamp': string;
        /**
         * A string indicating the user’s locale. For example: en-US. This value is only provided with certain request types.
         */
        'locale'?: string;
        /**
         * The unique identifier of the presentation in which the error occurred.
         */
        'token': string;
        /**
         * An array of errors encountered while running the APLA presentation.
         */
        'errors': Array<interfaces.alexa.presentation.apla.RuntimeError>;
    }
}
export declare namespace interfaces.alexa.presentation.aplt {
    /**
     * Automatically progress through a series of pages displayed in a Pager component. The AutoPage command finishes after the last page has been displayed for the requested time period.
     * @interface
     */
    interface AutoPageCommand {
        'type': 'AutoPage';
        /**
         * The delay in milliseconds before this command starts executing; must be non-negative. Defaults to 0.
         */
        'delay'?: number;
        /**
         * A user-provided description of this command.
         */
        'description'?: string;
        /**
         * If true, disable the Interaction Timer.
         */
        'screenLock'?: boolean;
        /**
         * A conditional expression to be evaluated in device. If false, the execution of the command is skipped. Defaults to true.
         */
        'when'?: boolean | string;
        /**
         * The id of the Pager component.
         */
        'componentId': string;
        /**
         * Number of pages to display. Defaults to all of them.
         */
        'count'?: number | string;
        /**
         * Time to wait between pages (in milliseconds). Defaults to 0.
         */
        'duration'?: number | string;
    }
}
export declare namespace interfaces.alexa.presentation.aplt {
    /**
     * Alexa.Presentation.APLT.ExecuteCommands directive used to send APL-T commands to a device.
     * @interface
     */
    interface ExecuteCommandsDirective {
        'type': 'Alexa.Presentation.APLT.ExecuteCommands';
        /**
         * List of Command instances
         */
        'commands': Array<interfaces.alexa.presentation.aplt.Command>;
        /**
         * A skill defined token, unique for each presentation. Must match the token provided by the skill in the RenderDocument directive used to render the original APL document.
         */
        'token': string;
    }
}
export declare namespace interfaces.alexa.presentation.aplt {
    /**
     * The idle command does nothing. It may be a placeholder or used to insert a calculated delay in a longer series of commands.
     * @interface
     */
    interface IdleCommand {
        'type': 'Idle';
        /**
         * The delay in milliseconds before this command starts executing; must be non-negative. Defaults to 0.
         */
        'delay'?: number;
        /**
         * A user-provided description of this command.
         */
        'description'?: string;
        /**
         * If true, disable the Interaction Timer.
         */
        'screenLock'?: boolean;
        /**
         * A conditional expression to be evaluated in device. If false, the execution of the command is skipped. Defaults to true.
         */
        'when'?: boolean | string;
    }
}
export declare namespace interfaces.alexa.presentation.aplt {
    /**
     * Execute a series of commands in parallel. The parallel command starts executing all child command simultaneously. The parallel command is considered finished when all of its child commands have finished. When the parallel command is terminated early, all currently executing commands are terminated.
     * @interface
     */
    interface ParallelCommand {
        'type': 'Parallel';
        /**
         * The delay in milliseconds before this command starts executing; must be non-negative. Defaults to 0.
         */
        'delay'?: number;
        /**
         * A user-provided description of this command.
         */
        'description'?: string;
        /**
         * If true, disable the Interaction Timer.
         */
        'screenLock'?: boolean;
        /**
         * A conditional expression to be evaluated in device. If false, the execution of the command is skipped. Defaults to true.
         */
        'when'?: boolean | string;
        /**
         * An un-ordered array of commands to execute in parallel. Once all commands have finished executing the parallel command finishes. Please note that the delay of parallel command and the delay of each command are additive.
         */
        'commands': Array<interfaces.alexa.presentation.aplt.Command>;
    }
}
export declare namespace interfaces.alexa.presentation.aplt {
    /**
     *
     * @interface
     */
    interface RenderDocumentDirective {
        'type': 'Alexa.Presentation.APLT.RenderDocument';
        /**
         * A unique identifier for the presentation.
         */
        'token'?: string;
        /**
         * One of supported profiles in character display. Default value is NONE.
         */
        'targetProfile'?: interfaces.alexa.presentation.aplt.TargetProfile;
        /**
         * Depending on the document type, it represents either an entire APLT document or a reference Link to the document. In a Link object, the value of the 'src' should follow a URI format defined like 'doc://alexa/aplt/documents/<document_id>'. The 'document_id' is a reference to the APLT document that the developer stores through APL Authoring Tool.
         */
        'document'?: {
            [key: string]: any;
        };
        /**
         * Data sources to bind to the document when rendering.
         */
        'datasources'?: {
            [key: string]: any;
        };
    }
}
export declare namespace interfaces.alexa.presentation.aplt {
    /**
     * Scroll a ScrollView or Sequence forward or backward by a number of pages. The Scroll command has the following properties in addition to the regular command properties.
     * @interface
     */
    interface ScrollCommand {
        'type': 'Scroll';
        /**
         * The delay in milliseconds before this command starts executing; must be non-negative. Defaults to 0.
         */
        'delay'?: number;
        /**
         * A user-provided description of this command.
         */
        'description'?: string;
        /**
         * If true, disable the Interaction Timer.
         */
        'screenLock'?: boolean;
        /**
         * A conditional expression to be evaluated in device. If false, the execution of the command is skipped. Defaults to true.
         */
        'when'?: boolean | string;
        /**
         * The number of pages to scroll. Defaults to 1.
         */
        'distance'?: number | string;
        /**
         * The id of the component.
         */
        'componentId': string;
    }
}
export declare namespace interfaces.alexa.presentation.aplt {
    /**
     * The SendEvent command allows the APL author to generate and send an event to Alexa.
     * @interface
     */
    interface SendEventCommand {
        'type': 'SendEvent';
        /**
         * The delay in milliseconds before this command starts executing; must be non-negative. Defaults to 0.
         */
        'delay'?: number;
        /**
         * A user-provided description of this command.
         */
        'description'?: string;
        /**
         * If true, disable the Interaction Timer.
         */
        'screenLock'?: boolean;
        /**
         * A conditional expression to be evaluated in device. If false, the execution of the command is skipped. Defaults to true.
         */
        'when'?: boolean | string;
        /**
         * An array of argument data to pass to Alexa.
         */
        'arguments'?: Array<string>;
        /**
         * An array of components to extract value data from and provide to Alexa.
         */
        'components'?: Array<string>;
    }
}
export declare namespace interfaces.alexa.presentation.aplt {
    /**
     * A sequential command executes a series of commands in order. The sequential command executes the command list in order, waiting for the previous command to finish before executing the next. The sequential command is finished when all of its child commands have finished. When the Sequential command is terminated early, the currently executing command is terminated and no further commands are executed.
     * @interface
     */
    interface SequentialCommand {
        'type': 'Sequential';
        /**
         * The delay in milliseconds before this command starts executing; must be non-negative. Defaults to 0.
         */
        'delay'?: number;
        /**
         * A user-provided description of this command.
         */
        'description'?: string;
        /**
         * If true, disable the Interaction Timer.
         */
        'screenLock'?: boolean;
        /**
         * A conditional expression to be evaluated in device. If false, the execution of the command is skipped. Defaults to true.
         */
        'when'?: boolean | string;
        /**
         * An ordered list of commands to execute if this sequence is prematurely terminated.
         */
        'catch'?: Array<interfaces.alexa.presentation.aplt.Command>;
        /**
         * An array of commands to execute. The commands execute in order; each command must finish before the next can begin. Please note that the delay of sequential command and the delay of the first command in the sequence are additive.
         */
        'commands': Array<interfaces.alexa.presentation.aplt.Command>;
        /**
         * An ordered list of commands to execute after the normal commands and the catch commands.
         */
        'finally'?: Array<interfaces.alexa.presentation.aplt.Command>;
        /**
         * The number of times to repeat this series of commands. Defaults to 0. Negative values will be ignored. Note that the delay assigned to overall sequential command only applies the first time. For example, in the sample sequential command below the first SendEvent fires at 3000 milliseconds, the second at 5000, the first SendEvent fires again at 7000 milliseconds, and so forth. {\"type\": \"Sequential\",\"delay\": 1000,\"repeatCount\": 2,\"commands\": [{ \"type\": \"SendEvent\",\"delay\": 2000},{\"type\": \"SendEvent\",\"delay\": 2000}]}
         */
        'repeatCount'?: number | string;
    }
}
export declare namespace interfaces.alexa.presentation.aplt {
    /**
     * Change the page displayed in a Pager component. The SetPage command finishes when the item is fully in view.
     * @interface
     */
    interface SetPageCommand {
        'type': 'SetPage';
        /**
         * The delay in milliseconds before this command starts executing; must be non-negative. Defaults to 0.
         */
        'delay'?: number;
        /**
         * A user-provided description of this command.
         */
        'description'?: string;
        /**
         * If true, disable the Interaction Timer.
         */
        'screenLock'?: boolean;
        /**
         * A conditional expression to be evaluated in device. If false, the execution of the command is skipped. Defaults to true.
         */
        'when'?: boolean | string;
        /**
         * The id of the Pager component.
         */
        'componentId': string;
        'position'?: interfaces.alexa.presentation.aplt.Position;
        /**
         * The distance to move. May be an absolute value or a relative value.
         */
        'value': number | string;
    }
}
export declare namespace interfaces.alexa.presentation.aplt {
    /**
     * Change a dynamic property of a component without redrawing the screen.
     * @interface
     */
    interface SetValueCommand {
        'type': 'SetValue';
        /**
         * The delay in milliseconds before this command starts executing; must be non-negative. Defaults to 0.
         */
        'delay'?: number;
        /**
         * A user-provided description of this command.
         */
        'description'?: string;
        /**
         * If true, disable the Interaction Timer.
         */
        'screenLock'?: boolean;
        /**
         * A conditional expression to be evaluated in device. If false, the execution of the command is skipped. Defaults to true.
         */
        'when'?: boolean | string;
        /**
         * The id of the component whose value to set.
         */
        'componentId'?: string;
        /**
         * The name of the property to set.
         */
        'property': string;
        /**
         * The property value to set.
         */
        'value': string;
    }
}
export declare namespace interfaces.alexa.presentation.aplt {
    /**
     *
     * @interface
     */
    interface UserEvent {
        'type': 'Alexa.Presentation.APLT.UserEvent';
        /**
         * Represents the unique identifier for the specific request.
         */
        'requestId': string;
        /**
         * Provides the date and time when Alexa sent the request as an ISO 8601 formatted string. Used to verify the request when hosting your skill as a web service.
         */
        'timestamp': string;
        /**
         * A string indicating the user’s locale. For example: en-US. This value is only provided with certain request types.
         */
        'locale'?: string;
        /**
         * A unique token for the active presentation.
         */
        'token'?: string;
        /**
         * The array of argument data to pass to Alexa.
         */
        'arguments'?: Array<any>;
        /**
         * Meta-information about what caused the event to be generated.
         */
        'source'?: any;
    }
}
export declare namespace interfaces.alexa.presentation.html {
    /**
     * The HandleMessage directive sends a message to a skill's web application that runs on the device browser.
     * @interface
     */
    interface HandleMessageDirective {
        'type': 'Alexa.Presentation.HTML.HandleMessage';
        /**
         * A free-form object containing data to deliver to a skill's HTML application running the device. Maximum size 18 KB.
         */
        'message': any;
        /**
         * An array of objects for performing text-to-speech transformations with message data
         */
        'transformers'?: Array<interfaces.alexa.presentation.html.Transformer>;
    }
}
export declare namespace interfaces.alexa.presentation.html {
    /**
     * The Message request sends a message to the skill lambda.
     * @interface
     */
    interface MessageRequest {
        'type': 'Alexa.Presentation.HTML.Message';
        /**
         * Represents the unique identifier for the specific request.
         */
        'requestId': string;
        /**
         * Provides the date and time when Alexa sent the request as an ISO 8601 formatted string. Used to verify the request when hosting your skill as a web service.
         */
        'timestamp': string;
        /**
         * A string indicating the user’s locale. For example: en-US. This value is only provided with certain request types.
         */
        'locale'?: string;
        /**
         * A free-form object containing data from a skill's HTML application to deliver to the Alexa cloud. Maximum size 18 KB.
         */
        'message': any;
    }
}
export declare namespace interfaces.alexa.presentation.html {
    /**
     * The RuntimeError request occurs when the device software encounters an error with loading a skill's web application.
     * @interface
     */
    interface RuntimeErrorRequest {
        'type': 'Alexa.Presentation.HTML.RuntimeError';
        /**
         * Represents the unique identifier for the specific request.
         */
        'requestId': string;
        /**
         * Provides the date and time when Alexa sent the request as an ISO 8601 formatted string. Used to verify the request when hosting your skill as a web service.
         */
        'timestamp': string;
        /**
         * A string indicating the user’s locale. For example: en-US. This value is only provided with certain request types.
         */
        'locale'?: string;
        'error': interfaces.alexa.presentation.html.RuntimeError;
    }
}
export declare namespace interfaces.alexa.presentation.html {
    /**
     * The Start directive provides the data necessary to load an HTML page on the target device.
     * @interface
     */
    interface StartDirective {
        'type': 'Alexa.Presentation.HTML.Start';
        /**
         * Optional startup data which will be made available to the runtime for skill startup. Maximum size: 18 KB
         */
        'data'?: any;
        /**
         * An array of objects for performing text-to-speech transformations with message data
         */
        'transformers'?: Array<interfaces.alexa.presentation.html.Transformer>;
        'request': interfaces.alexa.presentation.html.StartRequest;
        'configuration': interfaces.alexa.presentation.html.Configuration;
    }
}
export declare namespace interfaces.alexa.smartvision.snapshotprovider {
    /**
     * This directive is used to request latest snapshot from camera skill on a particular endpoint.
     * @interface
     */
    interface GetSnapshotDirective {
        'type': 'Alexa.SmartVision.SnapshotProvider.GetSnapshotDirective';
        /**
         * This property defines that an on-demand snapshot is preferred over  a cached snapshot from camera skill.
         */
        'preferOnDemandSnapshot'?: boolean;
    }
}
export declare namespace interfaces.amazonpay.model.request {
    /**
     * This is an object to set the attributes specified in the AuthorizeAttributes table. See the “AuthorizationDetails” section of the Amazon Pay API reference guide for details about this object.
     * @interface
     */
    interface AuthorizeAttributes {
        '@type': 'AuthorizeAttributes';
        /**
         * This is 3P seller's identifier for this authorization transaction. This identifier must be unique for all of your authorization transactions.
         */
        'authorizationReferenceId': string;
        'authorizationAmount': interfaces.amazonpay.model.request.Price;
        /**
         * The maximum number of minutes allocated for the Authorize operation call to be processed. After this the authorization is automatically declined and you cannot capture funds against the authorization. The default value for Alexa transactions is 0. In order to speed up checkout time for voice users we recommend to not change this value.
         */
        'transactionTimeout'?: number;
        /**
         * A description for the transaction that is included in emails to the user. Appears only when AuthorizeAndCapture is chosen.
         */
        'sellerAuthorizationNote'?: string;
        /**
         * The description to be shown on the user's payment instrument statement if AuthorizeAndCapture is chosen. Format of soft descriptor sent to the payment processor is \"AMZ* <soft descriptor specified here>\". Default is \"AMZ*<SELLER_NAME> amzn.com/ pmts WA\". Maximum length can be 16 characters.
         */
        'softDescriptor'?: string;
        /**
         * Version of the Amazon Pay Entity. Can be 1 or greater.
         */
        '@version': string;
    }
}
export declare namespace interfaces.amazonpay.model.request {
    /**
     * The merchant can choose to set the attributes specified in the BillingAgreementAttributes.
     * @interface
     */
    interface BillingAgreementAttributes {
        '@type': 'BillingAgreementAttributes';
        /**
         * Represents the SellerId of the Solution Provider that developed the eCommerce platform. This value is only used by Solution Providers, for whom it is required. It should not be provided by merchants creating their own custom integration. Do not specify the SellerId of the merchant for this request parameter. If you are a merchant, do not enter a PlatformId.
         */
        'platformId'?: string;
        /**
         * Represents a description of the billing agreement that is displayed in emails to the buyer.
         */
        'sellerNote'?: string;
        'sellerBillingAgreementAttributes'?: interfaces.amazonpay.model.request.SellerBillingAgreementAttributes;
        'billingAgreementType'?: interfaces.amazonpay.model.request.BillingAgreementType;
        'subscriptionAmount'?: interfaces.amazonpay.model.request.Price;
        /**
         * Version of the Amazon Pay Entity. Can be 1 or greater.
         */
        '@version': string;
    }
}
export declare namespace interfaces.amazonpay.model.request {
    /**
     * This request object specifies amount and currency authorized/captured.
     * @interface
     */
    interface Price {
        '@type': 'Price';
        /**
         * Amount authorized/captured.
         */
        'amount': string;
        /**
         * Currency code for the amount.
         */
        'currencyCode': string;
        /**
         * Version of the Amazon Pay Entity. Can be 1 or greater.
         */
        '@version': string;
    }
}
export declare namespace interfaces.amazonpay.model.request {
    /**
     * This is required only for Ecommerce provider (Solution provider) use cases.
     * @interface
     */
    interface ProviderAttributes {
        '@type': 'ProviderAttributes';
        /**
         * Solution provider ID.
         */
        'providerId': string;
        /**
         * List of provider credit.
         */
        'providerCreditList': Array<interfaces.amazonpay.model.request.ProviderCredit>;
        /**
         * Version of the Amazon Pay Entity. Can be 1 or greater.
         */
        '@version': string;
    }
}
export declare namespace interfaces.amazonpay.model.request {
    /**
     *
     * @interface
     */
    interface ProviderCredit {
        '@type': 'ProviderCredit';
        /**
         * This is required only for Ecommerce provider (Solution provider) use cases.
         */
        'providerId'?: string;
        'credit'?: interfaces.amazonpay.model.request.Price;
        /**
         * Version of the Amazon Pay Entity. Can be 1 or greater.
         */
        '@version': string;
    }
}
export declare namespace interfaces.amazonpay.model.request {
    /**
     * Provides more context about the billing agreement that is represented by this Billing Agreement object.
     * @interface
     */
    interface SellerBillingAgreementAttributes {
        '@type': 'SellerBillingAgreementAttributes';
        /**
         * The merchant-specified identifier of this billing agreement. At least one request parameter must be specified. Amazon recommends that you use only the following characters:- lowercase a-z, uppercase A-Z, numbers 0-9, dash (-), underscore (_).
         */
        'sellerBillingAgreementId'?: string;
        /**
         * The identifier of the store from which the order was placed. This overrides the default value in Seller Central under Settings > Account Settings. It is displayed to the buyer in their emails and transaction history on the Amazon Payments website.
         */
        'storeName'?: string;
        /**
         * Any additional information that you wish to include with this billing agreement. At least one request parameter must be specified.
         */
        'customInformation'?: string;
        /**
         * Version of the Amazon Pay Entity. Can be 1 or greater.
         */
        '@version': string;
    }
}
export declare namespace interfaces.amazonpay.model.request {
    /**
     * This object includes elements shown to buyers in emails and in their transaction history. See the “SellerOrderAttributes” section of the Amazon Pay API reference guide for details about this object.
     * @interface
     */
    interface SellerOrderAttributes {
        '@type': 'SellerOrderAttributes';
        /**
         * The merchant-specified identifier of this order. This is shown to the buyer in their emails and transaction history on the Amazon Pay website.
         */
        'sellerOrderId'?: string;
        /**
         * The identifier of the store from which the order was placed. This overrides the default value in Seller Central under Settings > Account Settings. It is displayed to the buyer in their emails and transaction history on the Amazon Payments website.
         */
        'storeName'?: string;
        /**
         * Any additional information that you want to include with this order reference.
         */
        'customInformation'?: string;
        /**
         * This represents a description of the order that is displayed in emails to the buyer.
         */
        'sellerNote'?: string;
        /**
         * Version of the Amazon Pay Entity. Can be 1 or greater.
         */
        '@version': string;
    }
}
export declare namespace interfaces.amazonpay.model.response {
    /**
     * This object encapsulates details about an Authorization object including the status, amount captured and fee charged.
     * @interface
     */
    interface AuthorizationDetails {
        /**
         * This is AmazonPay generated identifier for this authorization transaction.
         */
        'amazonAuthorizationId'?: string;
        /**
         * This is 3P seller's identifier for this authorization transaction. This identifier must be unique for all of your authorization transactions.
         */
        'authorizationReferenceId'?: string;
        /**
         * A description for the transaction that is included in emails to the user. Appears only when AuthorizeAndCapture is chosen.
         */
        'sellerAuthorizationNote'?: string;
        'authorizationAmount'?: interfaces.amazonpay.model.response.Price;
        'capturedAmount'?: interfaces.amazonpay.model.response.Price;
        'authorizationFee'?: interfaces.amazonpay.model.response.Price;
        /**
         * list of AmazonCaptureId identifiers that have been requested on this Authorization object.
         */
        'idList'?: Array<string>;
        /**
         * This is the time at which the authorization was created.
         */
        'creationTimestamp'?: string;
        /**
         * This is the time at which the authorization expires.
         */
        'expirationTimestamp'?: string;
        'authorizationStatus'?: interfaces.amazonpay.model.response.AuthorizationStatus;
        /**
         * This indicates whether an authorization resulted in a soft decline.
         */
        'softDecline'?: boolean;
        /**
         * This indicates whether a direct capture against the payment contract was specified.
         */
        'captureNow'?: boolean;
        /**
         * This is the description to be shown on the buyer's payment instrument statement if AuthorizeAndCapture was chosen.
         */
        'softDescriptor'?: string;
        'authorizationBillingAddress'?: interfaces.amazonpay.model.response.Destination;
    }
}
export declare namespace interfaces.amazonpay.model.response {
    /**
     * Indicates the current status of an Authorization object, a Capture object, or a Refund object.
     * @interface
     */
    interface AuthorizationStatus {
        'state'?: interfaces.amazonpay.model.response.State;
        /**
         * The reason that the Authorization object, Capture object, or Refund object is in the current state. For more information, see - https://pay.amazon.com/us/developer/documentation/apireference/201752950
         */
        'reasonCode'?: string;
        /**
         * Reason desciption corresponding to the reason code
         */
        'reasonDescription'?: string;
        /**
         * A timestamp that indicates the time when the authorization, capture, or refund state was last updated. In ISO 8601 format
         */
        'lastUpdateTimestamp'?: string;
    }
}
export declare namespace interfaces.amazonpay.model.response {
    /**
     * The result attributes from successful SetupAmazonPay call.
     * @interface
     */
    interface BillingAgreementDetails {
        /**
         * Billing agreement id which can be used for one time and recurring purchases
         */
        'billingAgreementId': string;
        /**
         * Time at which billing agreement details created.
         */
        'creationTimestamp'?: string;
        /**
         * The default shipping address of the buyer. Returned if needAmazonShippingAddress is set to true.
         */
        'destination'?: interfaces.amazonpay.model.v1.Destination;
        /**
         * Merchant's preferred language of checkout.
         */
        'checkoutLanguage'?: string;
        'releaseEnvironment': interfaces.amazonpay.model.response.ReleaseEnvironment;
        'billingAgreementStatus': interfaces.amazonpay.model.v1.BillingAgreementStatus;
        /**
         * The Billing Address of the payment instrument associated with Billing Agreement.
         */
        'billingAddress'?: interfaces.amazonpay.model.response.Destination;
    }
}
export declare namespace interfaces.amazonpay.model.response {
    /**
     *
     * @interface
     */
    interface Destination {
        /**
         * The name or business name
         */
        'name'?: string;
        /**
         * The company name
         */
        'companyName'?: string;
        /**
         * The first line of the address. At least one AddressLine (AddressLine1, AddressLine2, or AddressLine3) is required.
         */
        'addressLine1'?: string;
        /**
         * The second line of the address. At least one AddressLine (AddressLine1, AddressLine2, or AddressLine3) is required.
         */
        'addressLine2'?: string;
        /**
         * The third line of the address. At least one AddressLine (AddressLine1, AddressLine2, or AddressLine3) is required.
         */
        'addressLine3'?: string;
        /**
         * The city
         */
        'city'?: string;
        /**
         * The district or County
         */
        'districtOrCounty'?: string;
        /**
         * The state or region. This element is free text and can be either a 2-character code, fully spelled out, or abbreviated. Required. Note :- This response element is returned only in the U.S.
         */
        'stateOrRegion'?: string;
        /**
         * The postal code.
         */
        'postalCode'?: string;
        /**
         * The country code, in ISO 3166 format
         */
        'countryCode'?: string;
        /**
         * The phone number
         */
        'phone'?: string;
    }
}
export declare namespace interfaces.amazonpay.model.response {
    /**
     * This response object specifies amount and currency authorized/captured.
     * @interface
     */
    interface Price {
        /**
         * Amount authorized/captured.
         */
        'amount': string;
        /**
         * Currency code for the amount.
         */
        'currencyCode': string;
    }
}
export declare namespace interfaces.amazonpay.request {
    /**
     * Charge Amazon Pay Request Object.
     * @interface
     */
    interface ChargeAmazonPayRequest {
        '@type': 'ChargeAmazonPayRequest';
        /**
         * Version of the Amazon Pay Entity. Can be 1 or greater.
         */
        '@version': string;
        /**
         * The seller ID (also known as merchant ID). If you are an Ecommerce Provider (Solution Provider), please specify the ID of the merchant, not your provider ID.
         */
        'sellerId': string;
        /**
         * The payment contract i.e. billing agreement created for the user.
         */
        'billingAgreementId': string;
        'paymentAction': interfaces.amazonpay.model.request.PaymentAction;
        'authorizeAttributes': interfaces.amazonpay.model.request.AuthorizeAttributes;
        'sellerOrderAttributes'?: interfaces.amazonpay.model.request.SellerOrderAttributes;
        'providerAttributes'?: interfaces.amazonpay.model.request.ProviderAttributes;
    }
}
export declare namespace interfaces.amazonpay.request {
    /**
     * Setup Amazon Pay Request Object.
     * @interface
     */
    interface SetupAmazonPayRequest {
        '@type': 'SetupAmazonPayRequest';
        /**
         * Version of the Amazon Pay Entity. Can be 1 or greater.
         */
        '@version': string;
        /**
         * The seller ID (also known as merchant ID). If you are an Ecommerce Provider (Solution Provider), please specify the ID of the merchant, not your provider ID.
         */
        'sellerId': string;
        /**
         * The country in which the merchant has registered, as an Amazon Payments legal entity.
         */
        'countryOfEstablishment': string;
        /**
         * The currency of the merchant’s ledger account.
         */
        'ledgerCurrency': string;
        /**
         * The merchant's preferred language for checkout.
         */
        'checkoutLanguage'?: string;
        'billingAgreementAttributes'?: interfaces.amazonpay.model.request.BillingAgreementAttributes;
        /**
         * To receive the default user shipping address in the response, set this parameter to true. Not required if a user shipping address is not required.
         */
        'needAmazonShippingAddress'?: boolean;
        /**
         * To test in Sandbox mode, set this parameter to true.
         */
        'sandboxMode'?: boolean;
        /**
         * Use this parameter to create a Sandbox payment object. In order to use this parameter, you first create a Sandbox user account in Seller Central. Then, pass the email address associated with that Sandbox user account.
         */
        'sandboxCustomerEmailId'?: string;
    }
}
export declare namespace interfaces.amazonpay.response {
    /**
     * Error response for SetupAmazonPay and ChargeAmazonPay calls.
     * @interface
     */
    interface AmazonPayErrorResponse {
        /**
         * Error code indicating the succinct cause of error
         */
        'errorCode': string;
        /**
         * Description of the error.
         */
        'errorMessage': string;
    }
}
export declare namespace interfaces.amazonpay.response {
    /**
     * Charge Amazon Pay Result Object. It is sent as part of the response to ChargeAmazonPayRequest.
     * @interface
     */
    interface ChargeAmazonPayResult {
        /**
         * The order reference identifier.
         */
        'amazonOrderReferenceId': string;
        'authorizationDetails': interfaces.amazonpay.model.response.AuthorizationDetails;
    }
}
export declare namespace interfaces.audioplayer {
    /**
     *
     * @interface
     */
    interface ClearQueueDirective {
        'type': 'AudioPlayer.ClearQueue';
        'clearBehavior'?: interfaces.audioplayer.ClearBehavior;
    }
}
export declare namespace interfaces.audioplayer {
    /**
     *
     * @interface
     */
    interface PlayDirective {
        'type': 'AudioPlayer.Play';
        'playBehavior'?: interfaces.audioplayer.PlayBehavior;
        'audioItem'?: interfaces.audioplayer.AudioItem;
    }
}
export declare namespace interfaces.audioplayer {
    /**
     *
     * @interface
     */
    interface PlaybackFailedRequest {
        'type': 'AudioPlayer.PlaybackFailed';
        /**
         * Represents the unique identifier for the specific request.
         */
        'requestId': string;
        /**
         * Provides the date and time when Alexa sent the request as an ISO 8601 formatted string. Used to verify the request when hosting your skill as a web service.
         */
        'timestamp': string;
        /**
         * A string indicating the user’s locale. For example: en-US. This value is only provided with certain request types.
         */
        'locale'?: string;
        'currentPlaybackState'?: interfaces.audioplayer.CurrentPlaybackState;
        'error'?: interfaces.audioplayer.Error;
        'token'?: string;
    }
}
export declare namespace interfaces.audioplayer {
    /**
     *
     * @interface
     */
    interface PlaybackFinishedRequest {
        'type': 'AudioPlayer.PlaybackFinished';
        /**
         * Represents the unique identifier for the specific request.
         */
        'requestId': string;
        /**
         * Provides the date and time when Alexa sent the request as an ISO 8601 formatted string. Used to verify the request when hosting your skill as a web service.
         */
        'timestamp': string;
        /**
         * A string indicating the user’s locale. For example: en-US. This value is only provided with certain request types.
         */
        'locale'?: string;
        'offsetInMilliseconds'?: number;
        'token'?: string;
    }
}
export declare namespace interfaces.audioplayer {
    /**
     *
     * @interface
     */
    interface PlaybackNearlyFinishedRequest {
        'type': 'AudioPlayer.PlaybackNearlyFinished';
        /**
         * Represents the unique identifier for the specific request.
         */
        'requestId': string;
        /**
         * Provides the date and time when Alexa sent the request as an ISO 8601 formatted string. Used to verify the request when hosting your skill as a web service.
         */
        'timestamp': string;
        /**
         * A string indicating the user’s locale. For example: en-US. This value is only provided with certain request types.
         */
        'locale'?: string;
        'offsetInMilliseconds'?: number;
        'token'?: string;
    }
}
export declare namespace interfaces.audioplayer {
    /**
     *
     * @interface
     */
    interface PlaybackStartedRequest {
        'type': 'AudioPlayer.PlaybackStarted';
        /**
         * Represents the unique identifier for the specific request.
         */
        'requestId': string;
        /**
         * Provides the date and time when Alexa sent the request as an ISO 8601 formatted string. Used to verify the request when hosting your skill as a web service.
         */
        'timestamp': string;
        /**
         * A string indicating the user’s locale. For example: en-US. This value is only provided with certain request types.
         */
        'locale'?: string;
        'offsetInMilliseconds'?: number;
        'token'?: string;
    }
}
export declare namespace interfaces.audioplayer {
    /**
     *
     * @interface
     */
    interface PlaybackStoppedRequest {
        'type': 'AudioPlayer.PlaybackStopped';
        /**
         * Represents the unique identifier for the specific request.
         */
        'requestId': string;
        /**
         * Provides the date and time when Alexa sent the request as an ISO 8601 formatted string. Used to verify the request when hosting your skill as a web service.
         */
        'timestamp': string;
        /**
         * A string indicating the user’s locale. For example: en-US. This value is only provided with certain request types.
         */
        'locale'?: string;
        'offsetInMilliseconds'?: number;
        'token'?: string;
    }
}
export declare namespace interfaces.audioplayer {
    /**
     *
     * @interface
     */
    interface StopDirective {
        'type': 'AudioPlayer.Stop';
    }
}
export declare namespace interfaces.connections {
    /**
     * This is the request object that a skill will receive as a result of Connections.SendRequest directive from sender skill.
     * @interface
     */
    interface ConnectionsRequest {
        'type': 'Connections.Request';
        /**
         * Represents the unique identifier for the specific request.
         */
        'requestId': string;
        /**
         * Provides the date and time when Alexa sent the request as an ISO 8601 formatted string. Used to verify the request when hosting your skill as a web service.
         */
        'timestamp': string;
        /**
         * A string indicating the user’s locale. For example: en-US. This value is only provided with certain request types.
         */
        'locale'?: string;
        /**
         * Name of the action sent by the referrer skill.
         */
        'name'?: string;
        /**
         * This is an object sent between the two skills for processing a ConnectionsRequest or ConnectionsResponse. This will always be a valid payload based on Action schema for the requester action.
         */
        'payload'?: {
            [key: string]: any;
        };
    }
}
export declare namespace interfaces.connections {
    /**
     * This is the request object that a skill will receive as a result of Connections.SendResponse directive from referrer skill.
     * @interface
     */
    interface ConnectionsResponse {
        'type': 'Connections.Response';
        /**
         * Represents the unique identifier for the specific request.
         */
        'requestId': string;
        /**
         * Provides the date and time when Alexa sent the request as an ISO 8601 formatted string. Used to verify the request when hosting your skill as a web service.
         */
        'timestamp': string;
        /**
         * A string indicating the user’s locale. For example: en-US. This value is only provided with certain request types.
         */
        'locale'?: string;
        'status'?: interfaces.connections.ConnectionsStatus;
        /**
         * Name of the action for which response is received.
         */
        'name'?: string;
        /**
         * This is an object sent from referrer skill as is.
         */
        'payload'?: {
            [key: string]: any;
        };
        /**
         * This is the token that the skill originally sent with the ConnectionsSendRequest directive.
         */
        'token'?: string;
    }
}
export declare namespace interfaces.connections {
    /**
     * This is the directive that a skill can send as part of their response to a session based request to execute a predefined Connections. This will also return a result to the referring skill. (No Guarantee response will be returned)
     * @interface
     */
    interface SendRequestDirective {
        'type': 'Connections.SendRequest';
        /**
         * This defines the name of the Connection skill is trying to execute. It must be a valid and supported Connection name.
         */
        'name': string;
        /**
         * This is an object sent between the two skills for processing a ConnectionsRequest or ConnectionsResponse. The contract for the object is based on the schema of the Action used in the SendRequestDirective. Invalid payloads will result in errors sent back to the referrer.
         */
        'payload'?: {
            [key: string]: any;
        };
        /**
         * This is an echo back string that skills send when during Connections.SendRequest directive. They will receive it when they get the ConnectionsResponse. It is never sent to the skill handling the request.
         */
        'token': string;
    }
}
export declare namespace interfaces.connections {
    /**
     * This is the directive that a skill can send as part of their response to a session based request to return a response to ConnectionsRequest.
     * @interface
     */
    interface SendResponseDirective {
        'type': 'Connections.SendResponse';
        'status': interfaces.connections.ConnectionsStatus;
        /**
         * This is an object sent to referrer skill as is.
         */
        'payload'?: {
            [key: string]: any;
        };
    }
}
export declare namespace interfaces.connections.V1 {
    /**
     * This is the directive that a skill can send as part of their response to a session based request to start a connection. A response will be returned to the skill when the connection is handled.
     * @interface
     */
    interface StartConnectionDirective {
        'type': 'Connections.StartConnection';
        /**
         * This defines the name and version of connection that the requester is trying to send. The format of the uri should follow this pattern: connection://connectionName/connectionVersion. Invalid uri will cause an error which will be sent back to the requester.
         */
        'uri': string;
        'onCompletion'?: interfaces.connections.OnCompletion;
        /**
         * This is the input to the connection that the requester is trying to send. It is predefined by the handler of the connection. If the input format is incorrect, an error will be sent to to the requester.
         */
        'input'?: {
            [key: string]: any;
        };
        /**
         * This is an echo back string that requester will receive it when it gets resumed. It is never sent to the handler of the connection.
         */
        'token'?: string;
    }
}
export declare namespace interfaces.connections.entities {
    /**
     * Postal Address
     * @interface
     */
    interface PostalAddress {
        '@type': 'PostalAddress';
        /**
         * version of the request
         */
        '@version': string;
        /**
         * street address
         */
        'streetAddress'?: string;
        /**
         * locality/city
         */
        'locality'?: string;
        /**
         * state/region
         */
        'region'?: string;
        /**
         * postal/zip code
         */
        'postalCode'?: string;
        /**
         * country
         */
        'country'?: string;
    }
}
export declare namespace interfaces.connections.entities {
    /**
     * Restaurant entity
     * @interface
     */
    interface Restaurant {
        '@type': 'Restaurant';
        /**
         * version of the request
         */
        '@version': string;
        /**
         * name of the restaurant
         */
        'name': string;
        /**
         * location
         */
        'location': interfaces.connections.entities.PostalAddress;
    }
}
export declare namespace interfaces.connections.requests {
    /**
     * Payload Request object for PrintImage
     * @interface
     */
    interface PrintImageRequest {
        '@type': 'PrintImageRequest';
        /**
         * version of the request
         */
        '@version': string;
        /**
         * title of the image
         */
        'title': string;
        /**
         * url of the image
         */
        'url': string;
        /**
         * description of the image
         */
        'description'?: string;
        /**
         * type of the image
         */
        'imageType': string;
    }
}
export declare namespace interfaces.connections.requests {
    /**
     * Payload Request object for PrintPDF
     * @interface
     */
    interface PrintPDFRequest {
        '@type': 'PrintPDFRequest';
        /**
         * version of the request
         */
        '@version': string;
        /**
         * title of the image
         */
        'title': string;
        /**
         * url of the image
         */
        'url': string;
        /**
         * description of the image
         */
        'description'?: string;
    }
}
export declare namespace interfaces.connections.requests {
    /**
     * Payload Request object for PrintWebPage
     * @interface
     */
    interface PrintWebPageRequest {
        '@type': 'PrintWebPageRequest';
        /**
         * version of the request
         */
        '@version': string;
        /**
         * title of the image
         */
        'title': string;
        /**
         * url of the image
         */
        'url': string;
        /**
         * description of the image
         */
        'description'?: string;
    }
}
export declare namespace interfaces.connections.requests {
    /**
     * ScheduleFoodEstablishmentReservationRequest for booking restaurant reservation
     * @interface
     */
    interface ScheduleFoodEstablishmentReservationRequest {
        '@type': 'ScheduleFoodEstablishmentReservationRequest';
        /**
         * version of the request
         */
        '@version': string;
        /**
         * start time of the reservation
         */
        'startTime'?: string;
        /**
         * party size
         */
        'partySize'?: string;
        /**
         * restaurant
         */
        'restaurant': interfaces.connections.entities.Restaurant;
    }
}
export declare namespace interfaces.connections.requests {
    /**
     * ScheduleTaxiReservationRequest for booking taxi reservation
     * @interface
     */
    interface ScheduleTaxiReservationRequest {
        '@type': 'ScheduleTaxiReservationRequest';
        /**
         * version of the request
         */
        '@version': string;
        /**
         * pickup time
         */
        'pickupTime'?: string;
        /**
         * party size
         */
        'partySize'?: string;
        /**
         * pick up location
         */
        'pickupLocation'?: interfaces.connections.entities.PostalAddress;
        /**
         * drop off location
         */
        'dropOffLocation'?: interfaces.connections.entities.PostalAddress;
    }
}
export declare namespace interfaces.conversations {
    /**
     *
     * @interface
     */
    interface APIInvocationRequest {
        'type': 'Dialog.API.Invoked';
        /**
         * Represents the unique identifier for the specific request.
         */
        'requestId': string;
        /**
         * Provides the date and time when Alexa sent the request as an ISO 8601 formatted string. Used to verify the request when hosting your skill as a web service.
         */
        'timestamp': string;
        /**
         * A string indicating the user’s locale. For example: en-US. This value is only provided with certain request types.
         */
        'locale'?: string;
        'apiRequest'?: interfaces.conversations.APIRequest;
    }
}
export declare namespace interfaces.conversations {
    /**
     *
     * @interface
     */
    interface ResetContextDirective {
        'type': 'Conversations.ResetContext';
    }
}
export declare namespace interfaces.customInterfaceController {
    /**
     * Skill receives this type of event when an event meets the filter  conditions provided in the StartEventHandlerDirective.
     * @interface
     */
    interface EventsReceivedRequest {
        'type': 'CustomInterfaceController.EventsReceived';
        /**
         * Represents the unique identifier for the specific request.
         */
        'requestId': string;
        /**
         * Provides the date and time when Alexa sent the request as an ISO 8601 formatted string. Used to verify the request when hosting your skill as a web service.
         */
        'timestamp': string;
        /**
         * A string indicating the user’s locale. For example: en-US. This value is only provided with certain request types.
         */
        'locale'?: string;
        /**
         * Unique identifier associated with the Event Handler that dispatched this event.
         */
        'token'?: string;
        /**
         * A list of events that meet the filter criteria.
         */
        'events'?: Array<interfaces.customInterfaceController.Event>;
    }
}
export declare namespace interfaces.customInterfaceController {
    /**
     * This is the event received by the skill at expiry of an Event Handler.
     * @interface
     */
    interface ExpiredRequest {
        'type': 'CustomInterfaceController.Expired';
        /**
         * Represents the unique identifier for the specific request.
         */
        'requestId': string;
        /**
         * Provides the date and time when Alexa sent the request as an ISO 8601 formatted string. Used to verify the request when hosting your skill as a web service.
         */
        'timestamp': string;
        /**
         * A string indicating the user’s locale. For example: en-US. This value is only provided with certain request types.
         */
        'locale'?: string;
        /**
         * The unique token specified by the StartEventHandlerDirective.
         */
        'token'?: string;
        /**
         * The free form JSON object that the skill will receive if and only if the  Event Handler duration expired.
         */
        'expirationPayload'?: any;
    }
}
export declare namespace interfaces.customInterfaceController {
    /**
     * The directive to be delivered to the gadgets. Each directive is targeted to one gadget  (that is, one endpointId). To target the same directive to multiple gadgets, include one  directive for each gadget in the response.
     * @interface
     */
    interface SendDirectiveDirective {
        'type': 'CustomInterfaceController.SendDirective';
        /**
         * The object that contains the header of the directive.
         */
        'header'?: interfaces.customInterfaceController.Header;
        /**
         * The free form JSON object.
         */
        'payload'?: any;
        /**
         * Identifies the gadget where the directive should be sent to. Each directive is targeted to one gadget (that is, one endpointId). If the same directive is be sent to multiple gadgets,  include one directive for each gadget in the response.
         */
        'endpoint'?: interfaces.customInterfaceController.Endpoint;
    }
}
export declare namespace interfaces.customInterfaceController {
    /**
     * This directive configures and starts an event handler. This will enable the skill to receive Custom Events. A skill can only have one active Event Handler at a time.
     * @interface
     */
    interface StartEventHandlerDirective {
        'type': 'CustomInterfaceController.StartEventHandler';
        /**
         * A unique string to identify the Event Handler. This identifier is associated with all events dispatched by the Event Handler while it is active.
         */
        'token'?: string;
        'eventFilter'?: interfaces.customInterfaceController.EventFilter;
        'expiration'?: interfaces.customInterfaceController.Expiration;
    }
}
export declare namespace interfaces.customInterfaceController {
    /**
     * This directive stops a running Event Handler associated with the provided token. The Expiration payload will not be sent if this executed before the Event Handler duration expired.
     * @interface
     */
    interface StopEventHandlerDirective {
        'type': 'CustomInterfaceController.StopEventHandler';
        /**
         * Unique identifier required to close the Event Handler. This token must match the token used in the StartEventHandlerDirective.
         */
        'token'?: string;
    }
}
export declare namespace interfaces.display {
    /**
     *
     * @interface
     */
    interface BodyTemplate1 {
        'type': 'BodyTemplate1';
        'token'?: string;
        'backButton'?: interfaces.display.BackButtonBehavior;
        'backgroundImage'?: interfaces.display.Image;
        'title'?: string;
        'textContent'?: interfaces.display.TextContent;
    }
}
export declare namespace interfaces.display {
    /**
     *
     * @interface
     */
    interface BodyTemplate2 {
        'type': 'BodyTemplate2';
        'token'?: string;
        'backButton'?: interfaces.display.BackButtonBehavior;
        'backgroundImage'?: interfaces.display.Image;
        'image'?: interfaces.display.Image;
        'title'?: string;
        'textContent'?: interfaces.display.TextContent;
    }
}
export declare namespace interfaces.display {
    /**
     *
     * @interface
     */
    interface BodyTemplate3 {
        'type': 'BodyTemplate3';
        'token'?: string;
        'backButton'?: interfaces.display.BackButtonBehavior;
        'backgroundImage'?: interfaces.display.Image;
        'image'?: interfaces.display.Image;
        'title'?: string;
        'textContent'?: interfaces.display.TextContent;
    }
}
export declare namespace interfaces.display {
    /**
     *
     * @interface
     */
    interface BodyTemplate6 {
        'type': 'BodyTemplate6';
        'token'?: string;
        'backButton'?: interfaces.display.BackButtonBehavior;
        'backgroundImage'?: interfaces.display.Image;
        'textContent'?: interfaces.display.TextContent;
        'image'?: interfaces.display.Image;
    }
}
export declare namespace interfaces.display {
    /**
     *
     * @interface
     */
    interface BodyTemplate7 {
        'type': 'BodyTemplate7';
        'token'?: string;
        'backButton'?: interfaces.display.BackButtonBehavior;
        'title'?: string;
        'image'?: interfaces.display.Image;
        'backgroundImage'?: interfaces.display.Image;
    }
}
export declare namespace interfaces.display {
    /**
     *
     * @interface
     */
    interface ElementSelectedRequest {
        'type': 'Display.ElementSelected';
        /**
         * Represents the unique identifier for the specific request.
         */
        'requestId': string;
        /**
         * Provides the date and time when Alexa sent the request as an ISO 8601 formatted string. Used to verify the request when hosting your skill as a web service.
         */
        'timestamp': string;
        /**
         * A string indicating the user’s locale. For example: en-US. This value is only provided with certain request types.
         */
        'locale'?: string;
        'token': string;
    }
}
export declare namespace interfaces.display {
    /**
     *
     * @interface
     */
    interface HintDirective {
        'type': 'Hint';
        'hint': interfaces.display.Hint;
    }
}
export declare namespace interfaces.display {
    /**
     *
     * @interface
     */
    interface ListTemplate1 {
        'type': 'ListTemplate1';
        'token'?: string;
        'backButton'?: interfaces.display.BackButtonBehavior;
        'backgroundImage'?: interfaces.display.Image;
        'title'?: string;
        'listItems'?: Array<interfaces.display.ListItem>;
    }
}
export declare namespace interfaces.display {
    /**
     *
     * @interface
     */
    interface ListTemplate2 {
        'type': 'ListTemplate2';
        'token'?: string;
        'backButton'?: interfaces.display.BackButtonBehavior;
        'backgroundImage'?: interfaces.display.Image;
        'title'?: string;
        'listItems'?: Array<interfaces.display.ListItem>;
    }
}
export declare namespace interfaces.display {
    /**
     *
     * @interface
     */
    interface PlainText {
        'type': 'PlainText';
        'text': string;
    }
}
export declare namespace interfaces.display {
    /**
     *
     * @interface
     */
    interface PlainTextHint {
        'type': 'PlainText';
        'text': string;
    }
}
export declare namespace interfaces.display {
    /**
     *
     * @interface
     */
    interface RenderTemplateDirective {
        'type': 'Display.RenderTemplate';
        'template'?: interfaces.display.Template;
    }
}
export declare namespace interfaces.display {
    /**
     *
     * @interface
     */
    interface RichText {
        'type': 'RichText';
        'text': string;
    }
}
export declare namespace interfaces.gadgetController {
    /**
     * Sends Alexa a command to modify the behavior of connected Echo Buttons.
     * @interface
     */
    interface SetLightDirective {
        'type': 'GadgetController.SetLight';
        /**
         * The version of the directive. Must be set to 1.
         */
        'version'?: number;
        /**
         * The gadget IDs that will receive the command. An empty array, or leaving this parameter out, signifies that all gadgets will receive the command.
         */
        'targetGadgets'?: Array<string>;
        'parameters'?: services.gadgetController.SetLightParameters;
    }
}
export declare namespace interfaces.gameEngine {
    /**
     * Sent when the conditions of an Echo Button event that your skill defined were met.
     * @interface
     */
    interface InputHandlerEventRequest {
        'type': 'GameEngine.InputHandlerEvent';
        /**
         * Represents the unique identifier for the specific request.
         */
        'requestId': string;
        /**
         * Provides the date and time when Alexa sent the request as an ISO 8601 formatted string. Used to verify the request when hosting your skill as a web service.
         */
        'timestamp': string;
        /**
         * A string indicating the user’s locale. For example: en-US. This value is only provided with certain request types.
         */
        'locale'?: string;
        /**
         * The corresponding identifier of the request that started the input handler.
         */
        'originatingRequestId'?: string;
        'events'?: Array<services.gameEngine.InputHandlerEvent>;
    }
}
export declare namespace interfaces.gameEngine {
    /**
     *
     * @interface
     */
    interface StartInputHandlerDirective {
        'type': 'GameEngine.StartInputHandler';
        /**
         * The maximum run time for this Input Handler, in milliseconds. Although this parameter is required, you can specify events with conditions on which to end the Input Handler earlier.
         */
        'timeout'?: number;
        /**
         * Names for unknown gadget IDs to use in recognizers, allocated on a first-come, first-served basis.
         */
        'proxies'?: Array<string>;
        /**
         * Conditions that, at any moment, are either true or false. You use recognizers when you specify the conditions under which your skill is notified of Echo Button input.
         */
        'recognizers'?: {
            [key: string]: services.gameEngine.Recognizer;
        };
        /**
         * The logic that determines when your skill is notified of Echo Button input. Events are listed here as object keys, where the keys specify the name of an event.
         */
        'events'?: {
            [key: string]: services.gameEngine.Event;
        };
    }
}
export declare namespace interfaces.gameEngine {
    /**
     *
     * @interface
     */
    interface StopInputHandlerDirective {
        'type': 'GameEngine.StopInputHandler';
        /**
         * The `requestId` of the request that started the input handler.
         */
        'originatingRequestId'?: string;
    }
}
export declare namespace interfaces.geolocation {
    /**
     * The geolocation object used in the Context of API
     * @interface
     */
    interface GeolocationState {
        /**
         * Specifies the time when the geolocation data was last collected on the device.
         */
        'timestamp'?: string;
        'coordinate'?: interfaces.geolocation.Coordinate;
        'altitude'?: interfaces.geolocation.Altitude;
        'heading'?: interfaces.geolocation.Heading;
        'speed'?: interfaces.geolocation.Speed;
        'locationServices'?: interfaces.geolocation.LocationServices;
    }
}
export declare namespace interfaces.messaging {
    /**
     *
     * @interface
     */
    interface MessageReceivedRequest {
        'type': 'Messaging.MessageReceived';
        /**
         * Represents the unique identifier for the specific request.
         */
        'requestId': string;
        /**
         * Provides the date and time when Alexa sent the request as an ISO 8601 formatted string. Used to verify the request when hosting your skill as a web service.
         */
        'timestamp': string;
        /**
         * A string indicating the user’s locale. For example: en-US. This value is only provided with certain request types.
         */
        'locale'?: string;
        'message': {
            [key: string]: any;
        };
    }
}
export declare namespace interfaces.navigation.assistance {
    /**
     * New directive that Alexa will send to navigation engine to query road regulations about the road segments that the user is on.
     * @interface
     */
    interface AnnounceRoadRegulation {
        'type': 'Navigation.Assistance.AnnounceRoadRegulation';
    }
}
export declare namespace interfaces.playbackcontroller {
    /**
     *
     * @interface
     */
    interface NextCommandIssuedRequest {
        'type': 'PlaybackController.NextCommandIssued';
        /**
         * Represents the unique identifier for the specific request.
         */
        'requestId': string;
        /**
         * Provides the date and time when Alexa sent the request as an ISO 8601 formatted string. Used to verify the request when hosting your skill as a web service.
         */
        'timestamp': string;
        /**
         * A string indicating the user’s locale. For example: en-US. This value is only provided with certain request types.
         */
        'locale'?: string;
    }
}
export declare namespace interfaces.playbackcontroller {
    /**
     *
     * @interface
     */
    interface PauseCommandIssuedRequest {
        'type': 'PlaybackController.PauseCommandIssued';
        /**
         * Represents the unique identifier for the specific request.
         */
        'requestId': string;
        /**
         * Provides the date and time when Alexa sent the request as an ISO 8601 formatted string. Used to verify the request when hosting your skill as a web service.
         */
        'timestamp': string;
        /**
         * A string indicating the user’s locale. For example: en-US. This value is only provided with certain request types.
         */
        'locale'?: string;
    }
}
export declare namespace interfaces.playbackcontroller {
    /**
     *
     * @interface
     */
    interface PlayCommandIssuedRequest {
        'type': 'PlaybackController.PlayCommandIssued';
        /**
         * Represents the unique identifier for the specific request.
         */
        'requestId': string;
        /**
         * Provides the date and time when Alexa sent the request as an ISO 8601 formatted string. Used to verify the request when hosting your skill as a web service.
         */
        'timestamp': string;
        /**
         * A string indicating the user’s locale. For example: en-US. This value is only provided with certain request types.
         */
        'locale'?: string;
    }
}
export declare namespace interfaces.playbackcontroller {
    /**
     *
     * @interface
     */
    interface PreviousCommandIssuedRequest {
        'type': 'PlaybackController.PreviousCommandIssued';
        /**
         * Represents the unique identifier for the specific request.
         */
        'requestId': string;
        /**
         * Provides the date and time when Alexa sent the request as an ISO 8601 formatted string. Used to verify the request when hosting your skill as a web service.
         */
        'timestamp': string;
        /**
         * A string indicating the user’s locale. For example: en-US. This value is only provided with certain request types.
         */
        'locale'?: string;
    }
}
export declare namespace interfaces.system {
    /**
     *
     * @interface
     */
    interface ExceptionEncounteredRequest {
        'type': 'System.ExceptionEncountered';
        /**
         * Represents the unique identifier for the specific request.
         */
        'requestId': string;
        /**
         * Provides the date and time when Alexa sent the request as an ISO 8601 formatted string. Used to verify the request when hosting your skill as a web service.
         */
        'timestamp': string;
        /**
         * A string indicating the user’s locale. For example: en-US. This value is only provided with certain request types.
         */
        'locale'?: string;
        'error': interfaces.system.Error;
        'cause': interfaces.system.ErrorCause;
    }
}
export declare namespace interfaces.tasks {
    /**
     * This is the directive that a skill can send as part of their response to a session based request. The response will contain the result of the task that the skill is launched for.
     * @interface
     */
    interface CompleteTaskDirective {
        'type': 'Tasks.CompleteTask';
        'status': Status;
        /**
         * This is an object sent to the requester.
         */
        'result'?: {
            [key: string]: any;
        };
    }
}
export declare namespace interfaces.videoapp {
    /**
     *
     * @interface
     */
    interface LaunchDirective {
        'type': 'VideoApp.Launch';
        'videoItem': interfaces.videoapp.VideoItem;
    }
}
export declare namespace interfaces.viewport {
    /**
     * This object contains the characteristics related to the text device's viewport.
     * @interface
     */
    interface APLTViewportState {
        'type': 'APLT';
        /**
         * unique identifier of a viewport object
         */
        'id'?: string;
        /**
         * List of profiles that device can emulate.
         */
        'supportedProfiles': Array<interfaces.viewport.aplt.ViewportProfile>;
        /**
         * horizontal dimension of text display in number of characters
         */
        'lineLength': number;
        /**
         * vertical dimension of text display in number of rows
         */
        'lineCount': number;
        'characterFormat': interfaces.viewport.aplt.CharacterFormat;
        /**
         * list of inter-segment objects
         */
        'interSegments'?: Array<interfaces.viewport.aplt.InterSegment>;
    }
}
export declare namespace interfaces.viewport {
    /**
     * This object contains the characteristics related to the APL device's viewport.
     * @interface
     */
    interface APLViewportState {
        'type': 'APL';
        /**
         * unique identifier of a viewport object
         */
        'id'?: string;
        'shape': interfaces.viewport.Shape;
        /**
         * The pixel density of the viewport.
         */
        'dpi': number;
        'presentationType': interfaces.viewport.PresentationType;
        /**
         * Indicates if the viewport can be rotated through 90 degrees.
         */
        'canRotate': boolean;
        'configuration': interfaces.viewport.apl.ViewportConfiguration;
    }
}
export declare namespace interfaces.viewport.size {
    /**
     * Defines range of size with minimum and maximum values for with and height.
     * @interface
     */
    interface ContinuousViewportSize {
        'type': 'CONTINUOUS';
        'minPixelWidth': number;
        'minPixelHeight': number;
        'maxPixelWidth': number;
        'maxPixelHeight': number;
    }
}
export declare namespace interfaces.viewport.size {
    /**
     * Defines a fixed size of viewport.
     * @interface
     */
    interface DiscreteViewportSize {
        'type': 'DISCRETE';
        'pixelWidth': number;
        'pixelHeight': number;
    }
}
export declare namespace services.datastore.v1 {
    /**
     * Remove all existing data in skill's DataStore.
     * @interface
     */
    interface ClearCommand {
        'type': 'CLEAR';
    }
}
export declare namespace services.datastore.v1 {
    /**
     *
     * @interface
     */
    interface Devices {
        'type': 'DEVICES';
        /**
         * Unordered array of device identifiers.
         */
        'items': Array<string>;
    }
}
export declare namespace services.datastore.v1 {
    /**
     * Creates a new namespace. If the namespace already exists, the command succeeds without any change.
     * @interface
     */
    interface PutNamespaceCommand {
        'type': 'PUT_NAMESPACE';
        /**
         * Namespace where object needs to be created. Its unique identifier within skill's DataStore.
         */
        'namespace': string;
    }
}
export declare namespace services.datastore.v1 {
    /**
     * Creates or updates an object.
     * @interface
     */
    interface PutObjectCommand {
        'type': 'PUT_OBJECT';
        /**
         * Namespace where object needs to be created. Its unique identifier within skill's DataStore.
         */
        'namespace': string;
        /**
         * Unique identifier of the objects. Needs to be unique only within client's namespace not globally unique.
         */
        'key': string;
        /**
         * Open content payload that is not inspected by the DataStore.
         */
        'content': any;
    }
}
export declare namespace services.datastore.v1 {
    /**
     * Deletes an existing namespace. If the namespace doesn't exist, this command succeeds without any change.
     * @interface
     */
    interface RemoveNamespaceCommand {
        'type': 'REMOVE_NAMESPACE';
        /**
         * Namespace which needs to be removed. It's unique identifier within skill's DataStore.
         */
        'namespace': string;
    }
}
export declare namespace services.datastore.v1 {
    /**
     * Deletes an existing object. If the object doesn't exist, this command succeeds without any change.
     * @interface
     */
    interface RemoveObjectCommand {
        'type': 'REMOVE_OBJECT';
        /**
         * Namespace where the object is stored. Its unique identifier within skill's DataStore.
         */
        'namespace': string;
        /**
         * Unique identifier of the objects. Needs to be unique only within client's namespace not globally unique.
         */
        'key': string;
    }
}
export declare namespace services.datastore.v1 {
    /**
     *
     * @interface
     */
    interface User {
        'type': 'USER';
        /**
         * User ID in request envelope (context.System.user.userId).
         */
        'id': string;
    }
}
export declare namespace services.directive {
    /**
     *
     * @interface
     */
    interface SpeakDirective {
        'type': 'VoicePlayer.Speak';
        'speech'?: string;
    }
}
export declare namespace services.gameEngine {
    /**
     * The deviation recognizer returns true when another specified recognizer reports that the player has deviated from its expected pattern.
     * @interface
     */
    interface DeviationRecognizer {
        'type': 'deviation';
        /**
         * The name of the recognizer that defines a pattern that must not be deviated from.
         */
        'recognizer'?: string;
    }
}
export declare namespace services.gameEngine {
    /**
     * This recognizer is true when all of the specified events have occurred in the specified order.
     * @interface
     */
    interface PatternRecognizer {
        'type': 'match';
        'anchor'?: services.gameEngine.PatternRecognizerAnchorType;
        /**
         * When true, the recognizer will ignore additional events that occur between the events specified in the pattern.
         */
        'fuzzy'?: boolean;
        /**
         * The gadget IDs of the Echo Buttons to consider in this pattern recognizer.
         */
        'gadgetIds'?: Array<string>;
        /**
         * The actions to consider in this pattern recognizer. All other actions will be ignored.
         */
        'actions'?: Array<string>;
        /**
         * An object that provides all of the events that need to occur, in a specific order, for this recognizer to be true. Omitting any parameters in this object means \"match anything\".
         */
        'pattern'?: Array<services.gameEngine.Pattern>;
    }
}
export declare namespace services.gameEngine {
    /**
     * This recognizer consults another recognizer for the degree of completion, and is true if that degree is above the specified threshold. The completion parameter is specified as a decimal percentage.
     * @interface
     */
    interface ProgressRecognizer {
        'type': 'progress';
        /**
         * The name of a recognizer for which to track the progress.
         */
        'recognizer'?: string;
        /**
         * The completion threshold, as a decimal percentage, of the specified recognizer before which this recognizer becomes true.
         */
        'completion'?: number;
    }
}
export declare namespace services.listManagement {
    /**
     *
     * @interface
     */
    interface ListCreatedEventRequest {
        'type': 'AlexaHouseholdListEvent.ListCreated';
        /**
         * Represents the unique identifier for the specific request.
         */
        'requestId': string;
        /**
         * Provides the date and time when Alexa sent the request as an ISO 8601 formatted string. Used to verify the request when hosting your skill as a web service.
         */
        'timestamp': string;
        /**
         * A string indicating the user’s locale. For example: en-US. This value is only provided with certain request types.
         */
        'locale'?: string;
        'body'?: services.listManagement.ListBody;
        'eventCreationTime'?: string;
        'eventPublishingTime'?: string;
    }
}
export declare namespace services.listManagement {
    /**
     *
     * @interface
     */
    interface ListDeletedEventRequest {
        'type': 'AlexaHouseholdListEvent.ListDeleted';
        /**
         * Represents the unique identifier for the specific request.
         */
        'requestId': string;
        /**
         * Provides the date and time when Alexa sent the request as an ISO 8601 formatted string. Used to verify the request when hosting your skill as a web service.
         */
        'timestamp': string;
        /**
         * A string indicating the user’s locale. For example: en-US. This value is only provided with certain request types.
         */
        'locale'?: string;
        'body'?: services.listManagement.ListBody;
        'eventCreationTime'?: string;
        'eventPublishingTime'?: string;
    }
}
export declare namespace services.listManagement {
    /**
     *
     * @interface
     */
    interface ListItemsCreatedEventRequest {
        'type': 'AlexaHouseholdListEvent.ItemsCreated';
        /**
         * Represents the unique identifier for the specific request.
         */
        'requestId': string;
        /**
         * Provides the date and time when Alexa sent the request as an ISO 8601 formatted string. Used to verify the request when hosting your skill as a web service.
         */
        'timestamp': string;
        /**
         * A string indicating the user’s locale. For example: en-US. This value is only provided with certain request types.
         */
        'locale'?: string;
        'body'?: services.listManagement.ListItemBody;
        'eventCreationTime'?: string;
        'eventPublishingTime'?: string;
    }
}
export declare namespace services.listManagement {
    /**
     *
     * @interface
     */
    interface ListItemsDeletedEventRequest {
        'type': 'AlexaHouseholdListEvent.ItemsDeleted';
        /**
         * Represents the unique identifier for the specific request.
         */
        'requestId': string;
        /**
         * Provides the date and time when Alexa sent the request as an ISO 8601 formatted string. Used to verify the request when hosting your skill as a web service.
         */
        'timestamp': string;
        /**
         * A string indicating the user’s locale. For example: en-US. This value is only provided with certain request types.
         */
        'locale'?: string;
        'body'?: services.listManagement.ListItemBody;
        'eventCreationTime'?: string;
        'eventPublishingTime'?: string;
    }
}
export declare namespace services.listManagement {
    /**
     *
     * @interface
     */
    interface ListItemsUpdatedEventRequest {
        'type': 'AlexaHouseholdListEvent.ItemsUpdated';
        /**
         * Represents the unique identifier for the specific request.
         */
        'requestId': string;
        /**
         * Provides the date and time when Alexa sent the request as an ISO 8601 formatted string. Used to verify the request when hosting your skill as a web service.
         */
        'timestamp': string;
        /**
         * A string indicating the user’s locale. For example: en-US. This value is only provided with certain request types.
         */
        'locale'?: string;
        'body'?: services.listManagement.ListItemBody;
        'eventCreationTime'?: string;
        'eventPublishingTime'?: string;
    }
}
export declare namespace services.listManagement {
    /**
     *
     * @interface
     */
    interface ListUpdatedEventRequest {
        'type': 'AlexaHouseholdListEvent.ListUpdated';
        /**
         * Represents the unique identifier for the specific request.
         */
        'requestId': string;
        /**
         * Provides the date and time when Alexa sent the request as an ISO 8601 formatted string. Used to verify the request when hosting your skill as a web service.
         */
        'timestamp': string;
        /**
         * A string indicating the user’s locale. For example: en-US. This value is only provided with certain request types.
         */
        'locale'?: string;
        'body'?: services.listManagement.ListBody;
        'eventCreationTime'?: string;
        'eventPublishingTime'?: string;
    }
}
export declare namespace services.reminderManagement {
    /**
     * Response object for get reminder request
     * @interface
     */
    interface GetReminderResponse {
        /**
         * Unique id of this reminder alert
         */
        'alertToken'?: string;
        /**
         * Valid ISO 8601 format - Creation time of this reminder alert
         */
        'createdTime'?: string;
        /**
         * Valid ISO 8601 format - Last updated time of this reminder alert
         */
        'updatedTime'?: string;
        'status'?: services.reminderManagement.Status;
        'trigger'?: services.reminderManagement.Trigger;
        'alertInfo'?: services.reminderManagement.AlertInfo;
        'pushNotification'?: services.reminderManagement.PushNotification;
        /**
         * Version of reminder alert
         */
        'version'?: string;
    }
}
export declare namespace services.reminderManagement {
    /**
     *
     * @interface
     */
    interface ReminderCreatedEventRequest {
        'type': 'Reminders.ReminderCreated';
        /**
         * Represents the unique identifier for the specific request.
         */
        'requestId': string;
        /**
         * Provides the date and time when Alexa sent the request as an ISO 8601 formatted string. Used to verify the request when hosting your skill as a web service.
         */
        'timestamp': string;
        /**
         * A string indicating the user’s locale. For example: en-US. This value is only provided with certain request types.
         */
        'locale'?: string;
        'body'?: services.reminderManagement.Event;
    }
}
export declare namespace services.reminderManagement {
    /**
     *
     * @interface
     */
    interface ReminderDeletedEventRequest {
        'type': 'Reminders.ReminderDeleted';
        /**
         * Represents the unique identifier for the specific request.
         */
        'requestId': string;
        /**
         * Provides the date and time when Alexa sent the request as an ISO 8601 formatted string. Used to verify the request when hosting your skill as a web service.
         */
        'timestamp': string;
        /**
         * A string indicating the user’s locale. For example: en-US. This value is only provided with certain request types.
         */
        'locale'?: string;
        'body'?: services.reminderManagement.ReminderDeletedEvent;
    }
}
export declare namespace services.reminderManagement {
    /**
     *
     * @interface
     */
    interface ReminderStartedEventRequest {
        'type': 'Reminders.ReminderStarted';
        /**
         * Represents the unique identifier for the specific request.
         */
        'requestId': string;
        /**
         * Provides the date and time when Alexa sent the request as an ISO 8601 formatted string. Used to verify the request when hosting your skill as a web service.
         */
        'timestamp': string;
        /**
         * A string indicating the user’s locale. For example: en-US. This value is only provided with certain request types.
         */
        'locale'?: string;
        'body'?: services.reminderManagement.Event;
    }
}
export declare namespace services.reminderManagement {
    /**
     *
     * @interface
     */
    interface ReminderStatusChangedEventRequest {
        'type': 'Reminders.ReminderStatusChanged';
        /**
         * Represents the unique identifier for the specific request.
         */
        'requestId': string;
        /**
         * Provides the date and time when Alexa sent the request as an ISO 8601 formatted string. Used to verify the request when hosting your skill as a web service.
         */
        'timestamp': string;
        /**
         * A string indicating the user’s locale. For example: en-US. This value is only provided with certain request types.
         */
        'locale'?: string;
        'body'?: services.reminderManagement.Event;
    }
}
export declare namespace services.reminderManagement {
    /**
     *
     * @interface
     */
    interface ReminderUpdatedEventRequest {
        'type': 'Reminders.ReminderUpdated';
        /**
         * Represents the unique identifier for the specific request.
         */
        'requestId': string;
        /**
         * Provides the date and time when Alexa sent the request as an ISO 8601 formatted string. Used to verify the request when hosting your skill as a web service.
         */
        'timestamp': string;
        /**
         * A string indicating the user’s locale. For example: en-US. This value is only provided with certain request types.
         */
        'locale'?: string;
        'body'?: services.reminderManagement.Event;
    }
}
export declare namespace services.timerManagement {
    /**
     * ANNOUNCE trigger behavior represents announcing a certain text that the developer wants to be read out at the expiration of the timer.
     * @interface
     */
    interface AnnounceOperation {
        'type': 'ANNOUNCE';
        'textToAnnounce': Array<services.timerManagement.TextToAnnounce>;
    }
}
export declare namespace services.timerManagement {
    /**
     * LAUNCH_TASK trigger behavior representing launch a Skill Connection task exposed by the same skill.
     * @interface
     */
    interface LaunchTaskOperation {
        'type': 'LAUNCH_TASK';
        'textToConfirm': Array<services.timerManagement.TextToConfirm>;
        'task': services.timerManagement.Task;
    }
}
export declare namespace services.timerManagement {
    /**
     * NOTIFY_ONLY trigger behavior represents chime only when timer expired.
     * @interface
     */
    interface NotifyOnlyOperation {
        'type': 'NOTIFY_ONLY';
    }
}
export declare namespace ui {
    /**
     *
     * @interface
     */
    interface AskForPermissionsConsentCard {
        'type': 'AskForPermissionsConsent';
        'permissions': Array<string>;
    }
}
export declare namespace ui {
    /**
     *
     * @interface
     */
    interface LinkAccountCard {
        'type': 'LinkAccount';
    }
}
export declare namespace ui {
    /**
     *
     * @interface
     */
    interface PlainTextOutputSpeech {
        'type': 'PlainText';
        'playBehavior'?: ui.PlayBehavior;
        'text': string;
    }
}
export declare namespace ui {
    /**
     *
     * @interface
     */
    interface SimpleCard {
        'type': 'Simple';
        'title'?: string;
        'content'?: string;
    }
}
export declare namespace ui {
    /**
     *
     * @interface
     */
    interface SsmlOutputSpeech {
        'type': 'SSML';
        'playBehavior'?: ui.PlayBehavior;
        'ssml': string;
    }
}
export declare namespace ui {
    /**
     *
     * @interface
     */
    interface StandardCard {
        'type': 'Standard';
        'title'?: string;
        'text'?: string;
        'image'?: ui.Image;
    }
}
export declare namespace services.datastore {
    /**
     *
    */
    class DatastoreServiceClient extends BaseServiceClient {
        private lwaServiceClient;
        private userAgent;
        constructor(apiConfiguration: ApiConfiguration, authenticationConfiguration: AuthenticationConfiguration, customUserAgent?: string);
        /**
         * Send DataStore commands to Alexa device.
         * @param {services.datastore.v1.CommandsRequest} commandsRequest
         */
        callCommandsV1(commandsRequest: services.datastore.v1.CommandsRequest): Promise<ApiResponse>;
        /**
         * Send DataStore commands to Alexa device.
         * @param {services.datastore.v1.CommandsRequest} commandsRequest
         */
        commandsV1(commandsRequest: services.datastore.v1.CommandsRequest): Promise<services.datastore.v1.CommandsResponse>;
        /**
         * Cancel pending DataStore commands.
         * @param {string} queuedResultId A unique identifier to query result for queued delivery for offline devices (DEVICE_UNAVAILABLE).
         */
        callCancelCommandsV1(queuedResultId: string): Promise<ApiResponse>;
        /**
         * Cancel pending DataStore commands.
         * @param {string} queuedResultId A unique identifier to query result for queued delivery for offline devices (DEVICE_UNAVAILABLE).
         */
        cancelCommandsV1(queuedResultId: string): Promise<void>;
        /**
         * Query statuses of deliveries to offline devices returned by commands API.
         * @param {string} queuedResultId A unique identifier to query result for queued delivery for offline devices (DEVICE_UNAVAILABLE).
         * @param {number} maxResults Maximum number of CommandsDispatchResult items to return.
         * @param {string} nextToken The value of nextToken in the response to fetch next page. If not specified, the request fetches result for the first page.
         */
        callQueuedResultV1(queuedResultId: string, maxResults?: number, nextToken?: string): Promise<ApiResponse>;
        /**
         * Query statuses of deliveries to offline devices returned by commands API.
         * @param {string} queuedResultId A unique identifier to query result for queued delivery for offline devices (DEVICE_UNAVAILABLE).
         * @param {number} maxResults Maximum number of CommandsDispatchResult items to return.
         * @param {string} nextToken The value of nextToken in the response to fetch next page. If not specified, the request fetches result for the first page.
         */
        queuedResultV1(queuedResultId: string, maxResults?: number, nextToken?: string): Promise<services.datastore.v1.QueuedResultResponse>;
    }
}
export declare namespace services.deviceAddress {
    /**
     *
    */
    class DeviceAddressServiceClient extends BaseServiceClient {
        private userAgent;
        constructor(apiConfiguration: ApiConfiguration, customUserAgent?: string);
        /**
         * Gets the country and postal code of a device
         * @param {string} deviceId The device Id for which to get the country and postal code
         */
        callGetCountryAndPostalCode(deviceId: string): Promise<ApiResponse>;
        /**
         * Gets the country and postal code of a device
         * @param {string} deviceId The device Id for which to get the country and postal code
         */
        getCountryAndPostalCode(deviceId: string): Promise<services.deviceAddress.ShortAddress>;
        /**
         * Gets the address of a device
         * @param {string} deviceId The device Id for which to get the address
         */
        callGetFullAddress(deviceId: string): Promise<ApiResponse>;
        /**
         * Gets the address of a device
         * @param {string} deviceId The device Id for which to get the address
         */
        getFullAddress(deviceId: string): Promise<services.deviceAddress.Address>;
    }
}
export declare namespace services.directive {
    /**
     *
    */
    class DirectiveServiceClient extends BaseServiceClient {
        private userAgent;
        constructor(apiConfiguration: ApiConfiguration, customUserAgent?: string);
        /**
         * Send directives to Alexa.
         * @param {services.directive.SendDirectiveRequest} sendDirectiveRequest Represents the request object to send in the payload.
         */
        callEnqueue(sendDirectiveRequest: services.directive.SendDirectiveRequest): Promise<ApiResponse>;
        /**
         * Send directives to Alexa.
         * @param {services.directive.SendDirectiveRequest} sendDirectiveRequest Represents the request object to send in the payload.
         */
        enqueue(sendDirectiveRequest: services.directive.SendDirectiveRequest): Promise<void>;
    }
}
export declare namespace services.endpointEnumeration {
    /**
     *
    */
    class EndpointEnumerationServiceClient extends BaseServiceClient {
        private userAgent;
        constructor(apiConfiguration: ApiConfiguration, customUserAgent?: string);
        /**
         * This API is invoked by the skill to retrieve endpoints connected to the Echo device.
         */
        callGetEndpoints(): Promise<ApiResponse>;
        /**
         * This API is invoked by the skill to retrieve endpoints connected to the Echo device.
         */
        getEndpoints(): Promise<services.endpointEnumeration.EndpointEnumerationResponse>;
    }
}
export declare namespace services.listManagement {
    /**
     *
    */
    class ListManagementServiceClient extends BaseServiceClient {
        private userAgent;
        constructor(apiConfiguration: ApiConfiguration, customUserAgent?: string);
        /**
         * Retrieves the metadata for all customer lists, including the customer’s default lists.
         */
        callGetListsMetadata(): Promise<ApiResponse>;
        /**
         * Retrieves the metadata for all customer lists, including the customer’s default lists.
         */
        getListsMetadata(): Promise<services.listManagement.AlexaListsMetadata>;
        /**
         * This API deletes a customer custom list.
         * @param {string} listId Value of the customer’s listId retrieved from a getListsMetadata call
         */
        callDeleteList(listId: string): Promise<ApiResponse>;
        /**
         * This API deletes a customer custom list.
         * @param {string} listId Value of the customer’s listId retrieved from a getListsMetadata call
         */
        deleteList(listId: string): Promise<void>;
        /**
         * This API deletes an item in the specified list.
         * @param {string} listId The customer’s listId is retrieved from a getListsMetadata call.
         * @param {string} itemId The customer’s itemId is retrieved from a GetList call.
         */
        callDeleteListItem(listId: string, itemId: string): Promise<ApiResponse>;
        /**
         * This API deletes an item in the specified list.
         * @param {string} listId The customer’s listId is retrieved from a getListsMetadata call.
         * @param {string} itemId The customer’s itemId is retrieved from a GetList call.
         */
        deleteListItem(listId: string, itemId: string): Promise<void>;
        /**
         * This API can be used to retrieve single item with in any list by listId and itemId. This API can read list items from an archived list. Attempting to read list items from a deleted list return an ObjectNotFound 404 error.
         * @param {string} listId Retrieved from a call to getListsMetadata
         * @param {string} itemId itemId within a list is retrieved from a getList call
         */
        callGetListItem(listId: string, itemId: string): Promise<ApiResponse>;
        /**
         * This API can be used to retrieve single item with in any list by listId and itemId. This API can read list items from an archived list. Attempting to read list items from a deleted list return an ObjectNotFound 404 error.
         * @param {string} listId Retrieved from a call to getListsMetadata
         * @param {string} itemId itemId within a list is retrieved from a getList call
         */
        getListItem(listId: string, itemId: string): Promise<services.listManagement.AlexaListItem>;
        /**
         * API used to update an item value or item status.
         * @param {string} listId Customer’s listId
         * @param {string} itemId itemId to be updated in the list
         * @param {services.listManagement.UpdateListItemRequest} updateListItemRequest
         */
        callUpdateListItem(listId: string, itemId: string, updateListItemRequest: services.listManagement.UpdateListItemRequest): Promise<ApiResponse>;
        /**
         * API used to update an item value or item status.
         * @param {string} listId Customer’s listId
         * @param {string} itemId itemId to be updated in the list
         * @param {services.listManagement.UpdateListItemRequest} updateListItemRequest
         */
        updateListItem(listId: string, itemId: string, updateListItemRequest: services.listManagement.UpdateListItemRequest): Promise<services.listManagement.AlexaListItem>;
        /**
         * This API creates an item in an active list or in a default list.
         * @param {string} listId The customer’s listId retrieved from a getListsMetadata call.
         * @param {services.listManagement.CreateListItemRequest} createListItemRequest
         */
        callCreateListItem(listId: string, createListItemRequest: services.listManagement.CreateListItemRequest): Promise<ApiResponse>;
        /**
         * This API creates an item in an active list or in a default list.
         * @param {string} listId The customer’s listId retrieved from a getListsMetadata call.
         * @param {services.listManagement.CreateListItemRequest} createListItemRequest
         */
        createListItem(listId: string, createListItemRequest: services.listManagement.CreateListItemRequest): Promise<services.listManagement.AlexaListItem>;
        /**
         * This API updates a custom list. Only the list name or state can be updated. An Alexa customer can turn an archived list into an active one.
         * @param {string} listId Value of the customer’s listId retrieved from a getListsMetadata call.
         * @param {services.listManagement.UpdateListRequest} updateListRequest
         */
        callUpdateList(listId: string, updateListRequest: services.listManagement.UpdateListRequest): Promise<ApiResponse>;
        /**
         * This API updates a custom list. Only the list name or state can be updated. An Alexa customer can turn an archived list into an active one.
         * @param {string} listId Value of the customer’s listId retrieved from a getListsMetadata call.
         * @param {services.listManagement.UpdateListRequest} updateListRequest
         */
        updateList(listId: string, updateListRequest: services.listManagement.UpdateListRequest): Promise<services.listManagement.AlexaListMetadata>;
        /**
         * Retrieves the list metadata including the items in the list with requested status.
         * @param {string} listId Retrieved from a call to GetListsMetadata to specify the listId in the request path.
         * @param {string} status Specify the status of the list.
         */
        callGetList(listId: string, status: string): Promise<ApiResponse>;
        /**
         * Retrieves the list metadata including the items in the list with requested status.
         * @param {string} listId Retrieved from a call to GetListsMetadata to specify the listId in the request path.
         * @param {string} status Specify the status of the list.
         */
        getList(listId: string, status: string): Promise<services.listManagement.AlexaList>;
        /**
         * This API creates a custom list. The new list name must be different than any existing list name.
         * @param {services.listManagement.CreateListRequest} createListRequest
         */
        callCreateList(createListRequest: services.listManagement.CreateListRequest): Promise<ApiResponse>;
        /**
         * This API creates a custom list. The new list name must be different than any existing list name.
         * @param {services.listManagement.CreateListRequest} createListRequest
         */
        createList(createListRequest: services.listManagement.CreateListRequest): Promise<services.listManagement.AlexaListMetadata>;
    }
}
export declare namespace services.monetization {
    /**
     *
    */
    class MonetizationServiceClient extends BaseServiceClient {
        private userAgent;
        constructor(apiConfiguration: ApiConfiguration, customUserAgent?: string);
        /**
         * Gets In-Skill Products based on user's context for the Skill.
         * @param {string} acceptLanguage User&#39;s locale/language in context
         * @param {string} purchasable Filter products based on whether they are purchasable by the user or not. * &#39;PURCHASABLE&#39; - Products that are purchasable by the user. * &#39;NOT_PURCHASABLE&#39; - Products that are not purchasable by the user.
         * @param {string} entitled Filter products based on whether they are entitled to the user or not. * &#39;ENTITLED&#39; - Products that the user is entitled to. * &#39;NOT_ENTITLED&#39; - Products that the user is not entitled to.
         * @param {string} productType Product type. * &#39;SUBSCRIPTION&#39; - Once purchased, customers will own the content for the subscription period. * &#39;ENTITLEMENT&#39; - Once purchased, customers will own the content forever. * &#39;CONSUMABLE&#39; - Once purchased, customers will be entitled to the content until it is consumed. It can also be re-purchased.
         * @param {string} nextToken When response to this API call is truncated (that is, isTruncated response element value is true), the response also includes the nextToken element, the value of which can be used in the next request as the continuation-token to list the next set of objects. The continuation token is an opaque value that In-Skill Products API understands. Token has expiry of 24 hours.
         * @param {number} maxResults sets the maximum number of results returned in the response body. If you want to retrieve fewer than upper limit of 100 results, you can add this parameter to your request. maxResults should not exceed the upper limit. The response might contain fewer results than maxResults, but it will never contain more. If there are additional results that satisfy the search criteria, but these results were not returned because maxResults was exceeded, the response contains isTruncated &#x3D; true.
         */
        callGetInSkillProducts(acceptLanguage: string, purchasable?: string, entitled?: string, productType?: string, nextToken?: string, maxResults?: number): Promise<ApiResponse>;
        /**
         * Gets In-Skill Products based on user's context for the Skill.
         * @param {string} acceptLanguage User&#39;s locale/language in context
         * @param {string} purchasable Filter products based on whether they are purchasable by the user or not. * &#39;PURCHASABLE&#39; - Products that are purchasable by the user. * &#39;NOT_PURCHASABLE&#39; - Products that are not purchasable by the user.
         * @param {string} entitled Filter products based on whether they are entitled to the user or not. * &#39;ENTITLED&#39; - Products that the user is entitled to. * &#39;NOT_ENTITLED&#39; - Products that the user is not entitled to.
         * @param {string} productType Product type. * &#39;SUBSCRIPTION&#39; - Once purchased, customers will own the content for the subscription period. * &#39;ENTITLEMENT&#39; - Once purchased, customers will own the content forever. * &#39;CONSUMABLE&#39; - Once purchased, customers will be entitled to the content until it is consumed. It can also be re-purchased.
         * @param {string} nextToken When response to this API call is truncated (that is, isTruncated response element value is true), the response also includes the nextToken element, the value of which can be used in the next request as the continuation-token to list the next set of objects. The continuation token is an opaque value that In-Skill Products API understands. Token has expiry of 24 hours.
         * @param {number} maxResults sets the maximum number of results returned in the response body. If you want to retrieve fewer than upper limit of 100 results, you can add this parameter to your request. maxResults should not exceed the upper limit. The response might contain fewer results than maxResults, but it will never contain more. If there are additional results that satisfy the search criteria, but these results were not returned because maxResults was exceeded, the response contains isTruncated &#x3D; true.
         */
        getInSkillProducts(acceptLanguage: string, purchasable?: string, entitled?: string, productType?: string, nextToken?: string, maxResults?: number): Promise<services.monetization.InSkillProductsResponse>;
        /**
         * Get In-Skill Product information based on user context for the Skill.
         * @param {string} acceptLanguage User&#39;s locale/language in context
         * @param {string} productId Product Id.
         */
        callGetInSkillProduct(acceptLanguage: string, productId: string): Promise<ApiResponse>;
        /**
         * Get In-Skill Product information based on user context for the Skill.
         * @param {string} acceptLanguage User&#39;s locale/language in context
         * @param {string} productId Product Id.
         */
        getInSkillProduct(acceptLanguage: string, productId: string): Promise<services.monetization.InSkillProduct>;
        /**
         * Returns transactions of all in skill products purchases of the customer
         * @param {string} acceptLanguage User&#39;s locale/language in context
         * @param {string} productId Product Id.
         * @param {string} status Transaction status for in skill product purchases. * &#39;PENDING_APPROVAL_BY_PARENT&#39; - The transaction is pending approval from parent. * &#39;APPROVED_BY_PARENT&#39; - The transaction was approved by parent and fulfilled successfully.. * &#39;DENIED_BY_PARENT&#39; - The transaction was declined by parent and hence not fulfilled. * &#39;EXPIRED_NO_ACTION_BY_PARENT&#39; - The transaction was expired due to no response from parent and hence not fulfilled. * &#39;ERROR&#39; - The transaction was not fullfiled as there was an error while processing the transaction.
         * @param {string} fromLastModifiedTime Filter transactions based on last modified time stamp, FROM duration in format (UTC ISO 8601) i.e. yyyy-MM-dd&#39;T&#39;HH:mm:ss.SSS&#39;Z&#39;
         * @param {string} toLastModifiedTime Filter transactions based on last modified time stamp, TO duration in format (UTC ISO 8601) i.e. yyyy-MM-dd&#39;T&#39;HH:mm:ss.SSS&#39;Z&#39;
         * @param {string} nextToken When response to this API call is truncated, the response also includes the nextToken in metadata, the value of which can be used in the next request as the continuation-token to list the next set of objects. The continuation token is an opaque value that In-Skill Products API understands. Token has expiry of 24 hours.
         * @param {number} maxResults sets the maximum number of results returned in the response body. If you want to retrieve fewer than upper limit of 100 results, you can add this parameter to your request. maxResults should not exceed the upper limit. The response might contain fewer results than maxResults, but it will never contain more. If there are additional results that satisfy the search criteria, but these results were not returned because maxResults was exceeded, the response contains nextToken which can be used to fetch next set of result.
         */
        callGetInSkillProductsTransactions(acceptLanguage: string, productId?: string, status?: string, fromLastModifiedTime?: string, toLastModifiedTime?: string, nextToken?: string, maxResults?: number): Promise<ApiResponse>;
        /**
         * Returns transactions of all in skill products purchases of the customer
         * @param {string} acceptLanguage User&#39;s locale/language in context
         * @param {string} productId Product Id.
         * @param {string} status Transaction status for in skill product purchases. * &#39;PENDING_APPROVAL_BY_PARENT&#39; - The transaction is pending approval from parent. * &#39;APPROVED_BY_PARENT&#39; - The transaction was approved by parent and fulfilled successfully.. * &#39;DENIED_BY_PARENT&#39; - The transaction was declined by parent and hence not fulfilled. * &#39;EXPIRED_NO_ACTION_BY_PARENT&#39; - The transaction was expired due to no response from parent and hence not fulfilled. * &#39;ERROR&#39; - The transaction was not fullfiled as there was an error while processing the transaction.
         * @param {string} fromLastModifiedTime Filter transactions based on last modified time stamp, FROM duration in format (UTC ISO 8601) i.e. yyyy-MM-dd&#39;T&#39;HH:mm:ss.SSS&#39;Z&#39;
         * @param {string} toLastModifiedTime Filter transactions based on last modified time stamp, TO duration in format (UTC ISO 8601) i.e. yyyy-MM-dd&#39;T&#39;HH:mm:ss.SSS&#39;Z&#39;
         * @param {string} nextToken When response to this API call is truncated, the response also includes the nextToken in metadata, the value of which can be used in the next request as the continuation-token to list the next set of objects. The continuation token is an opaque value that In-Skill Products API understands. Token has expiry of 24 hours.
         * @param {number} maxResults sets the maximum number of results returned in the response body. If you want to retrieve fewer than upper limit of 100 results, you can add this parameter to your request. maxResults should not exceed the upper limit. The response might contain fewer results than maxResults, but it will never contain more. If there are additional results that satisfy the search criteria, but these results were not returned because maxResults was exceeded, the response contains nextToken which can be used to fetch next set of result.
         */
        getInSkillProductsTransactions(acceptLanguage: string, productId?: string, status?: string, fromLastModifiedTime?: string, toLastModifiedTime?: string, nextToken?: string, maxResults?: number): Promise<services.monetization.InSkillProductTransactionsResponse>;
        /**
         * Returns whether or not voice purchasing is enabled for the skill
         */
        callGetVoicePurchaseSetting(): Promise<ApiResponse>;
        /**
         * Returns whether or not voice purchasing is enabled for the skill
         */
        getVoicePurchaseSetting(): Promise<boolean>;
    }
}
export declare namespace services.proactiveEvents {
    /**
     *
    */
    class ProactiveEventsServiceClient extends BaseServiceClient {
        private lwaServiceClient;
        private userAgent;
        constructor(apiConfiguration: ApiConfiguration, authenticationConfiguration: AuthenticationConfiguration, customUserAgent?: string);
        /**
         * Create a new proactive event in live stage.
         * @param {services.proactiveEvents.CreateProactiveEventRequest} createProactiveEventRequest Request to create a new proactive event.
         */
        callCreateProactiveEvent(createProactiveEventRequest: services.proactiveEvents.CreateProactiveEventRequest, stage: services.proactiveEvents.SkillStage): Promise<ApiResponse>;
        /**
         * Create a new proactive event in live stage.
         * @param {services.proactiveEvents.CreateProactiveEventRequest} createProactiveEventRequest Request to create a new proactive event.
         */
        createProactiveEvent(createProactiveEventRequest: services.proactiveEvents.CreateProactiveEventRequest, stage: services.proactiveEvents.SkillStage): Promise<void>;
    }
}
export declare namespace services.reminderManagement {
    /**
     *
    */
    class ReminderManagementServiceClient extends BaseServiceClient {
        private userAgent;
        constructor(apiConfiguration: ApiConfiguration, customUserAgent?: string);
        /**
         * This API is invoked by the skill to delete a single reminder.
         * @param {string} alertToken
         */
        callDeleteReminder(alertToken: string): Promise<ApiResponse>;
        /**
         * This API is invoked by the skill to delete a single reminder.
         * @param {string} alertToken
         */
        deleteReminder(alertToken: string): Promise<void>;
        /**
         * This API is invoked by the skill to get a single reminder.
         * @param {string} alertToken
         */
        callGetReminder(alertToken: string): Promise<ApiResponse>;
        /**
         * This API is invoked by the skill to get a single reminder.
         * @param {string} alertToken
         */
        getReminder(alertToken: string): Promise<services.reminderManagement.GetReminderResponse>;
        /**
         * This API is invoked by the skill to update a reminder.
         * @param {string} alertToken
         * @param {services.reminderManagement.ReminderRequest} reminderRequest
         */
        callUpdateReminder(alertToken: string, reminderRequest: services.reminderManagement.ReminderRequest): Promise<ApiResponse>;
        /**
         * This API is invoked by the skill to update a reminder.
         * @param {string} alertToken
         * @param {services.reminderManagement.ReminderRequest} reminderRequest
         */
        updateReminder(alertToken: string, reminderRequest: services.reminderManagement.ReminderRequest): Promise<services.reminderManagement.ReminderResponse>;
        /**
         * This API is invoked by the skill to get a all reminders created by the caller.
         */
        callGetReminders(): Promise<ApiResponse>;
        /**
         * This API is invoked by the skill to get a all reminders created by the caller.
         */
        getReminders(): Promise<services.reminderManagement.GetRemindersResponse>;
        /**
         * This API is invoked by the skill to create a new reminder.
         * @param {services.reminderManagement.ReminderRequest} reminderRequest
         */
        callCreateReminder(reminderRequest: services.reminderManagement.ReminderRequest): Promise<ApiResponse>;
        /**
         * This API is invoked by the skill to create a new reminder.
         * @param {services.reminderManagement.ReminderRequest} reminderRequest
         */
        createReminder(reminderRequest: services.reminderManagement.ReminderRequest): Promise<services.reminderManagement.ReminderResponse>;
    }
}
export declare namespace services.skillMessaging {
    /**
     *
    */
    class SkillMessagingServiceClient extends BaseServiceClient {
        private lwaServiceClient;
        private userAgent;
        constructor(apiConfiguration: ApiConfiguration, authenticationConfiguration: AuthenticationConfiguration, customUserAgent?: string);
        /**
         * Send a message request to a skill for a specified user.
         * @param {string} userId The user Id for the specific user to send the message
         * @param {services.skillMessaging.SendSkillMessagingRequest} sendSkillMessagingRequest Message Request to be sent to the skill.
         */
        callSendSkillMessage(userId: string, sendSkillMessagingRequest: services.skillMessaging.SendSkillMessagingRequest): Promise<ApiResponse>;
        /**
         * Send a message request to a skill for a specified user.
         * @param {string} userId The user Id for the specific user to send the message
         * @param {services.skillMessaging.SendSkillMessagingRequest} sendSkillMessagingRequest Message Request to be sent to the skill.
         */
        sendSkillMessage(userId: string, sendSkillMessagingRequest: services.skillMessaging.SendSkillMessagingRequest): Promise<void>;
    }
}
export declare namespace services.timerManagement {
    /**
     *
    */
    class TimerManagementServiceClient extends BaseServiceClient {
        private userAgent;
        constructor(apiConfiguration: ApiConfiguration, customUserAgent?: string);
        /**
         * Delete all timers created by the skill.
         */
        callDeleteTimers(): Promise<ApiResponse>;
        /**
         * Delete all timers created by the skill.
         */
        deleteTimers(): Promise<void>;
        /**
         * Get all timers created by the skill.
         */
        callGetTimers(): Promise<ApiResponse>;
        /**
         * Get all timers created by the skill.
         */
        getTimers(): Promise<services.timerManagement.TimersResponse>;
        /**
         * Delete a timer by ID.
         * @param {string} id
         */
        callDeleteTimer(id: string): Promise<ApiResponse>;
        /**
         * Delete a timer by ID.
         * @param {string} id
         */
        deleteTimer(id: string): Promise<void>;
        /**
         * Get timer by ID.
         * @param {string} id
         */
        callGetTimer(id: string): Promise<ApiResponse>;
        /**
         * Get timer by ID.
         * @param {string} id
         */
        getTimer(id: string): Promise<services.timerManagement.TimerResponse>;
        /**
         * Pause a timer.
         * @param {string} id
         */
        callPauseTimer(id: string): Promise<ApiResponse>;
        /**
         * Pause a timer.
         * @param {string} id
         */
        pauseTimer(id: string): Promise<void>;
        /**
         * Resume a timer.
         * @param {string} id
         */
        callResumeTimer(id: string): Promise<ApiResponse>;
        /**
         * Resume a timer.
         * @param {string} id
         */
        resumeTimer(id: string): Promise<void>;
        /**
         * Create a new timer.
         * @param {services.timerManagement.TimerRequest} timerRequest
         */
        callCreateTimer(timerRequest: services.timerManagement.TimerRequest): Promise<ApiResponse>;
        /**
         * Create a new timer.
         * @param {services.timerManagement.TimerRequest} timerRequest
         */
        createTimer(timerRequest: services.timerManagement.TimerRequest): Promise<services.timerManagement.TimerResponse>;
    }
}
export declare namespace services.ups {
    /**
     *
    */
    class UpsServiceClient extends BaseServiceClient {
        private userAgent;
        constructor(apiConfiguration: ApiConfiguration, customUserAgent?: string);
        /**
         * Gets the email address of the customer associated with the current enablement. Requires customer consent for scopes: [alexa::profile:email:read]
         */
        callGetProfileEmail(): Promise<ApiResponse>;
        /**
         * Gets the email address of the customer associated with the current enablement. Requires customer consent for scopes: [alexa::profile:email:read]
         */
        getProfileEmail(): Promise<string>;
        /**
         * Gets the given name (first name) of the customer associated with the current enablement. Requires customer consent for scopes: [alexa::profile:given_name:read]
         */
        callGetProfileGivenName(): Promise<ApiResponse>;
        /**
         * Gets the given name (first name) of the customer associated with the current enablement. Requires customer consent for scopes: [alexa::profile:given_name:read]
         */
        getProfileGivenName(): Promise<string>;
        /**
         * Gets the mobile phone number of the customer associated with the current enablement. Requires customer consent for scopes: [alexa::profile:mobile_number:read]
         */
        callGetProfileMobileNumber(): Promise<ApiResponse>;
        /**
         * Gets the mobile phone number of the customer associated with the current enablement. Requires customer consent for scopes: [alexa::profile:mobile_number:read]
         */
        getProfileMobileNumber(): Promise<services.ups.PhoneNumber>;
        /**
         * Gets the full name of the customer associated with the current enablement. Requires customer consent for scopes: [alexa::profile:name:read]
         */
        callGetProfileName(): Promise<ApiResponse>;
        /**
         * Gets the full name of the customer associated with the current enablement. Requires customer consent for scopes: [alexa::profile:name:read]
         */
        getProfileName(): Promise<string>;
        /**
         * Gets the distance measurement unit of the device. Does not require explict customer consent.
         * @param {string} deviceId The device Id
         */
        callGetSystemDistanceUnits(deviceId: string): Promise<ApiResponse>;
        /**
         * Gets the distance measurement unit of the device. Does not require explict customer consent.
         * @param {string} deviceId The device Id
         */
        getSystemDistanceUnits(deviceId: string): Promise<services.ups.DistanceUnits>;
        /**
         * Gets the temperature measurement units of the device. Does not require explict customer consent.
         * @param {string} deviceId The device Id
         */
        callGetSystemTemperatureUnit(deviceId: string): Promise<ApiResponse>;
        /**
         * Gets the temperature measurement units of the device. Does not require explict customer consent.
         * @param {string} deviceId The device Id
         */
        getSystemTemperatureUnit(deviceId: string): Promise<services.ups.TemperatureUnit>;
        /**
         * Gets the time zone of the device. Does not require explict customer consent.
         * @param {string} deviceId The device Id
         */
        callGetSystemTimeZone(deviceId: string): Promise<ApiResponse>;
        /**
         * Gets the time zone of the device. Does not require explict customer consent.
         * @param {string} deviceId The device Id
         */
        getSystemTimeZone(deviceId: string): Promise<string>;
        /**
         * Gets the given name (first name) of the recognized speaker at person-level. Requires speaker consent at person-level for scopes: [alexa::profile:given_name:read]
         */
        callGetPersonsProfileGivenName(): Promise<ApiResponse>;
        /**
         * Gets the given name (first name) of the recognized speaker at person-level. Requires speaker consent at person-level for scopes: [alexa::profile:given_name:read]
         */
        getPersonsProfileGivenName(): Promise<string>;
        /**
         * Gets the mobile phone number of the recognized speaker at person-level. Requires speaker consent at person-level for scopes: [alexa::profile:mobile_number:read]
         */
        callGetPersonsProfileMobileNumber(): Promise<ApiResponse>;
        /**
         * Gets the mobile phone number of the recognized speaker at person-level. Requires speaker consent at person-level for scopes: [alexa::profile:mobile_number:read]
         */
        getPersonsProfileMobileNumber(): Promise<services.ups.PhoneNumber>;
        /**
         * Gets the full name of the recognized speaker at person-level. Requires speaker consent at person-level for scopes: [alexa::profile:name:read]
         */
        callGetPersonsProfileName(): Promise<ApiResponse>;
        /**
         * Gets the full name of the recognized speaker at person-level. Requires speaker consent at person-level for scopes: [alexa::profile:name:read]
         */
        getPersonsProfileName(): Promise<string>;
    }
}
export declare namespace services {
    /**
     * Helper class that instantiates an ServiceClient implementation automatically resolving its
     * required ApiConfiguration.
     * @export
     * @class ServiceClientFactory
     */
    class ServiceClientFactory {
        protected apiConfiguration: ApiConfiguration;
        constructor(apiConfiguration: ApiConfiguration);
        getDeviceAddressServiceClient(): deviceAddress.DeviceAddressServiceClient;
        getDirectiveServiceClient(): directive.DirectiveServiceClient;
        getEndpointEnumerationServiceClient(): endpointEnumeration.EndpointEnumerationServiceClient;
        getListManagementServiceClient(): listManagement.ListManagementServiceClient;
        getMonetizationServiceClient(): monetization.MonetizationServiceClient;
        getReminderManagementServiceClient(): reminderManagement.ReminderManagementServiceClient;
        getTimerManagementServiceClient(): timerManagement.TimerManagementServiceClient;
        getUpsServiceClient(): ups.UpsServiceClient;
    }
}
