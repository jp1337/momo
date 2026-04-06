"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __commonJS = (cb, mod) => function __require() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// node_modules/ask-sdk-runtime/dist/dispatcher/error/mapper/GenericErrorMapper.js
var require_GenericErrorMapper = __commonJS({
  "node_modules/ask-sdk-runtime/dist/dispatcher/error/mapper/GenericErrorMapper.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.GenericErrorMapper = void 0;
    var GenericErrorMapper = class {
      constructor(options) {
        this.errorHandlers = options.errorHandlers;
      }
      async getErrorHandler(handlerInput, error) {
        for (const errorHandler of this.errorHandlers) {
          if (await errorHandler.canHandle(handlerInput, error)) {
            return errorHandler;
          }
        }
        return null;
      }
    };
    exports2.GenericErrorMapper = GenericErrorMapper;
  }
});

// node_modules/ask-sdk-runtime/dist/dispatcher/request/handler/GenericHandlerAdapter.js
var require_GenericHandlerAdapter = __commonJS({
  "node_modules/ask-sdk-runtime/dist/dispatcher/request/handler/GenericHandlerAdapter.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.GenericHandlerAdapter = void 0;
    var GenericHandlerAdapter = class {
      supports(handler2) {
        return typeof handler2.canHandle === "function" && typeof handler2.handle === "function";
      }
      async execute(input, handler2) {
        return handler2.handle(input);
      }
    };
    exports2.GenericHandlerAdapter = GenericHandlerAdapter;
  }
});

// node_modules/ask-sdk-runtime/dist/dispatcher/request/handler/GenericRequestHandlerChain.js
var require_GenericRequestHandlerChain = __commonJS({
  "node_modules/ask-sdk-runtime/dist/dispatcher/request/handler/GenericRequestHandlerChain.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.GenericRequestHandlerChain = void 0;
    var GenericRequestHandlerChain = class {
      constructor(options) {
        this.requestHandler = options.requestHandler;
        this.requestInterceptors = options.requestInterceptors;
        this.responseInterceptors = options.responseInterceptors;
      }
      getRequestHandler() {
        return this.requestHandler;
      }
      getRequestInterceptors() {
        return this.requestInterceptors;
      }
      getResponseInterceptors() {
        return this.responseInterceptors;
      }
    };
    exports2.GenericRequestHandlerChain = GenericRequestHandlerChain;
  }
});

// node_modules/ask-sdk-runtime/dist/dispatcher/request/mapper/GenericRequestMapper.js
var require_GenericRequestMapper = __commonJS({
  "node_modules/ask-sdk-runtime/dist/dispatcher/request/mapper/GenericRequestMapper.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.GenericRequestMapper = void 0;
    var GenericRequestMapper = class {
      constructor(options) {
        this.requestHandlerChains = options.requestHandlerChains;
      }
      async getRequestHandlerChain(input) {
        for (const requestHandlerChain of this.requestHandlerChains) {
          const requestHandler = requestHandlerChain.getRequestHandler();
          if (await requestHandler.canHandle(input)) {
            return requestHandlerChain;
          }
        }
        return null;
      }
    };
    exports2.GenericRequestMapper = GenericRequestMapper;
  }
});

// node_modules/ask-sdk-runtime/dist/util/AskSdkUtils.js
var require_AskSdkUtils = __commonJS({
  "node_modules/ask-sdk-runtime/dist/util/AskSdkUtils.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.createAskSdkUserAgent = exports2.createAskSdkError = void 0;
    function createAskSdkError(errorScope, errorMessage) {
      const error = new Error(errorMessage);
      error.name = `AskSdk.${errorScope} Error`;
      return error;
    }
    exports2.createAskSdkError = createAskSdkError;
    function createAskSdkUserAgent(packageVersion, customUserAgent) {
      const customUserAgentString = customUserAgent ? ` ${customUserAgent}` : "";
      return `ask-node/${packageVersion} Node/${process.version}${customUserAgentString}`;
    }
    exports2.createAskSdkUserAgent = createAskSdkUserAgent;
  }
});

// node_modules/ask-sdk-runtime/dist/skill/RuntimeConfigurationBuilder.js
var require_RuntimeConfigurationBuilder = __commonJS({
  "node_modules/ask-sdk-runtime/dist/skill/RuntimeConfigurationBuilder.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.RuntimeConfigurationBuilder = void 0;
    var GenericErrorMapper_1 = require_GenericErrorMapper();
    var GenericHandlerAdapter_1 = require_GenericHandlerAdapter();
    var GenericRequestHandlerChain_1 = require_GenericRequestHandlerChain();
    var GenericRequestMapper_1 = require_GenericRequestMapper();
    var AskSdkUtils_1 = require_AskSdkUtils();
    var RuntimeConfigurationBuilder = class {
      constructor() {
        this.requestHandlerChains = [];
        this.requestInterceptors = [];
        this.responseInterceptors = [];
        this.errorHandlers = [];
      }
      addRequestHandler(matcher, executor) {
        if (typeof matcher !== "function" || typeof executor !== "function") {
          throw (0, AskSdkUtils_1.createAskSdkError)(this.constructor.name, `Incompatible matcher type: ${typeof matcher}`);
        }
        this.requestHandlerChains.push(new GenericRequestHandlerChain_1.GenericRequestHandlerChain({
          requestHandler: {
            canHandle: matcher,
            handle: executor
          }
        }));
        return this;
      }
      addRequestHandlers(...requestHandlers) {
        for (const requestHandler of requestHandlers) {
          this.requestHandlerChains.push(new GenericRequestHandlerChain_1.GenericRequestHandlerChain({
            requestHandler
          }));
        }
        return this;
      }
      addRequestInterceptors(...executors) {
        for (const executor of executors) {
          switch (typeof executor) {
            case "object": {
              this.requestInterceptors.push(executor);
              break;
            }
            case "function": {
              this.requestInterceptors.push({
                process: executor
              });
              break;
            }
            default: {
              throw (0, AskSdkUtils_1.createAskSdkError)(this.constructor.name, `Incompatible executor type: ${typeof executor}`);
            }
          }
        }
        return this;
      }
      addResponseInterceptors(...executors) {
        for (const executor of executors) {
          switch (typeof executor) {
            case "object": {
              this.responseInterceptors.push(executor);
              break;
            }
            case "function": {
              this.responseInterceptors.push({
                process: executor
              });
              break;
            }
            default: {
              throw (0, AskSdkUtils_1.createAskSdkError)("SkillBuilderError", `Incompatible executor type: ${typeof executor}`);
            }
          }
        }
        return this;
      }
      addErrorHandler(matcher, executor) {
        this.errorHandlers.push({
          canHandle: matcher,
          handle: executor
        });
        return this;
      }
      addErrorHandlers(...errorHandlers) {
        this.errorHandlers.push(...errorHandlers);
        return this;
      }
      getRuntimeConfiguration() {
        const requestMapper = new GenericRequestMapper_1.GenericRequestMapper({
          requestHandlerChains: this.requestHandlerChains
        });
        const errorMapper = this.errorHandlers.length ? new GenericErrorMapper_1.GenericErrorMapper({
          errorHandlers: this.errorHandlers
        }) : void 0;
        return {
          requestMappers: [requestMapper],
          handlerAdapters: [new GenericHandlerAdapter_1.GenericHandlerAdapter()],
          errorMapper,
          requestInterceptors: this.requestInterceptors,
          responseInterceptors: this.responseInterceptors
        };
      }
    };
    exports2.RuntimeConfigurationBuilder = RuntimeConfigurationBuilder;
  }
});

// node_modules/ask-sdk-runtime/dist/dispatcher/GenericRequestDispatcher.js
var require_GenericRequestDispatcher = __commonJS({
  "node_modules/ask-sdk-runtime/dist/dispatcher/GenericRequestDispatcher.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.GenericRequestDispatcher = void 0;
    var AskSdkUtils_1 = require_AskSdkUtils();
    var GenericRequestDispatcher = class {
      constructor(options) {
        this.requestMappers = options.requestMappers;
        this.handlerAdapters = options.handlerAdapters;
        this.errorMapper = options.errorMapper;
        this.requestInterceptors = options.requestInterceptors;
        this.responseInterceptors = options.responseInterceptors;
      }
      /**
       * Main entry point for dispatching logic.
       * Dispatches handlerInput to requestHandlers and error, if any, to errorHandlers
       * @param input
       */
      async dispatch(input) {
        let output;
        try {
          if (this.requestInterceptors) {
            for (const requestInterceptor of this.requestInterceptors) {
              await requestInterceptor.process(input);
            }
          }
          output = await this.dispatchRequest(input);
          if (this.responseInterceptors) {
            for (const responseInterceptor of this.responseInterceptors) {
              await responseInterceptor.process(input, output);
            }
          }
        } catch (err) {
          output = await this.dispatchError(input, err);
        }
        return output;
      }
      /**
       * Main logic for request dispatching.
       * @param input
       */
      async dispatchRequest(input) {
        let handlerChain;
        for (const requestMapper of this.requestMappers) {
          handlerChain = await requestMapper.getRequestHandlerChain(input);
          if (handlerChain) {
            break;
          }
        }
        if (!handlerChain) {
          throw (0, AskSdkUtils_1.createAskSdkError)(this.constructor.name, `Unable to find a suitable request handler.`);
        }
        const handler2 = handlerChain.getRequestHandler();
        const requestInterceptors = handlerChain.getRequestInterceptors();
        const responseInterceptors = handlerChain.getResponseInterceptors();
        let adapter;
        for (const handlerAdapter of this.handlerAdapters) {
          if (handlerAdapter.supports(handler2)) {
            adapter = handlerAdapter;
            break;
          }
        }
        if (!adapter) {
          throw (0, AskSdkUtils_1.createAskSdkError)(this.constructor.name, `Unable to find a suitable handler adapter.`);
        }
        if (requestInterceptors) {
          for (const requestInterceptor of requestInterceptors) {
            await requestInterceptor.process(input);
          }
        }
        const output = await adapter.execute(input, handler2);
        if (responseInterceptors) {
          for (const responseInterceptor of responseInterceptors) {
            await responseInterceptor.process(input, output);
          }
        }
        return output;
      }
      /**
       * Main logic for error dispatching.
       * @param input
       * @param error
       */
      async dispatchError(input, error) {
        if (this.errorMapper) {
          const handler2 = await this.errorMapper.getErrorHandler(input, error);
          if (handler2) {
            return handler2.handle(input, error);
          }
        }
        throw error;
      }
    };
    exports2.GenericRequestDispatcher = GenericRequestDispatcher;
  }
});

// node_modules/ask-sdk-runtime/dist/util/UserAgentManager.js
var require_UserAgentManager = __commonJS({
  "node_modules/ask-sdk-runtime/dist/util/UserAgentManager.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.UserAgentManager = void 0;
    var UserAgentManager = class {
      /**
       * Retrieves the full user agent string, containing all registered components.
       */
      static getUserAgent() {
        return this.userAgent;
      }
      /**
       * Registers a user agent component. This will be appended to the generated
       * user agent string. Duplicate components will be ignored.
       *
       * @param component string component to add to the full user agent
       */
      static registerComponent(component) {
        if (!this.components.has(component)) {
          this.components.add(component);
          let updatedUserAgent;
          for (const component2 of this.components) {
            updatedUserAgent = updatedUserAgent ? `${updatedUserAgent} ${component2}` : component2;
          }
          this.userAgent = updatedUserAgent;
        }
      }
    };
    exports2.UserAgentManager = UserAgentManager;
    UserAgentManager.components = /* @__PURE__ */ new Set();
    UserAgentManager.userAgent = "";
  }
});

// node_modules/ask-sdk-runtime/dist/index.js
var require_dist = __commonJS({
  "node_modules/ask-sdk-runtime/dist/index.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.UserAgentManager = exports2.createAskSdkUserAgent = exports2.createAskSdkError = exports2.GenericRequestDispatcher = exports2.RuntimeConfigurationBuilder = exports2.GenericRequestMapper = exports2.GenericRequestHandlerChain = exports2.GenericHandlerAdapter = exports2.GenericErrorMapper = void 0;
    var GenericErrorMapper_1 = require_GenericErrorMapper();
    Object.defineProperty(exports2, "GenericErrorMapper", { enumerable: true, get: function() {
      return GenericErrorMapper_1.GenericErrorMapper;
    } });
    var GenericHandlerAdapter_1 = require_GenericHandlerAdapter();
    Object.defineProperty(exports2, "GenericHandlerAdapter", { enumerable: true, get: function() {
      return GenericHandlerAdapter_1.GenericHandlerAdapter;
    } });
    var GenericRequestHandlerChain_1 = require_GenericRequestHandlerChain();
    Object.defineProperty(exports2, "GenericRequestHandlerChain", { enumerable: true, get: function() {
      return GenericRequestHandlerChain_1.GenericRequestHandlerChain;
    } });
    var GenericRequestMapper_1 = require_GenericRequestMapper();
    Object.defineProperty(exports2, "GenericRequestMapper", { enumerable: true, get: function() {
      return GenericRequestMapper_1.GenericRequestMapper;
    } });
    var RuntimeConfigurationBuilder_1 = require_RuntimeConfigurationBuilder();
    Object.defineProperty(exports2, "RuntimeConfigurationBuilder", { enumerable: true, get: function() {
      return RuntimeConfigurationBuilder_1.RuntimeConfigurationBuilder;
    } });
    var GenericRequestDispatcher_1 = require_GenericRequestDispatcher();
    Object.defineProperty(exports2, "GenericRequestDispatcher", { enumerable: true, get: function() {
      return GenericRequestDispatcher_1.GenericRequestDispatcher;
    } });
    var AskSdkUtils_1 = require_AskSdkUtils();
    Object.defineProperty(exports2, "createAskSdkError", { enumerable: true, get: function() {
      return AskSdkUtils_1.createAskSdkError;
    } });
    Object.defineProperty(exports2, "createAskSdkUserAgent", { enumerable: true, get: function() {
      return AskSdkUtils_1.createAskSdkUserAgent;
    } });
    var UserAgentManager_1 = require_UserAgentManager();
    Object.defineProperty(exports2, "UserAgentManager", { enumerable: true, get: function() {
      return UserAgentManager_1.UserAgentManager;
    } });
  }
});

// node_modules/ask-sdk-core/dist/attributes/AttributesManagerFactory.js
var require_AttributesManagerFactory = __commonJS({
  "node_modules/ask-sdk-core/dist/attributes/AttributesManagerFactory.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.AttributesManagerFactory = void 0;
    var ask_sdk_runtime_1 = require_dist();
    var AttributesManagerFactory = class {
      static init(options) {
        if (!options.requestEnvelope) {
          throw (0, ask_sdk_runtime_1.createAskSdkError)("AttributesManagerFactory", "RequestEnvelope cannot be null or undefined!");
        }
        let thisRequestAttributes = {};
        let thisSessionAttributes = options.requestEnvelope.session ? options.requestEnvelope.session.attributes ? JSON.parse(JSON.stringify(options.requestEnvelope.session.attributes)) : {} : void 0;
        let thisPersistentAttributes;
        let persistentAttributesSet = false;
        return {
          getRequestAttributes() {
            return thisRequestAttributes;
          },
          getSessionAttributes() {
            if (!options.requestEnvelope.session) {
              throw (0, ask_sdk_runtime_1.createAskSdkError)("AttributesManager", "Cannot get SessionAttributes from out of session request!");
            }
            return thisSessionAttributes;
          },
          async getPersistentAttributes(useSessionCache = true, defaultAttributes) {
            if (!options.persistenceAdapter) {
              throw (0, ask_sdk_runtime_1.createAskSdkError)("AttributesManager", "Cannot get PersistentAttributes without PersistenceManager");
            }
            if (!persistentAttributesSet || !useSessionCache) {
              thisPersistentAttributes = await options.persistenceAdapter.getAttributes(options.requestEnvelope);
              persistentAttributesSet = true;
            }
            if (defaultAttributes && (!thisPersistentAttributes || Object.keys(thisPersistentAttributes).length < 1)) {
              thisPersistentAttributes = defaultAttributes;
            }
            return thisPersistentAttributes;
          },
          setRequestAttributes(requestAttributes) {
            thisRequestAttributes = requestAttributes;
          },
          setSessionAttributes(sessionAttributes) {
            if (!options.requestEnvelope.session) {
              throw (0, ask_sdk_runtime_1.createAskSdkError)("AttributesManager", "Cannot set SessionAttributes to out of session request!");
            }
            thisSessionAttributes = sessionAttributes;
          },
          setPersistentAttributes(persistentAttributes) {
            if (!options.persistenceAdapter) {
              throw (0, ask_sdk_runtime_1.createAskSdkError)("AttributesManager", "Cannot set PersistentAttributes without persistence adapter!");
            }
            thisPersistentAttributes = persistentAttributes;
            persistentAttributesSet = true;
          },
          async savePersistentAttributes() {
            if (!options.persistenceAdapter) {
              throw (0, ask_sdk_runtime_1.createAskSdkError)("AttributesManager", "Cannot save PersistentAttributes without persistence adapter!");
            }
            if (persistentAttributesSet) {
              await options.persistenceAdapter.saveAttributes(options.requestEnvelope, thisPersistentAttributes);
            }
          },
          async deletePersistentAttributes() {
            if (!options.persistenceAdapter) {
              throw (0, ask_sdk_runtime_1.createAskSdkError)("AttributesManager", "Cannot delete PersistentAttributes without persistence adapter!");
            }
            await options.persistenceAdapter.deleteAttributes(options.requestEnvelope);
            thisPersistentAttributes = void 0;
            persistentAttributesSet = false;
          }
        };
      }
      constructor() {
      }
    };
    exports2.AttributesManagerFactory = AttributesManagerFactory;
  }
});

// node_modules/ask-sdk-core/dist/util/RequestEnvelopeUtils.js
var require_RequestEnvelopeUtils = __commonJS({
  "node_modules/ask-sdk-core/dist/util/RequestEnvelopeUtils.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.generateSlotsFromApiRequest = exports2.isNewSession = exports2.getSupportedInterfaces = exports2.getSimpleSlotValues = exports2.getSlotValueV2 = exports2.getSlotValue = exports2.getSlot = exports2.getDialogState = exports2.getUserId = exports2.getDeviceId = exports2.getApiAccessToken = exports2.getAccountLinkingAccessToken = exports2.getRequest = exports2.getIntentName = exports2.getRequestType = exports2.getLocale = void 0;
    var ask_sdk_runtime_1 = require_dist();
    function getLocale(requestEnvelope) {
      return requestEnvelope.request.locale;
    }
    exports2.getLocale = getLocale;
    function getRequestType(requestEnvelope) {
      return requestEnvelope.request.type;
    }
    exports2.getRequestType = getRequestType;
    function getIntentName6(requestEnvelope) {
      if (getRequestType(requestEnvelope) === "IntentRequest") {
        return requestEnvelope.request.intent.name;
      }
      throw (0, ask_sdk_runtime_1.createAskSdkError)("RequestEnvelopeUtils", `Expecting request type of IntentRequest but got ${getRequestType(requestEnvelope)}.`);
    }
    exports2.getIntentName = getIntentName6;
    function getRequest(requestEnvelope) {
      return requestEnvelope.request;
    }
    exports2.getRequest = getRequest;
    function getAccountLinkingAccessToken(requestEnvelope) {
      return requestEnvelope.context.System.user.accessToken;
    }
    exports2.getAccountLinkingAccessToken = getAccountLinkingAccessToken;
    function getApiAccessToken(requestEnvelope) {
      return requestEnvelope.context.System.apiAccessToken;
    }
    exports2.getApiAccessToken = getApiAccessToken;
    function getDeviceId(requestEnvelope) {
      return requestEnvelope.context.System.device ? requestEnvelope.context.System.device.deviceId : null;
    }
    exports2.getDeviceId = getDeviceId;
    function getUserId(requestEnvelope) {
      return requestEnvelope.context.System.user ? requestEnvelope.context.System.user.userId : null;
    }
    exports2.getUserId = getUserId;
    function getDialogState(requestEnvelope) {
      if (getRequestType(requestEnvelope) === "IntentRequest") {
        return requestEnvelope.request.dialogState;
      }
      throw (0, ask_sdk_runtime_1.createAskSdkError)("RequestEnvelopeUtils", `Expecting request type of IntentRequest but got ${getRequestType(requestEnvelope)}.`);
    }
    exports2.getDialogState = getDialogState;
    function getSlot(requestEnvelope, slotName) {
      if (getRequestType(requestEnvelope) === "IntentRequest") {
        const slots = requestEnvelope.request.intent.slots;
        if (slots != null) {
          return slots[slotName];
        }
        return null;
      }
      throw (0, ask_sdk_runtime_1.createAskSdkError)("RequestEnvelopeUtils", `Expecting request type of IntentRequest but got ${getRequestType(requestEnvelope)}.`);
    }
    exports2.getSlot = getSlot;
    function getSlotValue(requestEnvelope, slotName) {
      if (getRequestType(requestEnvelope) === "IntentRequest") {
        const slot = getSlot(requestEnvelope, slotName);
        if (slot) {
          return slot.value;
        }
        return null;
      }
      throw (0, ask_sdk_runtime_1.createAskSdkError)("RequestEnvelopeUtils", `Expecting request type of IntentRequest but got ${getRequestType(requestEnvelope)}.`);
    }
    exports2.getSlotValue = getSlotValue;
    function getSlotValueV2(requestEnvelope, slotName) {
      const slot = getSlot(requestEnvelope, slotName);
      if (slot && slot.slotValue) {
        return slot.slotValue;
      }
      return null;
    }
    exports2.getSlotValueV2 = getSlotValueV2;
    function getSimpleSlotValues(slotValue) {
      if (slotValue.type === "Simple") {
        return [slotValue];
      }
      if (slotValue.type === "List" && slotValue.values) {
        return slotValue.values.reduce((simpleSlotValues, value) => simpleSlotValues.concat(getSimpleSlotValues(value)), []);
      }
      return [];
    }
    exports2.getSimpleSlotValues = getSimpleSlotValues;
    function getSupportedInterfaces(requestEnvelope) {
      var _a, _b;
      return (_b = (_a = requestEnvelope.context.System.device) === null || _a === void 0 ? void 0 : _a.supportedInterfaces) !== null && _b !== void 0 ? _b : {};
    }
    exports2.getSupportedInterfaces = getSupportedInterfaces;
    function isNewSession(requestEnvelope) {
      const session = requestEnvelope.session;
      if (session) {
        return session.new;
      }
      throw (0, ask_sdk_runtime_1.createAskSdkError)("RequestEnvelopeUtils", `The provided request doesn't contain a session.`);
    }
    exports2.isNewSession = isNewSession;
    function generateSlotsFromApiRequest(apiRequest) {
      if (!apiRequest.slots) {
        return {};
      }
      const intentSlots = {};
      Object.keys(apiRequest.slots).forEach((slotKey) => {
        const slotValue = apiRequest.slots[slotKey];
        const intentSlot = Object.assign(Object.assign({ name: slotKey, confirmationStatus: "NONE" }, slotValue.value ? { value: slotValue.value } : {}), slotValue.resolutions ? { resolutions: slotValue.resolutions } : {});
        intentSlots[slotKey] = intentSlot;
      });
      return intentSlots;
    }
    exports2.generateSlotsFromApiRequest = generateSlotsFromApiRequest;
  }
});

// node_modules/ask-sdk-core/dist/dispatcher/request/handler/DelegateToIntentHandler.js
var require_DelegateToIntentHandler = __commonJS({
  "node_modules/ask-sdk-core/dist/dispatcher/request/handler/DelegateToIntentHandler.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.DelegateToIntentHandler = void 0;
    var RequestEnvelopeUtils_1 = require_RequestEnvelopeUtils();
    var ACDL_AUTOGEN_NAMESPACE = "com.amazon.autogenerated";
    var SPLIT_CHAR = "_";
    var DelegateToIntentHandler = class {
      canHandle(input) {
        if ((0, RequestEnvelopeUtils_1.getRequestType)(input.requestEnvelope) !== "Dialog.API.Invoked") {
          return false;
        }
        if (!input.requestEnvelope.request.apiRequest || !input.requestEnvelope.request.apiRequest.name) {
          return false;
        }
        const apiName = input.requestEnvelope.request.apiRequest.name;
        if (!apiName.startsWith(ACDL_AUTOGEN_NAMESPACE)) {
          return false;
        }
        return true;
      }
      handle(input) {
        const apiRequest = input.requestEnvelope.request.apiRequest;
        const apiName = apiRequest.name;
        const intentName = apiName.substring(apiName.indexOf(SPLIT_CHAR) + 1);
        const directiveType = "Dialog.DelegateRequest";
        const delegationTarget = "skill";
        const updatedRequestType = "IntentRequest";
        const delegationPeriod = {
          until: "EXPLICIT_RETURN"
        };
        const intent = {
          name: intentName,
          confirmationStatus: "NONE",
          slots: (0, RequestEnvelopeUtils_1.generateSlotsFromApiRequest)(apiRequest)
        };
        const updatedRequest = {
          type: updatedRequestType,
          intent
        };
        const delegateRequestDirective = {
          type: directiveType,
          target: delegationTarget,
          period: delegationPeriod,
          updatedRequest
        };
        return input.responseBuilder.addDirective(delegateRequestDirective).getResponse();
      }
    };
    exports2.DelegateToIntentHandler = DelegateToIntentHandler;
  }
});

// node_modules/ask-sdk-core/dist/response/ImageHelper.js
var require_ImageHelper = __commonJS({
  "node_modules/ask-sdk-core/dist/response/ImageHelper.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.ImageHelper = void 0;
    var ImageHelper = class {
      constructor() {
        this.image = {};
      }
      /**
       * Sets content description in image object
       * @param {string} description text used to describe the image for a screen reader
       * @returns {ImageHelper}
       */
      withDescription(description) {
        this.image.contentDescription = description;
        return this;
      }
      /**
       * Add image instance in image object
       * @param {string} url source of the image
       * @param {interfaces.display.ImageSize} size  size of the image. Accepted values:
       * X_SMALL: Displayed within extra small containers
       * SMALL: Displayed within small  containers
       * MEDIUM: Displayed within medium containers
       * LARGE: Displayed within large containers
       * X_LARGE Displayed within extra large containers
       * By default, for Echo Show, size takes the value X_SMALL. If the other size values are included,
       * then the order of precedence for displaying images begins with X_LARGE and proceeds downward,
       * which means that larger images will be downscaled for display on Echo Show if provided.
       * For the best user experience, include the appropriately sized image, and do not include larger images.
       * @param {number} widthPixels widthPixels of the image
       * @param {number} heightPixels heightPixels of the image
       * @returns {ImageHelper}
       */
      addImageInstance(url, size, widthPixels, heightPixels) {
        const imageInstance = {
          url
        };
        if (size) {
          imageInstance.size = size;
        }
        if (heightPixels) {
          imageInstance.heightPixels = heightPixels;
        }
        if (widthPixels) {
          imageInstance.widthPixels = widthPixels;
        }
        if (!this.image.sources) {
          this.image.sources = [imageInstance];
        } else {
          this.image.sources.push(imageInstance);
        }
        return this;
      }
      /**
       * @returns {Image}
       */
      getImage() {
        return this.image;
      }
    };
    exports2.ImageHelper = ImageHelper;
  }
});

// node_modules/ask-sdk-core/dist/response/TextContentHelper.js
var require_TextContentHelper = __commonJS({
  "node_modules/ask-sdk-core/dist/response/TextContentHelper.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.TextContentHelper = void 0;
    var TextContentHelper = class {
      /**
       * @param {string} primaryText
       * @returns {this}
       */
      withPrimaryText(primaryText) {
        this.primaryText = primaryText;
        return this;
      }
      /**
       * @param {string} secondaryText
       * @returns {this}
       */
      withSecondaryText(secondaryText) {
        this.secondaryText = secondaryText;
        return this;
      }
      /**
       * @param {string} tertiaryText
       * @returns {this}
       */
      withTertiaryText(tertiaryText) {
        this.tertiaryText = tertiaryText;
        return this;
      }
    };
    exports2.TextContentHelper = TextContentHelper;
  }
});

// node_modules/ask-sdk-core/dist/response/PlainTextContentHelper.js
var require_PlainTextContentHelper = __commonJS({
  "node_modules/ask-sdk-core/dist/response/PlainTextContentHelper.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.PlainTextContentHelper = void 0;
    var TextContentHelper_1 = require_TextContentHelper();
    var PlainTextContentHelper = class extends TextContentHelper_1.TextContentHelper {
      constructor() {
        super();
      }
      /**
       * @returns {interfaces.display.TextContent}
       */
      getTextContent() {
        const textContent = {};
        if (this.primaryText) {
          textContent.primaryText = {
            type: "PlainText",
            text: this.primaryText
          };
        }
        if (this.secondaryText) {
          textContent.secondaryText = {
            type: "PlainText",
            text: this.secondaryText
          };
        }
        if (this.tertiaryText) {
          textContent.tertiaryText = {
            type: "PlainText",
            text: this.tertiaryText
          };
        }
        return textContent;
      }
    };
    exports2.PlainTextContentHelper = PlainTextContentHelper;
  }
});

// node_modules/ask-sdk-core/dist/response/ResponseFactory.js
var require_ResponseFactory = __commonJS({
  "node_modules/ask-sdk-core/dist/response/ResponseFactory.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.ResponseFactory = void 0;
    var ResponseFactory = class {
      static init() {
        const response = {};
        function isVideoAppLaunchDirectivePresent() {
          if (!response.directives) {
            return false;
          }
          for (const directive of response.directives) {
            if (directive.type === "VideoApp.Launch") {
              return true;
            }
          }
          return false;
        }
        function trimOutputSpeech(speechOutput) {
          if (!speechOutput) {
            return "";
          }
          const speech = speechOutput.trim();
          const length = speech.length;
          if (speech.startsWith("<speak>") && speech.endsWith("</speak>")) {
            return speech.substring(7, length - 8).trim();
          }
          return speech;
        }
        return {
          speak(speechOutput, playBehavior) {
            response.outputSpeech = {
              type: "SSML",
              ssml: `<speak>${trimOutputSpeech(speechOutput)}</speak>`,
              playBehavior
            };
            if (!playBehavior) {
              delete response.outputSpeech.playBehavior;
            }
            return this;
          },
          reprompt(repromptSpeechOutput, playBehavior) {
            if (!response.reprompt) {
              response.reprompt = {};
            }
            response.reprompt.outputSpeech = {
              type: "SSML",
              ssml: `<speak>${trimOutputSpeech(repromptSpeechOutput)}</speak>`,
              playBehavior
            };
            if (!playBehavior) {
              delete response.reprompt.outputSpeech.playBehavior;
            }
            if (!isVideoAppLaunchDirectivePresent()) {
              response.shouldEndSession = false;
            }
            return this;
          },
          withSimpleCard(cardTitle, cardContent) {
            response.card = {
              type: "Simple",
              title: cardTitle,
              content: cardContent
            };
            return this;
          },
          withStandardCard(cardTitle, cardContent, smallImageUrl, largeImageUrl) {
            const card = {
              type: "Standard",
              title: cardTitle,
              text: cardContent
            };
            if (smallImageUrl || largeImageUrl) {
              card.image = {};
              if (smallImageUrl) {
                card.image.smallImageUrl = smallImageUrl;
              }
              if (largeImageUrl) {
                card.image.largeImageUrl = largeImageUrl;
              }
            }
            response.card = card;
            return this;
          },
          withLinkAccountCard() {
            response.card = {
              type: "LinkAccount"
            };
            return this;
          },
          withAskForPermissionsConsentCard(permissionArray) {
            response.card = {
              type: "AskForPermissionsConsent",
              permissions: permissionArray
            };
            return this;
          },
          addDelegateDirective(updatedIntent) {
            const delegateDirective = {
              type: "Dialog.Delegate"
            };
            if (updatedIntent) {
              delegateDirective.updatedIntent = updatedIntent;
            }
            this.addDirective(delegateDirective);
            return this;
          },
          addElicitSlotDirective(slotToElicit, updatedIntent) {
            const elicitSlotDirective = {
              type: "Dialog.ElicitSlot",
              slotToElicit
            };
            if (updatedIntent) {
              elicitSlotDirective.updatedIntent = updatedIntent;
            }
            this.addDirective(elicitSlotDirective);
            return this;
          },
          addConfirmSlotDirective(slotToConfirm, updatedIntent) {
            const confirmSlotDirective = {
              type: "Dialog.ConfirmSlot",
              slotToConfirm
            };
            if (updatedIntent) {
              confirmSlotDirective.updatedIntent = updatedIntent;
            }
            this.addDirective(confirmSlotDirective);
            return this;
          },
          addConfirmIntentDirective(updatedIntent) {
            const confirmIntentDirective = {
              type: "Dialog.ConfirmIntent"
            };
            if (updatedIntent) {
              confirmIntentDirective.updatedIntent = updatedIntent;
            }
            this.addDirective(confirmIntentDirective);
            return this;
          },
          addAudioPlayerPlayDirective(playBehavior, url, token, offsetInMilliseconds, expectedPreviousToken, audioItemMetadata) {
            const stream = {
              url,
              token,
              offsetInMilliseconds
            };
            if (expectedPreviousToken) {
              stream.expectedPreviousToken = expectedPreviousToken;
            }
            const audioItem = {
              stream
            };
            if (audioItemMetadata) {
              audioItem.metadata = audioItemMetadata;
            }
            const playDirective = {
              type: "AudioPlayer.Play",
              playBehavior,
              audioItem
            };
            this.addDirective(playDirective);
            return this;
          },
          addAudioPlayerStopDirective() {
            const stopDirective = {
              type: "AudioPlayer.Stop"
            };
            this.addDirective(stopDirective);
            return this;
          },
          addAudioPlayerClearQueueDirective(clearBehavior) {
            const clearQueueDirective = {
              type: "AudioPlayer.ClearQueue",
              clearBehavior
            };
            this.addDirective(clearQueueDirective);
            return this;
          },
          addRenderTemplateDirective(template) {
            const renderTemplateDirective = {
              type: "Display.RenderTemplate",
              template
            };
            this.addDirective(renderTemplateDirective);
            return this;
          },
          addHintDirective(text) {
            const hint = {
              type: "PlainText",
              text
            };
            const hintDirective = {
              type: "Hint",
              hint
            };
            this.addDirective(hintDirective);
            return this;
          },
          addVideoAppLaunchDirective(source, title, subtitle) {
            const videoItem = {
              source
            };
            if (title || subtitle) {
              videoItem.metadata = {};
              if (title) {
                videoItem.metadata.title = title;
              }
              if (subtitle) {
                videoItem.metadata.subtitle = subtitle;
              }
            }
            const launchDirective = {
              type: "VideoApp.Launch",
              videoItem
            };
            this.addDirective(launchDirective);
            delete response.shouldEndSession;
            return this;
          },
          withCanFulfillIntent(canFulfillIntent) {
            response.canFulfillIntent = canFulfillIntent;
            return this;
          },
          withShouldEndSession(val) {
            if (!isVideoAppLaunchDirectivePresent()) {
              response.shouldEndSession = val;
            }
            return this;
          },
          addDirective(directive) {
            if (!response.directives) {
              response.directives = [];
            }
            response.directives.push(directive);
            return this;
          },
          addDirectiveToReprompt(directive) {
            if (!response.reprompt) {
              response.reprompt = {};
            }
            if (!response.reprompt.directives) {
              response.reprompt.directives = [];
            }
            response.reprompt.directives.push(directive);
            if (!isVideoAppLaunchDirectivePresent()) {
              this.withShouldEndSession(false);
            }
            return this;
          },
          withApiResponse(apiResponse) {
            response.apiResponse = apiResponse;
            return this;
          },
          addExperimentTrigger(experimentId) {
            if (!response.experimentation) {
              const experimentation = {
                triggeredExperiments: []
              };
              response.experimentation = experimentation;
            }
            response.experimentation.triggeredExperiments.push(experimentId);
            return this;
          },
          getResponse() {
            return response;
          }
        };
      }
      constructor() {
      }
    };
    exports2.ResponseFactory = ResponseFactory;
  }
});

// node_modules/ask-sdk-core/dist/response/RichTextContentHelper.js
var require_RichTextContentHelper = __commonJS({
  "node_modules/ask-sdk-core/dist/response/RichTextContentHelper.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.RichTextContentHelper = void 0;
    var TextContentHelper_1 = require_TextContentHelper();
    var RichTextContentHelper = class extends TextContentHelper_1.TextContentHelper {
      constructor() {
        super();
      }
      /**
       * @returns {interfaces.display.TextContent}
       */
      getTextContent() {
        const textContent = {};
        if (this.primaryText) {
          textContent.primaryText = {
            type: "RichText",
            text: this.primaryText
          };
        }
        if (this.secondaryText) {
          textContent.secondaryText = {
            type: "RichText",
            text: this.secondaryText
          };
        }
        if (this.tertiaryText) {
          textContent.tertiaryText = {
            type: "RichText",
            text: this.tertiaryText
          };
        }
        return textContent;
      }
    };
    exports2.RichTextContentHelper = RichTextContentHelper;
  }
});

// node_modules/ask-sdk-core/dist/service/DefaultApiClient.js
var require_DefaultApiClient = __commonJS({
  "node_modules/ask-sdk-core/dist/service/DefaultApiClient.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.DefaultApiClient = void 0;
    var ask_sdk_runtime_1 = require_dist();
    var url = require("url");
    var DefaultApiClient = class {
      /**
       * Dispatches a request to an API endpoint described in the request.
       * An ApiClient is expected to resolve the Promise in the case an API returns a non-200 HTTP
       * status code. The responsibility of translating a particular response code to an error lies with the
       * caller to invoke.
       * @param {services.ApiClientRequest} request request to dispatch to the ApiClient
       * @returns {Promise<services.ApiClientResponse>} response from the ApiClient
       */
      invoke(request) {
        const urlObj = url.parse(request.url);
        const clientRequestOptions = {
          // tslint:disable:object-literal-sort-keys
          hostname: urlObj.hostname,
          path: urlObj.path,
          port: urlObj.port,
          protocol: urlObj.protocol,
          auth: urlObj.auth,
          headers: arrayToObjectHeader(request.headers),
          method: request.method
        };
        const client = clientRequestOptions.protocol === "https:" ? require("https") : require("http");
        return new Promise((resolve, reject) => {
          const clientRequest = client.request(clientRequestOptions, (response) => {
            const chunks = [];
            response.on("data", (chunk) => {
              chunks.push(chunk);
            });
            response.on("end", () => {
              const responseStr = chunks.join("");
              const responseObj = {
                statusCode: response.statusCode,
                body: responseStr,
                headers: objectToArrayHeader(response.headers)
              };
              resolve(responseObj);
            });
          });
          clientRequest.on("error", (err) => {
            reject((0, ask_sdk_runtime_1.createAskSdkError)(this.constructor.name, err.message));
          });
          if (request.body) {
            clientRequest.write(request.body);
          }
          clientRequest.end();
        });
      }
    };
    exports2.DefaultApiClient = DefaultApiClient;
    function arrayToObjectHeader(header) {
      const reducer = (obj, item) => {
        if (obj[item.key]) {
          obj[item.key].push(item.value);
        } else {
          obj[item.key] = [item.value];
        }
        return obj;
      };
      return header.reduce(reducer, {});
    }
    function objectToArrayHeader(header) {
      const arrayHeader = [];
      Object.keys(header).forEach((key) => {
        const headerArray = Array.isArray(header[key]) ? header[key] : [header[key]];
        for (const value of headerArray) {
          arrayHeader.push({
            key,
            value
          });
        }
      });
      return arrayHeader;
    }
  }
});

// node_modules/ask-sdk-model/package.json
var require_package = __commonJS({
  "node_modules/ask-sdk-model/package.json"(exports2, module2) {
    module2.exports = {
      name: "ask-sdk-model",
      version: "1.86.0",
      description: "Model package for Alexa Skills Kit SDK",
      main: "index.js",
      types: "index.d.ts",
      scripts: {
        gulp: "./node_modules/.bin/gulp"
      },
      author: "Amazon.com",
      contributors: [
        {
          name: "Tianren Zhang",
          email: "tianrenz@amazon.com"
        },
        {
          name: "Tiantian Xie",
          email: "xtiantia@amazon.com"
        }
      ],
      license: "Apache-2.0",
      keywords: [
        "Alexa",
        "Skill",
        "SDK"
      ],
      devDependencies: {
        "@types/node": "^9.6.1",
        del: "^3.0.0",
        gulp: "^4.0.0",
        typescript: "^3.5.3"
      },
      repository: "github:alexa/alexa-apis-for-nodejs",
      bugs: "https://github.com/alexa/alexa-skill-sdk-for-nodejs/issues",
      homepage: "https://github.com/alexa/alexa-skill-sdk-for-nodejs#readme"
    };
  }
});

// node_modules/ask-sdk-model/index.js
var require_ask_sdk_model = __commonJS({
  "node_modules/ask-sdk-model/index.js"(exports2) {
    "use strict";
    var __extends = exports2 && exports2.__extends || /* @__PURE__ */ (function() {
      var extendStatics = function(d, b) {
        extendStatics = Object.setPrototypeOf || { __proto__: [] } instanceof Array && function(d2, b2) {
          d2.__proto__ = b2;
        } || function(d2, b2) {
          for (var p in b2) if (b2.hasOwnProperty(p)) d2[p] = b2[p];
        };
        return extendStatics(d, b);
      };
      return function(d, b) {
        extendStatics(d, b);
        function __() {
          this.constructor = d;
        }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
      };
    })();
    var __awaiter = exports2 && exports2.__awaiter || function(thisArg, _arguments, P, generator) {
      return new (P || (P = Promise))(function(resolve, reject) {
        function fulfilled(value) {
          try {
            step(generator.next(value));
          } catch (e) {
            reject(e);
          }
        }
        function rejected(value) {
          try {
            step(generator["throw"](value));
          } catch (e) {
            reject(e);
          }
        }
        function step(result) {
          result.done ? resolve(result.value) : new P(function(resolve2) {
            resolve2(result.value);
          }).then(fulfilled, rejected);
        }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
      });
    };
    var __generator = exports2 && exports2.__generator || function(thisArg, body) {
      var _ = { label: 0, sent: function() {
        if (t[0] & 1) throw t[1];
        return t[1];
      }, trys: [], ops: [] }, f, y, t, g;
      return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() {
        return this;
      }), g;
      function verb(n) {
        return function(v) {
          return step([n, v]);
        };
      }
      function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
          if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
          if (y = 0, t) op = [op[0] & 2, t.value];
          switch (op[0]) {
            case 0:
            case 1:
              t = op;
              break;
            case 4:
              _.label++;
              return { value: op[1], done: false };
            case 5:
              _.label++;
              y = op[1];
              op = [0];
              continue;
            case 7:
              op = _.ops.pop();
              _.trys.pop();
              continue;
            default:
              if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) {
                _ = 0;
                continue;
              }
              if (op[0] === 3 && (!t || op[1] > t[0] && op[1] < t[3])) {
                _.label = op[1];
                break;
              }
              if (op[0] === 6 && _.label < t[1]) {
                _.label = t[1];
                t = op;
                break;
              }
              if (t && _.label < t[2]) {
                _.label = t[2];
                _.ops.push(op);
                break;
              }
              if (t[2]) _.ops.pop();
              _.trys.pop();
              continue;
          }
          op = body.call(thisArg, _);
        } catch (e) {
          op = [6, e];
          y = 0;
        } finally {
          f = t = 0;
        }
        if (op[0] & 5) throw op[1];
        return { value: op[0] ? op[1] : void 0, done: true };
      }
    };
    Object.defineProperty(exports2, "__esModule", { value: true });
    var services;
    (function(services2) {
      var BaseServiceClient = (
        /** @class */
        (function() {
          function BaseServiceClient2(apiConfiguration) {
            this.requestInterceptors = [];
            this.responseInterceptors = [];
            this.apiConfiguration = apiConfiguration;
          }
          BaseServiceClient2.isCodeSuccessful = function(responseCode) {
            return responseCode >= 200 && responseCode < 300;
          };
          BaseServiceClient2.buildUrl = function(endpoint, path, queryParameters, pathParameters) {
            var processedEndpoint = endpoint.endsWith("/") ? endpoint.substr(0, endpoint.length - 1) : endpoint;
            var pathWithParams = this.interpolateParams(path, pathParameters);
            var isConstantQueryPresent = pathWithParams.includes("?");
            var queryString = this.buildQueryString(queryParameters, isConstantQueryPresent);
            return processedEndpoint + pathWithParams + queryString;
          };
          BaseServiceClient2.interpolateParams = function(path, params) {
            if (!params) {
              return path;
            }
            var result = path;
            params.forEach(function(paramValue, paramName) {
              result = result.replace("{" + paramName + "}", encodeURIComponent(paramValue));
            });
            return result;
          };
          BaseServiceClient2.buildQueryString = function(params, isQueryStart) {
            if (!params) {
              return "";
            }
            var sb = [];
            if (isQueryStart) {
              sb.push("&");
            } else {
              sb.push("?");
            }
            params.forEach(function(obj) {
              sb.push(encodeURIComponent(obj.key));
              sb.push("=");
              sb.push(encodeURIComponent(obj.value));
              sb.push("&");
            });
            sb.pop();
            return sb.join("");
          };
          BaseServiceClient2.prototype.withRequestInterceptors = function() {
            var requestInterceptors = [];
            for (var _i = 0; _i < arguments.length; _i++) {
              requestInterceptors[_i] = arguments[_i];
            }
            for (var _a = 0, requestInterceptors_1 = requestInterceptors; _a < requestInterceptors_1.length; _a++) {
              var interceptor = requestInterceptors_1[_a];
              this.requestInterceptors.push(interceptor);
            }
            return this;
          };
          BaseServiceClient2.prototype.withResponseInterceptors = function() {
            var responseInterceptors = [];
            for (var _i = 0; _i < arguments.length; _i++) {
              responseInterceptors[_i] = arguments[_i];
            }
            for (var _a = 0, responseInterceptors_1 = responseInterceptors; _a < responseInterceptors_1.length; _a++) {
              var interceptor = responseInterceptors_1[_a];
              this.responseInterceptors.push(interceptor);
            }
            return this;
          };
          BaseServiceClient2.prototype.invoke = function(method, endpoint, path, pathParams, queryParams, headerParams, bodyParam, errors, nonJsonBody) {
            return __awaiter(this, void 0, void 0, function() {
              var request, apiClient, response, _i, _a, requestInterceptor, _b, _c, responseInterceptor, err_1, body, contentType, isJson, apiResponse, err;
              return __generator(this, function(_d) {
                switch (_d.label) {
                  case 0:
                    request = {
                      url: BaseServiceClient2.buildUrl(endpoint, path, queryParams, pathParams),
                      method,
                      headers: headerParams
                    };
                    if (bodyParam != null) {
                      request.body = nonJsonBody ? bodyParam : JSON.stringify(bodyParam);
                    }
                    apiClient = this.apiConfiguration.apiClient;
                    _d.label = 1;
                  case 1:
                    _d.trys.push([1, 11, , 12]);
                    _i = 0, _a = this.requestInterceptors;
                    _d.label = 2;
                  case 2:
                    if (!(_i < _a.length)) return [3, 5];
                    requestInterceptor = _a[_i];
                    return [4, requestInterceptor(request)];
                  case 3:
                    _d.sent();
                    _d.label = 4;
                  case 4:
                    _i++;
                    return [3, 2];
                  case 5:
                    return [4, apiClient.invoke(request)];
                  case 6:
                    response = _d.sent();
                    _b = 0, _c = this.responseInterceptors;
                    _d.label = 7;
                  case 7:
                    if (!(_b < _c.length)) return [3, 10];
                    responseInterceptor = _c[_b];
                    return [4, responseInterceptor(response)];
                  case 8:
                    _d.sent();
                    _d.label = 9;
                  case 9:
                    _b++;
                    return [3, 7];
                  case 10:
                    return [3, 12];
                  case 11:
                    err_1 = _d.sent();
                    err_1.message = "Call to service failed: " + err_1.message;
                    throw err_1;
                  case 12:
                    try {
                      contentType = response.headers.find(function(h) {
                        return h.key === "content-type";
                      });
                      isJson = !contentType || contentType.value.includes("application/json");
                      body = response.body && isJson ? JSON.parse(response.body) : response.body;
                      body = body || void 0;
                    } catch (err2) {
                      throw new SyntaxError("Failed trying to parse the response body: " + response.body);
                    }
                    if (BaseServiceClient2.isCodeSuccessful(response.statusCode)) {
                      apiResponse = {
                        headers: response.headers,
                        body,
                        statusCode: response.statusCode
                      };
                      return [2, apiResponse];
                    }
                    err = new Error("Unknown error");
                    err.name = "ServiceError";
                    err["statusCode"] = response.statusCode;
                    err["response"] = body;
                    if (errors && errors.has(response.statusCode)) {
                      err.message = errors.get(response.statusCode);
                    }
                    throw err;
                }
              });
            });
          };
          return BaseServiceClient2;
        })()
      );
      services2.BaseServiceClient = BaseServiceClient;
      var LwaServiceClient = (
        /** @class */
        (function(_super) {
          __extends(LwaServiceClient2, _super);
          function LwaServiceClient2(options) {
            var _this = _super.call(this, options.apiConfiguration) || this;
            if (options.authenticationConfiguration == null) {
              throw new Error("AuthenticationConfiguration cannot be null or undefined.");
            }
            _this.grantType = options.grantType ? options.grantType : LwaServiceClient2.CLIENT_CREDENTIALS_GRANT_TYPE;
            _this.authenticationConfiguration = options.authenticationConfiguration;
            _this.tokenStore = {};
            return _this;
          }
          LwaServiceClient2.prototype.getAccessTokenForScope = function(scope) {
            return __awaiter(this, void 0, void 0, function() {
              return __generator(this, function(_a) {
                if (scope == null) {
                  throw new Error("Scope cannot be null or undefined.");
                }
                return [2, this.getAccessToken(scope)];
              });
            });
          };
          LwaServiceClient2.prototype.getAccessToken = function(scope) {
            return __awaiter(this, void 0, void 0, function() {
              var cacheKey, accessToken, accessTokenRequest, accessTokenResponse;
              return __generator(this, function(_a) {
                switch (_a.label) {
                  case 0:
                    cacheKey = scope ? scope : LwaServiceClient2.REFRESH_ACCESS_TOKEN;
                    accessToken = this.tokenStore[cacheKey];
                    if (accessToken && accessToken.expiry > Date.now() + LwaServiceClient2.EXPIRY_OFFSET_MILLIS) {
                      return [2, accessToken.token];
                    }
                    accessTokenRequest = {
                      clientId: this.authenticationConfiguration.clientId,
                      clientSecret: this.authenticationConfiguration.clientSecret
                    };
                    if (scope && this.authenticationConfiguration.refreshToken) {
                      throw new Error("Cannot support both refreshToken and scope.");
                    } else if (scope == null && this.authenticationConfiguration.refreshToken == null) {
                      throw new Error("Either refreshToken or scope must be specified.");
                    } else if (scope == null) {
                      accessTokenRequest.refreshToken = this.authenticationConfiguration.refreshToken;
                    } else {
                      accessTokenRequest.scope = scope;
                    }
                    return [4, this.generateAccessToken(accessTokenRequest)];
                  case 1:
                    accessTokenResponse = _a.sent();
                    this.tokenStore[cacheKey] = {
                      token: accessTokenResponse.access_token,
                      expiry: Date.now() + accessTokenResponse.expires_in * 1e3
                    };
                    return [2, accessTokenResponse.access_token];
                }
              });
            });
          };
          LwaServiceClient2.prototype.generateAccessToken = function(accessTokenRequest) {
            return __awaiter(this, void 0, void 0, function() {
              var authEndpoint, queryParams, headerParams, pathParams, paramInfo, bodyParams, errorDefinitions, apiResponse;
              return __generator(this, function(_a) {
                switch (_a.label) {
                  case 0:
                    authEndpoint = this.authenticationConfiguration.authEndpoint || LwaServiceClient2.AUTH_ENDPOINT;
                    if (accessTokenRequest == null) {
                      throw new Error("Required parameter accessTokenRequest was null or undefined when calling generateAccessToken.");
                    }
                    queryParams = [];
                    headerParams = [];
                    headerParams.push({ key: "Content-type", value: "application/x-www-form-urlencoded" });
                    pathParams = /* @__PURE__ */ new Map();
                    paramInfo = this.grantType === LwaServiceClient2.LWA_CREDENTIALS_GRANT_TYPE ? "&refresh_token=" + accessTokenRequest.refreshToken : "&scope=" + accessTokenRequest.scope;
                    bodyParams = "grant_type=" + this.grantType + "&client_secret=" + accessTokenRequest.clientSecret + "&client_id=" + accessTokenRequest.clientId + paramInfo;
                    errorDefinitions = /* @__PURE__ */ new Map();
                    errorDefinitions.set(200, "Token request sent.");
                    errorDefinitions.set(400, "Bad Request");
                    errorDefinitions.set(401, "Authentication Failed");
                    errorDefinitions.set(500, "Internal Server Error");
                    return [4, this.invoke("POST", authEndpoint, "/auth/O2/token", pathParams, queryParams, headerParams, bodyParams, errorDefinitions, true)];
                  case 1:
                    apiResponse = _a.sent();
                    return [2, apiResponse.body];
                }
              });
            });
          };
          LwaServiceClient2.EXPIRY_OFFSET_MILLIS = 6e4;
          LwaServiceClient2.REFRESH_ACCESS_TOKEN = "refresh_access_token";
          LwaServiceClient2.CLIENT_CREDENTIALS_GRANT_TYPE = "client_credentials";
          LwaServiceClient2.LWA_CREDENTIALS_GRANT_TYPE = "refresh_token";
          LwaServiceClient2.AUTH_ENDPOINT = "https://api.amazon.com";
          return LwaServiceClient2;
        })(BaseServiceClient)
      );
      services2.LwaServiceClient = LwaServiceClient;
    })(services = exports2.services || (exports2.services = {}));
    function createUserAgent(packageVersion, customUserAgent) {
      var customUserAgentString = customUserAgent ? " " + customUserAgent : "";
      return "ask-node-model/" + packageVersion + " Node/" + process.version + customUserAgentString;
    }
    exports2.createUserAgent = createUserAgent;
    (function(services2) {
      var datastore;
      (function(datastore2) {
        var DatastoreServiceClient = (
          /** @class */
          (function(_super) {
            __extends(DatastoreServiceClient2, _super);
            function DatastoreServiceClient2(apiConfiguration, authenticationConfiguration, customUserAgent) {
              if (customUserAgent === void 0) {
                customUserAgent = null;
              }
              var _this = _super.call(this, apiConfiguration) || this;
              _this.lwaServiceClient = new services2.LwaServiceClient({
                apiConfiguration,
                authenticationConfiguration
              });
              _this.userAgent = createUserAgent("" + require_package().version, customUserAgent);
              return _this;
            }
            DatastoreServiceClient2.prototype.callCommandsV1 = function(commandsRequest) {
              return __awaiter(this, void 0, void 0, function() {
                var __operationId__, queryParams, headerParams, pathParams, accessToken, authorizationValue, resourcePath, errorDefinitions;
                return __generator(this, function(_a) {
                  switch (_a.label) {
                    case 0:
                      __operationId__ = "callCommandsV1";
                      if (commandsRequest == null) {
                        throw new Error("Required parameter commandsRequest was null or undefined when calling " + __operationId__ + ".");
                      }
                      queryParams = [];
                      headerParams = [];
                      headerParams.push({ key: "User-Agent", value: this.userAgent });
                      if (!headerParams.find(function(param) {
                        return param.key.toLowerCase() === "content-type";
                      })) {
                        headerParams.push({ key: "Content-type", value: "application/json" });
                      }
                      pathParams = /* @__PURE__ */ new Map();
                      return [4, this.lwaServiceClient.getAccessTokenForScope("alexa::datastore")];
                    case 1:
                      accessToken = _a.sent();
                      authorizationValue = "Bearer " + accessToken;
                      headerParams.push({ key: "Authorization", value: authorizationValue });
                      resourcePath = "/v1/datastore/commands";
                      errorDefinitions = /* @__PURE__ */ new Map();
                      errorDefinitions.set(200, "Multiple CommandsDispatchResults in response.");
                      errorDefinitions.set(400, "Request validation fails.");
                      errorDefinitions.set(401, "Not Authorized.");
                      errorDefinitions.set(403, "The skill is not allowed to execute commands.");
                      errorDefinitions.set(429, "The client has made more calls than the allowed limit.");
                      errorDefinitions.set(0, "Unexpected error.");
                      return [2, this.invoke("POST", this.apiConfiguration.apiEndpoint, resourcePath, pathParams, queryParams, headerParams, commandsRequest, errorDefinitions)];
                  }
                });
              });
            };
            DatastoreServiceClient2.prototype.commandsV1 = function(commandsRequest) {
              return __awaiter(this, void 0, void 0, function() {
                var apiResponse;
                return __generator(this, function(_a) {
                  switch (_a.label) {
                    case 0:
                      return [4, this.callCommandsV1(commandsRequest)];
                    case 1:
                      apiResponse = _a.sent();
                      return [2, apiResponse.body];
                  }
                });
              });
            };
            DatastoreServiceClient2.prototype.callCancelCommandsV1 = function(queuedResultId) {
              return __awaiter(this, void 0, void 0, function() {
                var __operationId__, queryParams, headerParams, pathParams, accessToken, authorizationValue, resourcePath, errorDefinitions;
                return __generator(this, function(_a) {
                  switch (_a.label) {
                    case 0:
                      __operationId__ = "callCancelCommandsV1";
                      if (queuedResultId == null) {
                        throw new Error("Required parameter queuedResultId was null or undefined when calling " + __operationId__ + ".");
                      }
                      queryParams = [];
                      headerParams = [];
                      headerParams.push({ key: "User-Agent", value: this.userAgent });
                      pathParams = /* @__PURE__ */ new Map();
                      pathParams.set("queuedResultId", queuedResultId);
                      return [4, this.lwaServiceClient.getAccessTokenForScope("alexa::datastore")];
                    case 1:
                      accessToken = _a.sent();
                      authorizationValue = "Bearer " + accessToken;
                      headerParams.push({ key: "Authorization", value: authorizationValue });
                      resourcePath = "/v1/datastore/queue/{queuedResultId}/cancel";
                      errorDefinitions = /* @__PURE__ */ new Map();
                      errorDefinitions.set(204, "Success. No content.");
                      errorDefinitions.set(400, "Request validation fails.");
                      errorDefinitions.set(401, "Not Authorized.");
                      errorDefinitions.set(403, "The skill is not allowed to call this API commands.");
                      errorDefinitions.set(404, "Unable to find the pending request.");
                      errorDefinitions.set(429, "The client has made more calls than the allowed limit.");
                      errorDefinitions.set(0, "Unexpected error.");
                      return [2, this.invoke("POST", this.apiConfiguration.apiEndpoint, resourcePath, pathParams, queryParams, headerParams, null, errorDefinitions)];
                  }
                });
              });
            };
            DatastoreServiceClient2.prototype.cancelCommandsV1 = function(queuedResultId) {
              return __awaiter(this, void 0, void 0, function() {
                return __generator(this, function(_a) {
                  switch (_a.label) {
                    case 0:
                      return [4, this.callCancelCommandsV1(queuedResultId)];
                    case 1:
                      _a.sent();
                      return [
                        2
                        /*return*/
                      ];
                  }
                });
              });
            };
            DatastoreServiceClient2.prototype.callQueuedResultV1 = function(queuedResultId, maxResults, nextToken) {
              return __awaiter(this, void 0, void 0, function() {
                var __operationId__, queryParams, maxResultsValues, nextTokenValues, headerParams, pathParams, accessToken, authorizationValue, resourcePath, errorDefinitions;
                return __generator(this, function(_a) {
                  switch (_a.label) {
                    case 0:
                      __operationId__ = "callQueuedResultV1";
                      if (queuedResultId == null) {
                        throw new Error("Required parameter queuedResultId was null or undefined when calling " + __operationId__ + ".");
                      }
                      queryParams = [];
                      if (maxResults != null) {
                        maxResultsValues = Array.isArray(maxResults) ? maxResults : [maxResults];
                        maxResultsValues.forEach(function(val) {
                          return queryParams.push({ key: "maxResults", value: val.toString() });
                        });
                      }
                      if (nextToken != null) {
                        nextTokenValues = Array.isArray(nextToken) ? nextToken : [nextToken];
                        nextTokenValues.forEach(function(val) {
                          return queryParams.push({ key: "nextToken", value: val });
                        });
                      }
                      headerParams = [];
                      headerParams.push({ key: "User-Agent", value: this.userAgent });
                      pathParams = /* @__PURE__ */ new Map();
                      pathParams.set("queuedResultId", queuedResultId);
                      return [4, this.lwaServiceClient.getAccessTokenForScope("alexa::datastore")];
                    case 1:
                      accessToken = _a.sent();
                      authorizationValue = "Bearer " + accessToken;
                      headerParams.push({ key: "Authorization", value: authorizationValue });
                      resourcePath = "/v1/datastore/queue/{queuedResultId}";
                      errorDefinitions = /* @__PURE__ */ new Map();
                      errorDefinitions.set(200, "Unordered array of CommandsDispatchResult and pagination details.");
                      errorDefinitions.set(400, "Request validation fails.");
                      errorDefinitions.set(401, "Not Authorized.");
                      errorDefinitions.set(403, "The skill is not allowed to call this API commands.");
                      errorDefinitions.set(429, "The client has made more calls than the allowed limit.");
                      errorDefinitions.set(0, "Unexpected error.");
                      return [2, this.invoke("GET", this.apiConfiguration.apiEndpoint, resourcePath, pathParams, queryParams, headerParams, null, errorDefinitions)];
                  }
                });
              });
            };
            DatastoreServiceClient2.prototype.queuedResultV1 = function(queuedResultId, maxResults, nextToken) {
              return __awaiter(this, void 0, void 0, function() {
                var apiResponse;
                return __generator(this, function(_a) {
                  switch (_a.label) {
                    case 0:
                      return [4, this.callQueuedResultV1(queuedResultId, maxResults, nextToken)];
                    case 1:
                      apiResponse = _a.sent();
                      return [2, apiResponse.body];
                  }
                });
              });
            };
            return DatastoreServiceClient2;
          })(services2.BaseServiceClient)
        );
        datastore2.DatastoreServiceClient = DatastoreServiceClient;
      })(datastore = services2.datastore || (services2.datastore = {}));
    })(services = exports2.services || (exports2.services = {}));
    (function(services2) {
      var deviceAddress;
      (function(deviceAddress2) {
        var DeviceAddressServiceClient = (
          /** @class */
          (function(_super) {
            __extends(DeviceAddressServiceClient2, _super);
            function DeviceAddressServiceClient2(apiConfiguration, customUserAgent) {
              if (customUserAgent === void 0) {
                customUserAgent = null;
              }
              var _this = _super.call(this, apiConfiguration) || this;
              _this.userAgent = createUserAgent("" + require_package().version, customUserAgent);
              return _this;
            }
            DeviceAddressServiceClient2.prototype.callGetCountryAndPostalCode = function(deviceId) {
              return __awaiter(this, void 0, void 0, function() {
                var __operationId__, queryParams, headerParams, pathParams, authorizationValue, resourcePath, errorDefinitions;
                return __generator(this, function(_a) {
                  __operationId__ = "callGetCountryAndPostalCode";
                  if (deviceId == null) {
                    throw new Error("Required parameter deviceId was null or undefined when calling " + __operationId__ + ".");
                  }
                  queryParams = [];
                  headerParams = [];
                  headerParams.push({ key: "User-Agent", value: this.userAgent });
                  pathParams = /* @__PURE__ */ new Map();
                  pathParams.set("deviceId", deviceId);
                  authorizationValue = "Bearer " + this.apiConfiguration.authorizationValue;
                  headerParams.push({ key: "Authorization", value: authorizationValue });
                  resourcePath = "/v1/devices/{deviceId}/settings/address/countryAndPostalCode";
                  errorDefinitions = /* @__PURE__ */ new Map();
                  errorDefinitions.set(200, "Successfully get the country and postal code of the deviceId");
                  errorDefinitions.set(204, "No content could be queried out");
                  errorDefinitions.set(403, "The authentication token is invalid or doesn&#39;t have access to the resource");
                  errorDefinitions.set(405, "The method is not supported");
                  errorDefinitions.set(429, "The request is throttled");
                  errorDefinitions.set(0, "Unexpected error");
                  return [2, this.invoke("GET", this.apiConfiguration.apiEndpoint, resourcePath, pathParams, queryParams, headerParams, null, errorDefinitions)];
                });
              });
            };
            DeviceAddressServiceClient2.prototype.getCountryAndPostalCode = function(deviceId) {
              return __awaiter(this, void 0, void 0, function() {
                var apiResponse;
                return __generator(this, function(_a) {
                  switch (_a.label) {
                    case 0:
                      return [4, this.callGetCountryAndPostalCode(deviceId)];
                    case 1:
                      apiResponse = _a.sent();
                      return [2, apiResponse.body];
                  }
                });
              });
            };
            DeviceAddressServiceClient2.prototype.callGetFullAddress = function(deviceId) {
              return __awaiter(this, void 0, void 0, function() {
                var __operationId__, queryParams, headerParams, pathParams, authorizationValue, resourcePath, errorDefinitions;
                return __generator(this, function(_a) {
                  __operationId__ = "callGetFullAddress";
                  if (deviceId == null) {
                    throw new Error("Required parameter deviceId was null or undefined when calling " + __operationId__ + ".");
                  }
                  queryParams = [];
                  headerParams = [];
                  headerParams.push({ key: "User-Agent", value: this.userAgent });
                  pathParams = /* @__PURE__ */ new Map();
                  pathParams.set("deviceId", deviceId);
                  authorizationValue = "Bearer " + this.apiConfiguration.authorizationValue;
                  headerParams.push({ key: "Authorization", value: authorizationValue });
                  resourcePath = "/v1/devices/{deviceId}/settings/address";
                  errorDefinitions = /* @__PURE__ */ new Map();
                  errorDefinitions.set(200, "Successfully get the address of the device");
                  errorDefinitions.set(204, "No content could be queried out");
                  errorDefinitions.set(403, "The authentication token is invalid or doesn&#39;t have access to the resource");
                  errorDefinitions.set(405, "The method is not supported");
                  errorDefinitions.set(429, "The request is throttled");
                  errorDefinitions.set(0, "Unexpected error");
                  return [2, this.invoke("GET", this.apiConfiguration.apiEndpoint, resourcePath, pathParams, queryParams, headerParams, null, errorDefinitions)];
                });
              });
            };
            DeviceAddressServiceClient2.prototype.getFullAddress = function(deviceId) {
              return __awaiter(this, void 0, void 0, function() {
                var apiResponse;
                return __generator(this, function(_a) {
                  switch (_a.label) {
                    case 0:
                      return [4, this.callGetFullAddress(deviceId)];
                    case 1:
                      apiResponse = _a.sent();
                      return [2, apiResponse.body];
                  }
                });
              });
            };
            return DeviceAddressServiceClient2;
          })(services2.BaseServiceClient)
        );
        deviceAddress2.DeviceAddressServiceClient = DeviceAddressServiceClient;
      })(deviceAddress = services2.deviceAddress || (services2.deviceAddress = {}));
    })(services = exports2.services || (exports2.services = {}));
    (function(services2) {
      var directive;
      (function(directive2) {
        var DirectiveServiceClient = (
          /** @class */
          (function(_super) {
            __extends(DirectiveServiceClient2, _super);
            function DirectiveServiceClient2(apiConfiguration, customUserAgent) {
              if (customUserAgent === void 0) {
                customUserAgent = null;
              }
              var _this = _super.call(this, apiConfiguration) || this;
              _this.userAgent = createUserAgent("" + require_package().version, customUserAgent);
              return _this;
            }
            DirectiveServiceClient2.prototype.callEnqueue = function(sendDirectiveRequest) {
              return __awaiter(this, void 0, void 0, function() {
                var __operationId__, queryParams, headerParams, pathParams, authorizationValue, resourcePath, errorDefinitions;
                return __generator(this, function(_a) {
                  __operationId__ = "callEnqueue";
                  if (sendDirectiveRequest == null) {
                    throw new Error("Required parameter sendDirectiveRequest was null or undefined when calling " + __operationId__ + ".");
                  }
                  queryParams = [];
                  headerParams = [];
                  headerParams.push({ key: "User-Agent", value: this.userAgent });
                  if (!headerParams.find(function(param) {
                    return param.key.toLowerCase() === "content-type";
                  })) {
                    headerParams.push({ key: "Content-type", value: "application/json" });
                  }
                  pathParams = /* @__PURE__ */ new Map();
                  authorizationValue = "Bearer " + this.apiConfiguration.authorizationValue;
                  headerParams.push({ key: "Authorization", value: authorizationValue });
                  resourcePath = "/v1/directives";
                  errorDefinitions = /* @__PURE__ */ new Map();
                  errorDefinitions.set(204, "Directive sent successfully.");
                  errorDefinitions.set(400, "Directive not valid.");
                  errorDefinitions.set(401, "Not Authorized.");
                  errorDefinitions.set(403, "The skill is not allowed to send directives at the moment.");
                  errorDefinitions.set(0, "Unexpected error.");
                  return [2, this.invoke("POST", this.apiConfiguration.apiEndpoint, resourcePath, pathParams, queryParams, headerParams, sendDirectiveRequest, errorDefinitions)];
                });
              });
            };
            DirectiveServiceClient2.prototype.enqueue = function(sendDirectiveRequest) {
              return __awaiter(this, void 0, void 0, function() {
                return __generator(this, function(_a) {
                  switch (_a.label) {
                    case 0:
                      return [4, this.callEnqueue(sendDirectiveRequest)];
                    case 1:
                      _a.sent();
                      return [
                        2
                        /*return*/
                      ];
                  }
                });
              });
            };
            return DirectiveServiceClient2;
          })(services2.BaseServiceClient)
        );
        directive2.DirectiveServiceClient = DirectiveServiceClient;
      })(directive = services2.directive || (services2.directive = {}));
    })(services = exports2.services || (exports2.services = {}));
    (function(services2) {
      var endpointEnumeration;
      (function(endpointEnumeration2) {
        var EndpointEnumerationServiceClient = (
          /** @class */
          (function(_super) {
            __extends(EndpointEnumerationServiceClient2, _super);
            function EndpointEnumerationServiceClient2(apiConfiguration, customUserAgent) {
              if (customUserAgent === void 0) {
                customUserAgent = null;
              }
              var _this = _super.call(this, apiConfiguration) || this;
              _this.userAgent = createUserAgent("" + require_package().version, customUserAgent);
              return _this;
            }
            EndpointEnumerationServiceClient2.prototype.callGetEndpoints = function() {
              return __awaiter(this, void 0, void 0, function() {
                var __operationId__, queryParams, headerParams, pathParams, authorizationValue, resourcePath, errorDefinitions;
                return __generator(this, function(_a) {
                  __operationId__ = "callGetEndpoints";
                  queryParams = [];
                  headerParams = [];
                  headerParams.push({ key: "User-Agent", value: this.userAgent });
                  pathParams = /* @__PURE__ */ new Map();
                  authorizationValue = "Bearer " + this.apiConfiguration.authorizationValue;
                  headerParams.push({ key: "Authorization", value: authorizationValue });
                  resourcePath = "/v1/endpoints";
                  errorDefinitions = /* @__PURE__ */ new Map();
                  errorDefinitions.set(200, "Successfully retrieved the list of connected endpoints.");
                  errorDefinitions.set(400, "Bad request. Returned when a required parameter is not present or badly formatted.");
                  errorDefinitions.set(401, "Unauthenticated. Returned when the request is not authenticated.");
                  errorDefinitions.set(403, "Forbidden. Returned when the request is authenticated but does not have sufficient permission.");
                  errorDefinitions.set(500, "Server Error. Returned when the server encountered an error processing the request.");
                  errorDefinitions.set(503, "Service Unavailable. Returned when the server is not ready to handle the request.");
                  errorDefinitions.set(0, "Unexpected error");
                  return [2, this.invoke("GET", this.apiConfiguration.apiEndpoint, resourcePath, pathParams, queryParams, headerParams, null, errorDefinitions)];
                });
              });
            };
            EndpointEnumerationServiceClient2.prototype.getEndpoints = function() {
              return __awaiter(this, void 0, void 0, function() {
                var apiResponse;
                return __generator(this, function(_a) {
                  switch (_a.label) {
                    case 0:
                      return [4, this.callGetEndpoints()];
                    case 1:
                      apiResponse = _a.sent();
                      return [2, apiResponse.body];
                  }
                });
              });
            };
            return EndpointEnumerationServiceClient2;
          })(services2.BaseServiceClient)
        );
        endpointEnumeration2.EndpointEnumerationServiceClient = EndpointEnumerationServiceClient;
      })(endpointEnumeration = services2.endpointEnumeration || (services2.endpointEnumeration = {}));
    })(services = exports2.services || (exports2.services = {}));
    (function(services2) {
      var listManagement;
      (function(listManagement2) {
        var ListManagementServiceClient = (
          /** @class */
          (function(_super) {
            __extends(ListManagementServiceClient2, _super);
            function ListManagementServiceClient2(apiConfiguration, customUserAgent) {
              if (customUserAgent === void 0) {
                customUserAgent = null;
              }
              var _this = _super.call(this, apiConfiguration) || this;
              _this.userAgent = createUserAgent("" + require_package().version, customUserAgent);
              return _this;
            }
            ListManagementServiceClient2.prototype.callGetListsMetadata = function() {
              return __awaiter(this, void 0, void 0, function() {
                var __operationId__, queryParams, headerParams, pathParams, authorizationValue, resourcePath, errorDefinitions;
                return __generator(this, function(_a) {
                  __operationId__ = "callGetListsMetadata";
                  queryParams = [];
                  headerParams = [];
                  headerParams.push({ key: "User-Agent", value: this.userAgent });
                  pathParams = /* @__PURE__ */ new Map();
                  authorizationValue = "Bearer " + this.apiConfiguration.authorizationValue;
                  headerParams.push({ key: "Authorization", value: authorizationValue });
                  resourcePath = "/v2/householdlists";
                  errorDefinitions = /* @__PURE__ */ new Map();
                  errorDefinitions.set(200, "Success");
                  errorDefinitions.set(403, "Forbidden");
                  errorDefinitions.set(500, "Internal Server Error");
                  return [2, this.invoke("GET", "https://api.amazonalexa.com/", resourcePath, pathParams, queryParams, headerParams, null, errorDefinitions)];
                });
              });
            };
            ListManagementServiceClient2.prototype.getListsMetadata = function() {
              return __awaiter(this, void 0, void 0, function() {
                var apiResponse;
                return __generator(this, function(_a) {
                  switch (_a.label) {
                    case 0:
                      return [4, this.callGetListsMetadata()];
                    case 1:
                      apiResponse = _a.sent();
                      return [2, apiResponse.body];
                  }
                });
              });
            };
            ListManagementServiceClient2.prototype.callDeleteList = function(listId) {
              return __awaiter(this, void 0, void 0, function() {
                var __operationId__, queryParams, headerParams, pathParams, authorizationValue, resourcePath, errorDefinitions;
                return __generator(this, function(_a) {
                  __operationId__ = "callDeleteList";
                  if (listId == null) {
                    throw new Error("Required parameter listId was null or undefined when calling " + __operationId__ + ".");
                  }
                  queryParams = [];
                  headerParams = [];
                  headerParams.push({ key: "User-Agent", value: this.userAgent });
                  pathParams = /* @__PURE__ */ new Map();
                  pathParams.set("listId", listId);
                  authorizationValue = "Bearer " + this.apiConfiguration.authorizationValue;
                  headerParams.push({ key: "Authorization", value: authorizationValue });
                  resourcePath = "/v2/householdlists/{listId}";
                  errorDefinitions = /* @__PURE__ */ new Map();
                  errorDefinitions.set(200, "Success");
                  errorDefinitions.set(403, "Forbidden");
                  errorDefinitions.set(404, "Not Found");
                  errorDefinitions.set(500, "Internal Server Error");
                  errorDefinitions.set(0, "Internal Server Error");
                  return [2, this.invoke("DELETE", "https://api.amazonalexa.com/", resourcePath, pathParams, queryParams, headerParams, null, errorDefinitions)];
                });
              });
            };
            ListManagementServiceClient2.prototype.deleteList = function(listId) {
              return __awaiter(this, void 0, void 0, function() {
                return __generator(this, function(_a) {
                  switch (_a.label) {
                    case 0:
                      return [4, this.callDeleteList(listId)];
                    case 1:
                      _a.sent();
                      return [
                        2
                        /*return*/
                      ];
                  }
                });
              });
            };
            ListManagementServiceClient2.prototype.callDeleteListItem = function(listId, itemId) {
              return __awaiter(this, void 0, void 0, function() {
                var __operationId__, queryParams, headerParams, pathParams, authorizationValue, resourcePath, errorDefinitions;
                return __generator(this, function(_a) {
                  __operationId__ = "callDeleteListItem";
                  if (listId == null) {
                    throw new Error("Required parameter listId was null or undefined when calling " + __operationId__ + ".");
                  }
                  if (itemId == null) {
                    throw new Error("Required parameter itemId was null or undefined when calling " + __operationId__ + ".");
                  }
                  queryParams = [];
                  headerParams = [];
                  headerParams.push({ key: "User-Agent", value: this.userAgent });
                  pathParams = /* @__PURE__ */ new Map();
                  pathParams.set("listId", listId);
                  pathParams.set("itemId", itemId);
                  authorizationValue = "Bearer " + this.apiConfiguration.authorizationValue;
                  headerParams.push({ key: "Authorization", value: authorizationValue });
                  resourcePath = "/v2/householdlists/{listId}/items/{itemId}";
                  errorDefinitions = /* @__PURE__ */ new Map();
                  errorDefinitions.set(200, "Success");
                  errorDefinitions.set(403, "Forbidden");
                  errorDefinitions.set(404, "Not Found");
                  errorDefinitions.set(500, "Internal Server Error");
                  errorDefinitions.set(0, "Internal Server Error");
                  return [2, this.invoke("DELETE", "https://api.amazonalexa.com/", resourcePath, pathParams, queryParams, headerParams, null, errorDefinitions)];
                });
              });
            };
            ListManagementServiceClient2.prototype.deleteListItem = function(listId, itemId) {
              return __awaiter(this, void 0, void 0, function() {
                return __generator(this, function(_a) {
                  switch (_a.label) {
                    case 0:
                      return [4, this.callDeleteListItem(listId, itemId)];
                    case 1:
                      _a.sent();
                      return [
                        2
                        /*return*/
                      ];
                  }
                });
              });
            };
            ListManagementServiceClient2.prototype.callGetListItem = function(listId, itemId) {
              return __awaiter(this, void 0, void 0, function() {
                var __operationId__, queryParams, headerParams, pathParams, authorizationValue, resourcePath, errorDefinitions;
                return __generator(this, function(_a) {
                  __operationId__ = "callGetListItem";
                  if (listId == null) {
                    throw new Error("Required parameter listId was null or undefined when calling " + __operationId__ + ".");
                  }
                  if (itemId == null) {
                    throw new Error("Required parameter itemId was null or undefined when calling " + __operationId__ + ".");
                  }
                  queryParams = [];
                  headerParams = [];
                  headerParams.push({ key: "User-Agent", value: this.userAgent });
                  pathParams = /* @__PURE__ */ new Map();
                  pathParams.set("listId", listId);
                  pathParams.set("itemId", itemId);
                  authorizationValue = "Bearer " + this.apiConfiguration.authorizationValue;
                  headerParams.push({ key: "Authorization", value: authorizationValue });
                  resourcePath = "/v2/householdlists/{listId}/items/{itemId}";
                  errorDefinitions = /* @__PURE__ */ new Map();
                  errorDefinitions.set(200, "Success");
                  errorDefinitions.set(403, "Forbidden");
                  errorDefinitions.set(404, "Not Found");
                  errorDefinitions.set(500, "Internal Server Error");
                  errorDefinitions.set(0, "Internal Server Error");
                  return [2, this.invoke("GET", "https://api.amazonalexa.com/", resourcePath, pathParams, queryParams, headerParams, null, errorDefinitions)];
                });
              });
            };
            ListManagementServiceClient2.prototype.getListItem = function(listId, itemId) {
              return __awaiter(this, void 0, void 0, function() {
                var apiResponse;
                return __generator(this, function(_a) {
                  switch (_a.label) {
                    case 0:
                      return [4, this.callGetListItem(listId, itemId)];
                    case 1:
                      apiResponse = _a.sent();
                      return [2, apiResponse.body];
                  }
                });
              });
            };
            ListManagementServiceClient2.prototype.callUpdateListItem = function(listId, itemId, updateListItemRequest) {
              return __awaiter(this, void 0, void 0, function() {
                var __operationId__, queryParams, headerParams, pathParams, authorizationValue, resourcePath, errorDefinitions;
                return __generator(this, function(_a) {
                  __operationId__ = "callUpdateListItem";
                  if (listId == null) {
                    throw new Error("Required parameter listId was null or undefined when calling " + __operationId__ + ".");
                  }
                  if (itemId == null) {
                    throw new Error("Required parameter itemId was null or undefined when calling " + __operationId__ + ".");
                  }
                  if (updateListItemRequest == null) {
                    throw new Error("Required parameter updateListItemRequest was null or undefined when calling " + __operationId__ + ".");
                  }
                  queryParams = [];
                  headerParams = [];
                  headerParams.push({ key: "User-Agent", value: this.userAgent });
                  if (!headerParams.find(function(param) {
                    return param.key.toLowerCase() === "content-type";
                  })) {
                    headerParams.push({ key: "Content-type", value: "application/json" });
                  }
                  pathParams = /* @__PURE__ */ new Map();
                  pathParams.set("listId", listId);
                  pathParams.set("itemId", itemId);
                  authorizationValue = "Bearer " + this.apiConfiguration.authorizationValue;
                  headerParams.push({ key: "Authorization", value: authorizationValue });
                  resourcePath = "/v2/householdlists/{listId}/items/{itemId}";
                  errorDefinitions = /* @__PURE__ */ new Map();
                  errorDefinitions.set(200, "Success");
                  errorDefinitions.set(403, "Forbidden");
                  errorDefinitions.set(404, "Not Found");
                  errorDefinitions.set(409, "Conflict");
                  errorDefinitions.set(500, "Internal Server Error");
                  errorDefinitions.set(0, "Internal Server Error");
                  return [2, this.invoke("PUT", "https://api.amazonalexa.com/", resourcePath, pathParams, queryParams, headerParams, updateListItemRequest, errorDefinitions)];
                });
              });
            };
            ListManagementServiceClient2.prototype.updateListItem = function(listId, itemId, updateListItemRequest) {
              return __awaiter(this, void 0, void 0, function() {
                var apiResponse;
                return __generator(this, function(_a) {
                  switch (_a.label) {
                    case 0:
                      return [4, this.callUpdateListItem(listId, itemId, updateListItemRequest)];
                    case 1:
                      apiResponse = _a.sent();
                      return [2, apiResponse.body];
                  }
                });
              });
            };
            ListManagementServiceClient2.prototype.callCreateListItem = function(listId, createListItemRequest) {
              return __awaiter(this, void 0, void 0, function() {
                var __operationId__, queryParams, headerParams, pathParams, authorizationValue, resourcePath, errorDefinitions;
                return __generator(this, function(_a) {
                  __operationId__ = "callCreateListItem";
                  if (listId == null) {
                    throw new Error("Required parameter listId was null or undefined when calling " + __operationId__ + ".");
                  }
                  if (createListItemRequest == null) {
                    throw new Error("Required parameter createListItemRequest was null or undefined when calling " + __operationId__ + ".");
                  }
                  queryParams = [];
                  headerParams = [];
                  headerParams.push({ key: "User-Agent", value: this.userAgent });
                  if (!headerParams.find(function(param) {
                    return param.key.toLowerCase() === "content-type";
                  })) {
                    headerParams.push({ key: "Content-type", value: "application/json" });
                  }
                  pathParams = /* @__PURE__ */ new Map();
                  pathParams.set("listId", listId);
                  authorizationValue = "Bearer " + this.apiConfiguration.authorizationValue;
                  headerParams.push({ key: "Authorization", value: authorizationValue });
                  resourcePath = "/v2/householdlists/{listId}/items";
                  errorDefinitions = /* @__PURE__ */ new Map();
                  errorDefinitions.set(201, "Success");
                  errorDefinitions.set(400, "Bad Request");
                  errorDefinitions.set(403, "Forbidden");
                  errorDefinitions.set(404, "Not found");
                  errorDefinitions.set(500, "Internal Server Error");
                  errorDefinitions.set(0, "Internal Server Error");
                  return [2, this.invoke("POST", "https://api.amazonalexa.com/", resourcePath, pathParams, queryParams, headerParams, createListItemRequest, errorDefinitions)];
                });
              });
            };
            ListManagementServiceClient2.prototype.createListItem = function(listId, createListItemRequest) {
              return __awaiter(this, void 0, void 0, function() {
                var apiResponse;
                return __generator(this, function(_a) {
                  switch (_a.label) {
                    case 0:
                      return [4, this.callCreateListItem(listId, createListItemRequest)];
                    case 1:
                      apiResponse = _a.sent();
                      return [2, apiResponse.body];
                  }
                });
              });
            };
            ListManagementServiceClient2.prototype.callUpdateList = function(listId, updateListRequest) {
              return __awaiter(this, void 0, void 0, function() {
                var __operationId__, queryParams, headerParams, pathParams, authorizationValue, resourcePath, errorDefinitions;
                return __generator(this, function(_a) {
                  __operationId__ = "callUpdateList";
                  if (listId == null) {
                    throw new Error("Required parameter listId was null or undefined when calling " + __operationId__ + ".");
                  }
                  if (updateListRequest == null) {
                    throw new Error("Required parameter updateListRequest was null or undefined when calling " + __operationId__ + ".");
                  }
                  queryParams = [];
                  headerParams = [];
                  headerParams.push({ key: "User-Agent", value: this.userAgent });
                  if (!headerParams.find(function(param) {
                    return param.key.toLowerCase() === "content-type";
                  })) {
                    headerParams.push({ key: "Content-type", value: "application/json" });
                  }
                  pathParams = /* @__PURE__ */ new Map();
                  pathParams.set("listId", listId);
                  authorizationValue = "Bearer " + this.apiConfiguration.authorizationValue;
                  headerParams.push({ key: "Authorization", value: authorizationValue });
                  resourcePath = "/v2/householdlists/{listId}";
                  errorDefinitions = /* @__PURE__ */ new Map();
                  errorDefinitions.set(200, "Success");
                  errorDefinitions.set(400, "Bad Request");
                  errorDefinitions.set(403, "Forbidden");
                  errorDefinitions.set(404, "List not found");
                  errorDefinitions.set(409, "Conflict");
                  errorDefinitions.set(500, "Internal Server Error");
                  errorDefinitions.set(0, "Internal Server Error");
                  return [2, this.invoke("PUT", "https://api.amazonalexa.com/", resourcePath, pathParams, queryParams, headerParams, updateListRequest, errorDefinitions)];
                });
              });
            };
            ListManagementServiceClient2.prototype.updateList = function(listId, updateListRequest) {
              return __awaiter(this, void 0, void 0, function() {
                var apiResponse;
                return __generator(this, function(_a) {
                  switch (_a.label) {
                    case 0:
                      return [4, this.callUpdateList(listId, updateListRequest)];
                    case 1:
                      apiResponse = _a.sent();
                      return [2, apiResponse.body];
                  }
                });
              });
            };
            ListManagementServiceClient2.prototype.callGetList = function(listId, status) {
              return __awaiter(this, void 0, void 0, function() {
                var __operationId__, queryParams, headerParams, pathParams, authorizationValue, resourcePath, errorDefinitions;
                return __generator(this, function(_a) {
                  __operationId__ = "callGetList";
                  if (listId == null) {
                    throw new Error("Required parameter listId was null or undefined when calling " + __operationId__ + ".");
                  }
                  if (status == null) {
                    throw new Error("Required parameter status was null or undefined when calling " + __operationId__ + ".");
                  }
                  queryParams = [];
                  headerParams = [];
                  headerParams.push({ key: "User-Agent", value: this.userAgent });
                  pathParams = /* @__PURE__ */ new Map();
                  pathParams.set("listId", listId);
                  pathParams.set("status", status);
                  authorizationValue = "Bearer " + this.apiConfiguration.authorizationValue;
                  headerParams.push({ key: "Authorization", value: authorizationValue });
                  resourcePath = "/v2/householdlists/{listId}/{status}";
                  errorDefinitions = /* @__PURE__ */ new Map();
                  errorDefinitions.set(200, "Success");
                  errorDefinitions.set(400, "Bad Request");
                  errorDefinitions.set(403, "Forbidden");
                  errorDefinitions.set(404, "Not Found");
                  errorDefinitions.set(500, "Internal Server Error");
                  errorDefinitions.set(0, "Internal Server Error");
                  return [2, this.invoke("GET", "https://api.amazonalexa.com/", resourcePath, pathParams, queryParams, headerParams, null, errorDefinitions)];
                });
              });
            };
            ListManagementServiceClient2.prototype.getList = function(listId, status) {
              return __awaiter(this, void 0, void 0, function() {
                var apiResponse;
                return __generator(this, function(_a) {
                  switch (_a.label) {
                    case 0:
                      return [4, this.callGetList(listId, status)];
                    case 1:
                      apiResponse = _a.sent();
                      return [2, apiResponse.body];
                  }
                });
              });
            };
            ListManagementServiceClient2.prototype.callCreateList = function(createListRequest) {
              return __awaiter(this, void 0, void 0, function() {
                var __operationId__, queryParams, headerParams, pathParams, authorizationValue, resourcePath, errorDefinitions;
                return __generator(this, function(_a) {
                  __operationId__ = "callCreateList";
                  if (createListRequest == null) {
                    throw new Error("Required parameter createListRequest was null or undefined when calling " + __operationId__ + ".");
                  }
                  queryParams = [];
                  headerParams = [];
                  headerParams.push({ key: "User-Agent", value: this.userAgent });
                  if (!headerParams.find(function(param) {
                    return param.key.toLowerCase() === "content-type";
                  })) {
                    headerParams.push({ key: "Content-type", value: "application/json" });
                  }
                  pathParams = /* @__PURE__ */ new Map();
                  authorizationValue = "Bearer " + this.apiConfiguration.authorizationValue;
                  headerParams.push({ key: "Authorization", value: authorizationValue });
                  resourcePath = "/v2/householdlists";
                  errorDefinitions = /* @__PURE__ */ new Map();
                  errorDefinitions.set(201, "Success");
                  errorDefinitions.set(400, "Bad Request");
                  errorDefinitions.set(403, "Forbidden");
                  errorDefinitions.set(409, "Conflict");
                  errorDefinitions.set(500, "Internal Server Error");
                  errorDefinitions.set(0, "Internal Server Error");
                  return [2, this.invoke("POST", "https://api.amazonalexa.com/", resourcePath, pathParams, queryParams, headerParams, createListRequest, errorDefinitions)];
                });
              });
            };
            ListManagementServiceClient2.prototype.createList = function(createListRequest) {
              return __awaiter(this, void 0, void 0, function() {
                var apiResponse;
                return __generator(this, function(_a) {
                  switch (_a.label) {
                    case 0:
                      return [4, this.callCreateList(createListRequest)];
                    case 1:
                      apiResponse = _a.sent();
                      return [2, apiResponse.body];
                  }
                });
              });
            };
            return ListManagementServiceClient2;
          })(services2.BaseServiceClient)
        );
        listManagement2.ListManagementServiceClient = ListManagementServiceClient;
      })(listManagement = services2.listManagement || (services2.listManagement = {}));
    })(services = exports2.services || (exports2.services = {}));
    (function(services2) {
      var monetization;
      (function(monetization2) {
        var MonetizationServiceClient = (
          /** @class */
          (function(_super) {
            __extends(MonetizationServiceClient2, _super);
            function MonetizationServiceClient2(apiConfiguration, customUserAgent) {
              if (customUserAgent === void 0) {
                customUserAgent = null;
              }
              var _this = _super.call(this, apiConfiguration) || this;
              _this.userAgent = createUserAgent("" + require_package().version, customUserAgent);
              return _this;
            }
            MonetizationServiceClient2.prototype.callGetInSkillProducts = function(acceptLanguage, purchasable, entitled, productType, nextToken, maxResults) {
              return __awaiter(this, void 0, void 0, function() {
                var __operationId__, queryParams, purchasableValues, entitledValues, productTypeValues, nextTokenValues, maxResultsValues, headerParams, pathParams, authorizationValue, resourcePath, errorDefinitions;
                return __generator(this, function(_a) {
                  __operationId__ = "callGetInSkillProducts";
                  if (acceptLanguage == null) {
                    throw new Error("Required parameter acceptLanguage was null or undefined when calling " + __operationId__ + ".");
                  }
                  queryParams = [];
                  if (purchasable != null) {
                    purchasableValues = Array.isArray(purchasable) ? purchasable : [purchasable];
                    purchasableValues.forEach(function(val) {
                      return queryParams.push({ key: "purchasable", value: val });
                    });
                  }
                  if (entitled != null) {
                    entitledValues = Array.isArray(entitled) ? entitled : [entitled];
                    entitledValues.forEach(function(val) {
                      return queryParams.push({ key: "entitled", value: val });
                    });
                  }
                  if (productType != null) {
                    productTypeValues = Array.isArray(productType) ? productType : [productType];
                    productTypeValues.forEach(function(val) {
                      return queryParams.push({ key: "productType", value: val });
                    });
                  }
                  if (nextToken != null) {
                    nextTokenValues = Array.isArray(nextToken) ? nextToken : [nextToken];
                    nextTokenValues.forEach(function(val) {
                      return queryParams.push({ key: "nextToken", value: val });
                    });
                  }
                  if (maxResults != null) {
                    maxResultsValues = Array.isArray(maxResults) ? maxResults : [maxResults];
                    maxResultsValues.forEach(function(val) {
                      return queryParams.push({ key: "maxResults", value: val.toString() });
                    });
                  }
                  headerParams = [];
                  headerParams.push({ key: "User-Agent", value: this.userAgent });
                  headerParams.push({ key: "Accept-Language", value: acceptLanguage });
                  pathParams = /* @__PURE__ */ new Map();
                  authorizationValue = "Bearer " + this.apiConfiguration.authorizationValue;
                  headerParams.push({ key: "Authorization", value: authorizationValue });
                  resourcePath = "/v1/users/~current/skills/~current/inSkillProducts";
                  errorDefinitions = /* @__PURE__ */ new Map();
                  errorDefinitions.set(200, "Returns a list of In-Skill products on success.");
                  errorDefinitions.set(400, "Invalid request");
                  errorDefinitions.set(401, "The authentication token is invalid or doesn&#39;t have access to make this request");
                  errorDefinitions.set(500, "Internal Server Error");
                  return [2, this.invoke("GET", this.apiConfiguration.apiEndpoint, resourcePath, pathParams, queryParams, headerParams, null, errorDefinitions)];
                });
              });
            };
            MonetizationServiceClient2.prototype.getInSkillProducts = function(acceptLanguage, purchasable, entitled, productType, nextToken, maxResults) {
              return __awaiter(this, void 0, void 0, function() {
                var apiResponse;
                return __generator(this, function(_a) {
                  switch (_a.label) {
                    case 0:
                      return [4, this.callGetInSkillProducts(acceptLanguage, purchasable, entitled, productType, nextToken, maxResults)];
                    case 1:
                      apiResponse = _a.sent();
                      return [2, apiResponse.body];
                  }
                });
              });
            };
            MonetizationServiceClient2.prototype.callGetInSkillProduct = function(acceptLanguage, productId) {
              return __awaiter(this, void 0, void 0, function() {
                var __operationId__, queryParams, headerParams, pathParams, authorizationValue, resourcePath, errorDefinitions;
                return __generator(this, function(_a) {
                  __operationId__ = "callGetInSkillProduct";
                  if (acceptLanguage == null) {
                    throw new Error("Required parameter acceptLanguage was null or undefined when calling " + __operationId__ + ".");
                  }
                  if (productId == null) {
                    throw new Error("Required parameter productId was null or undefined when calling " + __operationId__ + ".");
                  }
                  queryParams = [];
                  headerParams = [];
                  headerParams.push({ key: "User-Agent", value: this.userAgent });
                  headerParams.push({ key: "Accept-Language", value: acceptLanguage });
                  pathParams = /* @__PURE__ */ new Map();
                  pathParams.set("productId", productId);
                  authorizationValue = "Bearer " + this.apiConfiguration.authorizationValue;
                  headerParams.push({ key: "Authorization", value: authorizationValue });
                  resourcePath = "/v1/users/~current/skills/~current/inSkillProducts/{productId}";
                  errorDefinitions = /* @__PURE__ */ new Map();
                  errorDefinitions.set(200, "Returns an In-Skill Product on success.");
                  errorDefinitions.set(400, "Invalid request.");
                  errorDefinitions.set(401, "The authentication token is invalid or doesn&#39;t have access to make this request");
                  errorDefinitions.set(404, "Requested resource not found.");
                  errorDefinitions.set(500, "Internal Server Error.");
                  return [2, this.invoke("GET", this.apiConfiguration.apiEndpoint, resourcePath, pathParams, queryParams, headerParams, null, errorDefinitions)];
                });
              });
            };
            MonetizationServiceClient2.prototype.getInSkillProduct = function(acceptLanguage, productId) {
              return __awaiter(this, void 0, void 0, function() {
                var apiResponse;
                return __generator(this, function(_a) {
                  switch (_a.label) {
                    case 0:
                      return [4, this.callGetInSkillProduct(acceptLanguage, productId)];
                    case 1:
                      apiResponse = _a.sent();
                      return [2, apiResponse.body];
                  }
                });
              });
            };
            MonetizationServiceClient2.prototype.callGetInSkillProductsTransactions = function(acceptLanguage, productId, status, fromLastModifiedTime, toLastModifiedTime, nextToken, maxResults) {
              return __awaiter(this, void 0, void 0, function() {
                var __operationId__, queryParams, productIdValues, statusValues, fromLastModifiedTimeValues, toLastModifiedTimeValues, nextTokenValues, maxResultsValues, headerParams, pathParams, authorizationValue, resourcePath, errorDefinitions;
                return __generator(this, function(_a) {
                  __operationId__ = "callGetInSkillProductsTransactions";
                  if (acceptLanguage == null) {
                    throw new Error("Required parameter acceptLanguage was null or undefined when calling " + __operationId__ + ".");
                  }
                  queryParams = [];
                  if (productId != null) {
                    productIdValues = Array.isArray(productId) ? productId : [productId];
                    productIdValues.forEach(function(val) {
                      return queryParams.push({ key: "productId", value: val });
                    });
                  }
                  if (status != null) {
                    statusValues = Array.isArray(status) ? status : [status];
                    statusValues.forEach(function(val) {
                      return queryParams.push({ key: "status", value: val });
                    });
                  }
                  if (fromLastModifiedTime != null) {
                    fromLastModifiedTimeValues = Array.isArray(fromLastModifiedTime) ? fromLastModifiedTime : [fromLastModifiedTime];
                    fromLastModifiedTimeValues.forEach(function(val) {
                      return queryParams.push({ key: "fromLastModifiedTime", value: val.toString() });
                    });
                  }
                  if (toLastModifiedTime != null) {
                    toLastModifiedTimeValues = Array.isArray(toLastModifiedTime) ? toLastModifiedTime : [toLastModifiedTime];
                    toLastModifiedTimeValues.forEach(function(val) {
                      return queryParams.push({ key: "toLastModifiedTime", value: val.toString() });
                    });
                  }
                  if (nextToken != null) {
                    nextTokenValues = Array.isArray(nextToken) ? nextToken : [nextToken];
                    nextTokenValues.forEach(function(val) {
                      return queryParams.push({ key: "nextToken", value: val });
                    });
                  }
                  if (maxResults != null) {
                    maxResultsValues = Array.isArray(maxResults) ? maxResults : [maxResults];
                    maxResultsValues.forEach(function(val) {
                      return queryParams.push({ key: "maxResults", value: val.toString() });
                    });
                  }
                  headerParams = [];
                  headerParams.push({ key: "User-Agent", value: this.userAgent });
                  headerParams.push({ key: "Accept-Language", value: acceptLanguage });
                  pathParams = /* @__PURE__ */ new Map();
                  authorizationValue = "Bearer " + this.apiConfiguration.authorizationValue;
                  headerParams.push({ key: "Authorization", value: authorizationValue });
                  resourcePath = "/v1/users/~current/skills/~current/inSkillProductsTransactions";
                  errorDefinitions = /* @__PURE__ */ new Map();
                  errorDefinitions.set(200, "Returns a list of transactions of all in skill products purchases in last 30 days on success.");
                  errorDefinitions.set(400, "Invalid request");
                  errorDefinitions.set(401, "The authentication token is invalid or doesn&#39;t have access to make this request");
                  errorDefinitions.set(403, "Forbidden request");
                  errorDefinitions.set(404, "Product id doesn&#39;t exist / invalid / not found.");
                  errorDefinitions.set(412, "Non-Child Directed Skill is not supported.");
                  errorDefinitions.set(429, "The request is throttled.");
                  errorDefinitions.set(500, "Internal Server Error");
                  return [2, this.invoke("GET", this.apiConfiguration.apiEndpoint, resourcePath, pathParams, queryParams, headerParams, null, errorDefinitions)];
                });
              });
            };
            MonetizationServiceClient2.prototype.getInSkillProductsTransactions = function(acceptLanguage, productId, status, fromLastModifiedTime, toLastModifiedTime, nextToken, maxResults) {
              return __awaiter(this, void 0, void 0, function() {
                var apiResponse;
                return __generator(this, function(_a) {
                  switch (_a.label) {
                    case 0:
                      return [4, this.callGetInSkillProductsTransactions(acceptLanguage, productId, status, fromLastModifiedTime, toLastModifiedTime, nextToken, maxResults)];
                    case 1:
                      apiResponse = _a.sent();
                      return [2, apiResponse.body];
                  }
                });
              });
            };
            MonetizationServiceClient2.prototype.callGetVoicePurchaseSetting = function() {
              return __awaiter(this, void 0, void 0, function() {
                var __operationId__, queryParams, headerParams, pathParams, authorizationValue, resourcePath, errorDefinitions;
                return __generator(this, function(_a) {
                  __operationId__ = "callGetVoicePurchaseSetting";
                  queryParams = [];
                  headerParams = [];
                  headerParams.push({ key: "User-Agent", value: this.userAgent });
                  pathParams = /* @__PURE__ */ new Map();
                  authorizationValue = "Bearer " + this.apiConfiguration.authorizationValue;
                  headerParams.push({ key: "Authorization", value: authorizationValue });
                  resourcePath = "/v1/users/~current/skills/~current/settings/voicePurchasing.enabled";
                  errorDefinitions = /* @__PURE__ */ new Map();
                  errorDefinitions.set(200, "Returns a boolean value for voice purchase setting on success.");
                  errorDefinitions.set(400, "Invalid request.");
                  errorDefinitions.set(401, "The authentication token is invalid or doesn&#39;t have access to make this request");
                  errorDefinitions.set(500, "Internal Server Error.");
                  return [2, this.invoke("GET", this.apiConfiguration.apiEndpoint, resourcePath, pathParams, queryParams, headerParams, null, errorDefinitions)];
                });
              });
            };
            MonetizationServiceClient2.prototype.getVoicePurchaseSetting = function() {
              return __awaiter(this, void 0, void 0, function() {
                var apiResponse;
                return __generator(this, function(_a) {
                  switch (_a.label) {
                    case 0:
                      return [4, this.callGetVoicePurchaseSetting()];
                    case 1:
                      apiResponse = _a.sent();
                      return [2, apiResponse.body];
                  }
                });
              });
            };
            return MonetizationServiceClient2;
          })(services2.BaseServiceClient)
        );
        monetization2.MonetizationServiceClient = MonetizationServiceClient;
      })(monetization = services2.monetization || (services2.monetization = {}));
    })(services = exports2.services || (exports2.services = {}));
    (function(services2) {
      var proactiveEvents;
      (function(proactiveEvents2) {
        var ProactiveEventsServiceClient = (
          /** @class */
          (function(_super) {
            __extends(ProactiveEventsServiceClient2, _super);
            function ProactiveEventsServiceClient2(apiConfiguration, authenticationConfiguration, customUserAgent) {
              if (customUserAgent === void 0) {
                customUserAgent = null;
              }
              var _this = _super.call(this, apiConfiguration) || this;
              _this.lwaServiceClient = new services2.LwaServiceClient({
                apiConfiguration,
                authenticationConfiguration
              });
              _this.userAgent = createUserAgent("" + require_package().version, customUserAgent);
              return _this;
            }
            ProactiveEventsServiceClient2.prototype.callCreateProactiveEvent = function(createProactiveEventRequest, stage) {
              return __awaiter(this, void 0, void 0, function() {
                var __operationId__, queryParams, headerParams, pathParams, accessToken, authorizationValue, resourcePath, errorDefinitions;
                return __generator(this, function(_a) {
                  switch (_a.label) {
                    case 0:
                      __operationId__ = "callCreateProactiveEvent";
                      if (createProactiveEventRequest == null) {
                        throw new Error("Required parameter createProactiveEventRequest was null or undefined when calling " + __operationId__ + ".");
                      }
                      queryParams = [];
                      headerParams = [];
                      headerParams.push({ key: "User-Agent", value: this.userAgent });
                      if (!headerParams.find(function(param) {
                        return param.key.toLowerCase() === "content-type";
                      })) {
                        headerParams.push({ key: "Content-type", value: "application/json" });
                      }
                      pathParams = /* @__PURE__ */ new Map();
                      return [4, this.lwaServiceClient.getAccessTokenForScope("alexa::proactive_events")];
                    case 1:
                      accessToken = _a.sent();
                      authorizationValue = "Bearer " + accessToken;
                      headerParams.push({ key: "Authorization", value: authorizationValue });
                      resourcePath = "/v1/proactiveEvents";
                      if (stage === "DEVELOPMENT") {
                        resourcePath += "/stages/development";
                      }
                      errorDefinitions = /* @__PURE__ */ new Map();
                      errorDefinitions.set(202, "Request accepted");
                      errorDefinitions.set(400, "A required parameter is not present or is incorrectly formatted, or the requested creation of a resource has already been completed by a previous request. ");
                      errorDefinitions.set(403, "The authentication token is invalid or doesn&#39;t have authentication to access the resource");
                      errorDefinitions.set(409, "A skill attempts to create duplicate events using the same referenceId for the same customer.");
                      errorDefinitions.set(429, "The client has made more calls than the allowed limit.");
                      errorDefinitions.set(500, "The ProactiveEvents service encounters an internal error for a valid request.");
                      errorDefinitions.set(0, "Unexpected error");
                      return [2, this.invoke("POST", this.apiConfiguration.apiEndpoint, resourcePath, pathParams, queryParams, headerParams, createProactiveEventRequest, errorDefinitions)];
                  }
                });
              });
            };
            ProactiveEventsServiceClient2.prototype.createProactiveEvent = function(createProactiveEventRequest, stage) {
              return __awaiter(this, void 0, void 0, function() {
                return __generator(this, function(_a) {
                  switch (_a.label) {
                    case 0:
                      return [4, this.callCreateProactiveEvent(createProactiveEventRequest, stage)];
                    case 1:
                      _a.sent();
                      return [
                        2
                        /*return*/
                      ];
                  }
                });
              });
            };
            return ProactiveEventsServiceClient2;
          })(services2.BaseServiceClient)
        );
        proactiveEvents2.ProactiveEventsServiceClient = ProactiveEventsServiceClient;
      })(proactiveEvents = services2.proactiveEvents || (services2.proactiveEvents = {}));
    })(services = exports2.services || (exports2.services = {}));
    (function(services2) {
      var reminderManagement;
      (function(reminderManagement2) {
        var ReminderManagementServiceClient = (
          /** @class */
          (function(_super) {
            __extends(ReminderManagementServiceClient2, _super);
            function ReminderManagementServiceClient2(apiConfiguration, customUserAgent) {
              if (customUserAgent === void 0) {
                customUserAgent = null;
              }
              var _this = _super.call(this, apiConfiguration) || this;
              _this.userAgent = createUserAgent("" + require_package().version, customUserAgent);
              return _this;
            }
            ReminderManagementServiceClient2.prototype.callDeleteReminder = function(alertToken) {
              return __awaiter(this, void 0, void 0, function() {
                var __operationId__, queryParams, headerParams, pathParams, authorizationValue, resourcePath, errorDefinitions;
                return __generator(this, function(_a) {
                  __operationId__ = "callDeleteReminder";
                  if (alertToken == null) {
                    throw new Error("Required parameter alertToken was null or undefined when calling " + __operationId__ + ".");
                  }
                  queryParams = [];
                  headerParams = [];
                  headerParams.push({ key: "User-Agent", value: this.userAgent });
                  pathParams = /* @__PURE__ */ new Map();
                  pathParams.set("alertToken", alertToken);
                  authorizationValue = "Bearer " + this.apiConfiguration.authorizationValue;
                  headerParams.push({ key: "Authorization", value: authorizationValue });
                  resourcePath = "/v1/alerts/reminders/{alertToken}";
                  errorDefinitions = /* @__PURE__ */ new Map();
                  errorDefinitions.set(200, "Success");
                  errorDefinitions.set(401, "UserAuthenticationException. Request is not authorized/authenticated e.g. If customer does not have permission to create a reminder.");
                  errorDefinitions.set(429, "RateExceededException e.g. When the skill is throttled for exceeding the max rate");
                  errorDefinitions.set(500, "Internal Server Error");
                  return [2, this.invoke("DELETE", this.apiConfiguration.apiEndpoint, resourcePath, pathParams, queryParams, headerParams, null, errorDefinitions)];
                });
              });
            };
            ReminderManagementServiceClient2.prototype.deleteReminder = function(alertToken) {
              return __awaiter(this, void 0, void 0, function() {
                return __generator(this, function(_a) {
                  switch (_a.label) {
                    case 0:
                      return [4, this.callDeleteReminder(alertToken)];
                    case 1:
                      _a.sent();
                      return [
                        2
                        /*return*/
                      ];
                  }
                });
              });
            };
            ReminderManagementServiceClient2.prototype.callGetReminder = function(alertToken) {
              return __awaiter(this, void 0, void 0, function() {
                var __operationId__, queryParams, headerParams, pathParams, authorizationValue, resourcePath, errorDefinitions;
                return __generator(this, function(_a) {
                  __operationId__ = "callGetReminder";
                  if (alertToken == null) {
                    throw new Error("Required parameter alertToken was null or undefined when calling " + __operationId__ + ".");
                  }
                  queryParams = [];
                  headerParams = [];
                  headerParams.push({ key: "User-Agent", value: this.userAgent });
                  pathParams = /* @__PURE__ */ new Map();
                  pathParams.set("alertToken", alertToken);
                  authorizationValue = "Bearer " + this.apiConfiguration.authorizationValue;
                  headerParams.push({ key: "Authorization", value: authorizationValue });
                  resourcePath = "/v1/alerts/reminders/{alertToken}";
                  errorDefinitions = /* @__PURE__ */ new Map();
                  errorDefinitions.set(200, "Success");
                  errorDefinitions.set(401, "UserAuthenticationException. Request is not authorized/authenticated e.g. If customer does not have permission to create a reminder.");
                  errorDefinitions.set(429, "RateExceededException e.g. When the skill is throttled for exceeding the max rate");
                  errorDefinitions.set(500, "Internal Server Error");
                  return [2, this.invoke("GET", this.apiConfiguration.apiEndpoint, resourcePath, pathParams, queryParams, headerParams, null, errorDefinitions)];
                });
              });
            };
            ReminderManagementServiceClient2.prototype.getReminder = function(alertToken) {
              return __awaiter(this, void 0, void 0, function() {
                var apiResponse;
                return __generator(this, function(_a) {
                  switch (_a.label) {
                    case 0:
                      return [4, this.callGetReminder(alertToken)];
                    case 1:
                      apiResponse = _a.sent();
                      return [2, apiResponse.body];
                  }
                });
              });
            };
            ReminderManagementServiceClient2.prototype.callUpdateReminder = function(alertToken, reminderRequest) {
              return __awaiter(this, void 0, void 0, function() {
                var __operationId__, queryParams, headerParams, pathParams, authorizationValue, resourcePath, errorDefinitions;
                return __generator(this, function(_a) {
                  __operationId__ = "callUpdateReminder";
                  if (alertToken == null) {
                    throw new Error("Required parameter alertToken was null or undefined when calling " + __operationId__ + ".");
                  }
                  if (reminderRequest == null) {
                    throw new Error("Required parameter reminderRequest was null or undefined when calling " + __operationId__ + ".");
                  }
                  queryParams = [];
                  headerParams = [];
                  headerParams.push({ key: "User-Agent", value: this.userAgent });
                  if (!headerParams.find(function(param) {
                    return param.key.toLowerCase() === "content-type";
                  })) {
                    headerParams.push({ key: "Content-type", value: "application/json" });
                  }
                  pathParams = /* @__PURE__ */ new Map();
                  pathParams.set("alertToken", alertToken);
                  authorizationValue = "Bearer " + this.apiConfiguration.authorizationValue;
                  headerParams.push({ key: "Authorization", value: authorizationValue });
                  resourcePath = "/v1/alerts/reminders/{alertToken}";
                  errorDefinitions = /* @__PURE__ */ new Map();
                  errorDefinitions.set(200, "Success");
                  errorDefinitions.set(400, "Bad Request");
                  errorDefinitions.set(404, "NotFoundException e.g. Retured when reminder is not found");
                  errorDefinitions.set(409, "UserAuthenticationException. Request is not authorized/authenticated e.g. If customer does not have permission to create a reminder.");
                  errorDefinitions.set(429, "RateExceededException e.g. When the skill is throttled for exceeding the max rate");
                  errorDefinitions.set(500, "Internal Server Error");
                  return [2, this.invoke("PUT", this.apiConfiguration.apiEndpoint, resourcePath, pathParams, queryParams, headerParams, reminderRequest, errorDefinitions)];
                });
              });
            };
            ReminderManagementServiceClient2.prototype.updateReminder = function(alertToken, reminderRequest) {
              return __awaiter(this, void 0, void 0, function() {
                var apiResponse;
                return __generator(this, function(_a) {
                  switch (_a.label) {
                    case 0:
                      return [4, this.callUpdateReminder(alertToken, reminderRequest)];
                    case 1:
                      apiResponse = _a.sent();
                      return [2, apiResponse.body];
                  }
                });
              });
            };
            ReminderManagementServiceClient2.prototype.callGetReminders = function() {
              return __awaiter(this, void 0, void 0, function() {
                var __operationId__, queryParams, headerParams, pathParams, authorizationValue, resourcePath, errorDefinitions;
                return __generator(this, function(_a) {
                  __operationId__ = "callGetReminders";
                  queryParams = [];
                  headerParams = [];
                  headerParams.push({ key: "User-Agent", value: this.userAgent });
                  pathParams = /* @__PURE__ */ new Map();
                  authorizationValue = "Bearer " + this.apiConfiguration.authorizationValue;
                  headerParams.push({ key: "Authorization", value: authorizationValue });
                  resourcePath = "/v1/alerts/reminders";
                  errorDefinitions = /* @__PURE__ */ new Map();
                  errorDefinitions.set(200, "Success");
                  errorDefinitions.set(401, "UserAuthenticationException. Request is not authorized/authenticated e.g. If customer does not have permission to create a reminder.");
                  errorDefinitions.set(429, "RateExceededException e.g. When the skill is throttled for exceeding the max rate");
                  errorDefinitions.set(500, "Internal Server Error");
                  return [2, this.invoke("GET", this.apiConfiguration.apiEndpoint, resourcePath, pathParams, queryParams, headerParams, null, errorDefinitions)];
                });
              });
            };
            ReminderManagementServiceClient2.prototype.getReminders = function() {
              return __awaiter(this, void 0, void 0, function() {
                var apiResponse;
                return __generator(this, function(_a) {
                  switch (_a.label) {
                    case 0:
                      return [4, this.callGetReminders()];
                    case 1:
                      apiResponse = _a.sent();
                      return [2, apiResponse.body];
                  }
                });
              });
            };
            ReminderManagementServiceClient2.prototype.callCreateReminder = function(reminderRequest) {
              return __awaiter(this, void 0, void 0, function() {
                var __operationId__, queryParams, headerParams, pathParams, authorizationValue, resourcePath, errorDefinitions;
                return __generator(this, function(_a) {
                  __operationId__ = "callCreateReminder";
                  if (reminderRequest == null) {
                    throw new Error("Required parameter reminderRequest was null or undefined when calling " + __operationId__ + ".");
                  }
                  queryParams = [];
                  headerParams = [];
                  headerParams.push({ key: "User-Agent", value: this.userAgent });
                  if (!headerParams.find(function(param) {
                    return param.key.toLowerCase() === "content-type";
                  })) {
                    headerParams.push({ key: "Content-type", value: "application/json" });
                  }
                  pathParams = /* @__PURE__ */ new Map();
                  authorizationValue = "Bearer " + this.apiConfiguration.authorizationValue;
                  headerParams.push({ key: "Authorization", value: authorizationValue });
                  resourcePath = "/v1/alerts/reminders";
                  errorDefinitions = /* @__PURE__ */ new Map();
                  errorDefinitions.set(200, "Success");
                  errorDefinitions.set(400, "Bad Request");
                  errorDefinitions.set(403, "Forbidden");
                  errorDefinitions.set(429, "RateExceededException e.g. When the skill is throttled for exceeding the max rate");
                  errorDefinitions.set(500, "Internal Server Error");
                  errorDefinitions.set(503, "Service Unavailable");
                  errorDefinitions.set(504, "Gateway Timeout");
                  return [2, this.invoke("POST", this.apiConfiguration.apiEndpoint, resourcePath, pathParams, queryParams, headerParams, reminderRequest, errorDefinitions)];
                });
              });
            };
            ReminderManagementServiceClient2.prototype.createReminder = function(reminderRequest) {
              return __awaiter(this, void 0, void 0, function() {
                var apiResponse;
                return __generator(this, function(_a) {
                  switch (_a.label) {
                    case 0:
                      return [4, this.callCreateReminder(reminderRequest)];
                    case 1:
                      apiResponse = _a.sent();
                      return [2, apiResponse.body];
                  }
                });
              });
            };
            return ReminderManagementServiceClient2;
          })(services2.BaseServiceClient)
        );
        reminderManagement2.ReminderManagementServiceClient = ReminderManagementServiceClient;
      })(reminderManagement = services2.reminderManagement || (services2.reminderManagement = {}));
    })(services = exports2.services || (exports2.services = {}));
    (function(services2) {
      var skillMessaging;
      (function(skillMessaging2) {
        var SkillMessagingServiceClient = (
          /** @class */
          (function(_super) {
            __extends(SkillMessagingServiceClient2, _super);
            function SkillMessagingServiceClient2(apiConfiguration, authenticationConfiguration, customUserAgent) {
              if (customUserAgent === void 0) {
                customUserAgent = null;
              }
              var _this = _super.call(this, apiConfiguration) || this;
              _this.lwaServiceClient = new services2.LwaServiceClient({
                apiConfiguration,
                authenticationConfiguration
              });
              _this.userAgent = createUserAgent("" + require_package().version, customUserAgent);
              return _this;
            }
            SkillMessagingServiceClient2.prototype.callSendSkillMessage = function(userId, sendSkillMessagingRequest) {
              return __awaiter(this, void 0, void 0, function() {
                var __operationId__, queryParams, headerParams, pathParams, accessToken, authorizationValue, resourcePath, errorDefinitions;
                return __generator(this, function(_a) {
                  switch (_a.label) {
                    case 0:
                      __operationId__ = "callSendSkillMessage";
                      if (userId == null) {
                        throw new Error("Required parameter userId was null or undefined when calling " + __operationId__ + ".");
                      }
                      if (sendSkillMessagingRequest == null) {
                        throw new Error("Required parameter sendSkillMessagingRequest was null or undefined when calling " + __operationId__ + ".");
                      }
                      queryParams = [];
                      headerParams = [];
                      headerParams.push({ key: "User-Agent", value: this.userAgent });
                      if (!headerParams.find(function(param) {
                        return param.key.toLowerCase() === "content-type";
                      })) {
                        headerParams.push({ key: "Content-type", value: "application/json" });
                      }
                      pathParams = /* @__PURE__ */ new Map();
                      pathParams.set("userId", userId);
                      return [4, this.lwaServiceClient.getAccessTokenForScope("alexa:skill_messaging")];
                    case 1:
                      accessToken = _a.sent();
                      authorizationValue = "Bearer " + accessToken;
                      headerParams.push({ key: "Authorization", value: authorizationValue });
                      resourcePath = "/v1/skillmessages/users/{userId}";
                      errorDefinitions = /* @__PURE__ */ new Map();
                      errorDefinitions.set(202, "Message has been successfully accepted, and will be sent to the skill ");
                      errorDefinitions.set(400, "Data is missing or not valid ");
                      errorDefinitions.set(403, "The skill messaging authentication token is expired or not valid ");
                      errorDefinitions.set(404, "The passed userId does not exist ");
                      errorDefinitions.set(429, "The requester has exceeded their maximum allowable rate of messages ");
                      errorDefinitions.set(500, "The SkillMessaging service encountered an internal error for a valid request. ");
                      errorDefinitions.set(0, "Unexpected error");
                      return [2, this.invoke("POST", this.apiConfiguration.apiEndpoint, resourcePath, pathParams, queryParams, headerParams, sendSkillMessagingRequest, errorDefinitions)];
                  }
                });
              });
            };
            SkillMessagingServiceClient2.prototype.sendSkillMessage = function(userId, sendSkillMessagingRequest) {
              return __awaiter(this, void 0, void 0, function() {
                return __generator(this, function(_a) {
                  switch (_a.label) {
                    case 0:
                      return [4, this.callSendSkillMessage(userId, sendSkillMessagingRequest)];
                    case 1:
                      _a.sent();
                      return [
                        2
                        /*return*/
                      ];
                  }
                });
              });
            };
            return SkillMessagingServiceClient2;
          })(services2.BaseServiceClient)
        );
        skillMessaging2.SkillMessagingServiceClient = SkillMessagingServiceClient;
      })(skillMessaging = services2.skillMessaging || (services2.skillMessaging = {}));
    })(services = exports2.services || (exports2.services = {}));
    (function(services2) {
      var timerManagement;
      (function(timerManagement2) {
        var TimerManagementServiceClient = (
          /** @class */
          (function(_super) {
            __extends(TimerManagementServiceClient2, _super);
            function TimerManagementServiceClient2(apiConfiguration, customUserAgent) {
              if (customUserAgent === void 0) {
                customUserAgent = null;
              }
              var _this = _super.call(this, apiConfiguration) || this;
              _this.userAgent = createUserAgent("" + require_package().version, customUserAgent);
              return _this;
            }
            TimerManagementServiceClient2.prototype.callDeleteTimers = function() {
              return __awaiter(this, void 0, void 0, function() {
                var __operationId__, queryParams, headerParams, pathParams, authorizationValue, resourcePath, errorDefinitions;
                return __generator(this, function(_a) {
                  __operationId__ = "callDeleteTimers";
                  queryParams = [];
                  headerParams = [];
                  headerParams.push({ key: "User-Agent", value: this.userAgent });
                  pathParams = /* @__PURE__ */ new Map();
                  authorizationValue = "Bearer " + this.apiConfiguration.authorizationValue;
                  headerParams.push({ key: "Authorization", value: authorizationValue });
                  resourcePath = "/v1/alerts/timers";
                  errorDefinitions = /* @__PURE__ */ new Map();
                  errorDefinitions.set(200, "Success");
                  errorDefinitions.set(400, "Bad Request");
                  errorDefinitions.set(401, "Unauthorized");
                  errorDefinitions.set(500, "Internal Server Error");
                  return [2, this.invoke("DELETE", this.apiConfiguration.apiEndpoint, resourcePath, pathParams, queryParams, headerParams, null, errorDefinitions)];
                });
              });
            };
            TimerManagementServiceClient2.prototype.deleteTimers = function() {
              return __awaiter(this, void 0, void 0, function() {
                return __generator(this, function(_a) {
                  switch (_a.label) {
                    case 0:
                      return [4, this.callDeleteTimers()];
                    case 1:
                      _a.sent();
                      return [
                        2
                        /*return*/
                      ];
                  }
                });
              });
            };
            TimerManagementServiceClient2.prototype.callGetTimers = function() {
              return __awaiter(this, void 0, void 0, function() {
                var __operationId__, queryParams, headerParams, pathParams, authorizationValue, resourcePath, errorDefinitions;
                return __generator(this, function(_a) {
                  __operationId__ = "callGetTimers";
                  queryParams = [];
                  headerParams = [];
                  headerParams.push({ key: "User-Agent", value: this.userAgent });
                  pathParams = /* @__PURE__ */ new Map();
                  authorizationValue = "Bearer " + this.apiConfiguration.authorizationValue;
                  headerParams.push({ key: "Authorization", value: authorizationValue });
                  resourcePath = "/v1/alerts/timers";
                  errorDefinitions = /* @__PURE__ */ new Map();
                  errorDefinitions.set(200, "Success");
                  errorDefinitions.set(400, "Bad Request");
                  errorDefinitions.set(401, "Unauthorized");
                  errorDefinitions.set(500, "Internal Server Error");
                  return [2, this.invoke("GET", this.apiConfiguration.apiEndpoint, resourcePath, pathParams, queryParams, headerParams, null, errorDefinitions)];
                });
              });
            };
            TimerManagementServiceClient2.prototype.getTimers = function() {
              return __awaiter(this, void 0, void 0, function() {
                var apiResponse;
                return __generator(this, function(_a) {
                  switch (_a.label) {
                    case 0:
                      return [4, this.callGetTimers()];
                    case 1:
                      apiResponse = _a.sent();
                      return [2, apiResponse.body];
                  }
                });
              });
            };
            TimerManagementServiceClient2.prototype.callDeleteTimer = function(id) {
              return __awaiter(this, void 0, void 0, function() {
                var __operationId__, queryParams, headerParams, pathParams, authorizationValue, resourcePath, errorDefinitions;
                return __generator(this, function(_a) {
                  __operationId__ = "callDeleteTimer";
                  if (id == null) {
                    throw new Error("Required parameter id was null or undefined when calling " + __operationId__ + ".");
                  }
                  queryParams = [];
                  headerParams = [];
                  headerParams.push({ key: "User-Agent", value: this.userAgent });
                  pathParams = /* @__PURE__ */ new Map();
                  pathParams.set("id", id);
                  authorizationValue = "Bearer " + this.apiConfiguration.authorizationValue;
                  headerParams.push({ key: "Authorization", value: authorizationValue });
                  resourcePath = "/v1/alerts/timers/{id}";
                  errorDefinitions = /* @__PURE__ */ new Map();
                  errorDefinitions.set(200, "Success");
                  errorDefinitions.set(400, "Bad Request");
                  errorDefinitions.set(401, "Unauthorized");
                  errorDefinitions.set(404, "Timer not found");
                  errorDefinitions.set(500, "Internal Server Error");
                  return [2, this.invoke("DELETE", this.apiConfiguration.apiEndpoint, resourcePath, pathParams, queryParams, headerParams, null, errorDefinitions)];
                });
              });
            };
            TimerManagementServiceClient2.prototype.deleteTimer = function(id) {
              return __awaiter(this, void 0, void 0, function() {
                return __generator(this, function(_a) {
                  switch (_a.label) {
                    case 0:
                      return [4, this.callDeleteTimer(id)];
                    case 1:
                      _a.sent();
                      return [
                        2
                        /*return*/
                      ];
                  }
                });
              });
            };
            TimerManagementServiceClient2.prototype.callGetTimer = function(id) {
              return __awaiter(this, void 0, void 0, function() {
                var __operationId__, queryParams, headerParams, pathParams, authorizationValue, resourcePath, errorDefinitions;
                return __generator(this, function(_a) {
                  __operationId__ = "callGetTimer";
                  if (id == null) {
                    throw new Error("Required parameter id was null or undefined when calling " + __operationId__ + ".");
                  }
                  queryParams = [];
                  headerParams = [];
                  headerParams.push({ key: "User-Agent", value: this.userAgent });
                  pathParams = /* @__PURE__ */ new Map();
                  pathParams.set("id", id);
                  authorizationValue = "Bearer " + this.apiConfiguration.authorizationValue;
                  headerParams.push({ key: "Authorization", value: authorizationValue });
                  resourcePath = "/v1/alerts/timers/{id}";
                  errorDefinitions = /* @__PURE__ */ new Map();
                  errorDefinitions.set(200, "Success");
                  errorDefinitions.set(400, "Bad Request");
                  errorDefinitions.set(401, "Unauthorized");
                  errorDefinitions.set(404, "Timer not found");
                  errorDefinitions.set(500, "Internal Server Error");
                  return [2, this.invoke("GET", this.apiConfiguration.apiEndpoint, resourcePath, pathParams, queryParams, headerParams, null, errorDefinitions)];
                });
              });
            };
            TimerManagementServiceClient2.prototype.getTimer = function(id) {
              return __awaiter(this, void 0, void 0, function() {
                var apiResponse;
                return __generator(this, function(_a) {
                  switch (_a.label) {
                    case 0:
                      return [4, this.callGetTimer(id)];
                    case 1:
                      apiResponse = _a.sent();
                      return [2, apiResponse.body];
                  }
                });
              });
            };
            TimerManagementServiceClient2.prototype.callPauseTimer = function(id) {
              return __awaiter(this, void 0, void 0, function() {
                var __operationId__, queryParams, headerParams, pathParams, authorizationValue, resourcePath, errorDefinitions;
                return __generator(this, function(_a) {
                  __operationId__ = "callPauseTimer";
                  if (id == null) {
                    throw new Error("Required parameter id was null or undefined when calling " + __operationId__ + ".");
                  }
                  queryParams = [];
                  headerParams = [];
                  headerParams.push({ key: "User-Agent", value: this.userAgent });
                  pathParams = /* @__PURE__ */ new Map();
                  pathParams.set("id", id);
                  authorizationValue = "Bearer " + this.apiConfiguration.authorizationValue;
                  headerParams.push({ key: "Authorization", value: authorizationValue });
                  resourcePath = "/v1/alerts/timers/{id}/pause";
                  errorDefinitions = /* @__PURE__ */ new Map();
                  errorDefinitions.set(200, "Success");
                  errorDefinitions.set(400, "Bad Request");
                  errorDefinitions.set(401, "Unauthorized");
                  errorDefinitions.set(404, "Timer not found");
                  errorDefinitions.set(500, "Internal Server Error");
                  errorDefinitions.set(504, "Device offline");
                  return [2, this.invoke("POST", this.apiConfiguration.apiEndpoint, resourcePath, pathParams, queryParams, headerParams, null, errorDefinitions)];
                });
              });
            };
            TimerManagementServiceClient2.prototype.pauseTimer = function(id) {
              return __awaiter(this, void 0, void 0, function() {
                return __generator(this, function(_a) {
                  switch (_a.label) {
                    case 0:
                      return [4, this.callPauseTimer(id)];
                    case 1:
                      _a.sent();
                      return [
                        2
                        /*return*/
                      ];
                  }
                });
              });
            };
            TimerManagementServiceClient2.prototype.callResumeTimer = function(id) {
              return __awaiter(this, void 0, void 0, function() {
                var __operationId__, queryParams, headerParams, pathParams, authorizationValue, resourcePath, errorDefinitions;
                return __generator(this, function(_a) {
                  __operationId__ = "callResumeTimer";
                  if (id == null) {
                    throw new Error("Required parameter id was null or undefined when calling " + __operationId__ + ".");
                  }
                  queryParams = [];
                  headerParams = [];
                  headerParams.push({ key: "User-Agent", value: this.userAgent });
                  pathParams = /* @__PURE__ */ new Map();
                  pathParams.set("id", id);
                  authorizationValue = "Bearer " + this.apiConfiguration.authorizationValue;
                  headerParams.push({ key: "Authorization", value: authorizationValue });
                  resourcePath = "/v1/alerts/timers/{id}/resume";
                  errorDefinitions = /* @__PURE__ */ new Map();
                  errorDefinitions.set(200, "Success");
                  errorDefinitions.set(400, "Bad Request");
                  errorDefinitions.set(401, "Unauthorized");
                  errorDefinitions.set(404, "Timer not found");
                  errorDefinitions.set(500, "Internal Server Error");
                  errorDefinitions.set(504, "Device offline");
                  return [2, this.invoke("POST", this.apiConfiguration.apiEndpoint, resourcePath, pathParams, queryParams, headerParams, null, errorDefinitions)];
                });
              });
            };
            TimerManagementServiceClient2.prototype.resumeTimer = function(id) {
              return __awaiter(this, void 0, void 0, function() {
                return __generator(this, function(_a) {
                  switch (_a.label) {
                    case 0:
                      return [4, this.callResumeTimer(id)];
                    case 1:
                      _a.sent();
                      return [
                        2
                        /*return*/
                      ];
                  }
                });
              });
            };
            TimerManagementServiceClient2.prototype.callCreateTimer = function(timerRequest) {
              return __awaiter(this, void 0, void 0, function() {
                var __operationId__, queryParams, headerParams, pathParams, authorizationValue, resourcePath, errorDefinitions;
                return __generator(this, function(_a) {
                  __operationId__ = "callCreateTimer";
                  if (timerRequest == null) {
                    throw new Error("Required parameter timerRequest was null or undefined when calling " + __operationId__ + ".");
                  }
                  queryParams = [];
                  headerParams = [];
                  headerParams.push({ key: "User-Agent", value: this.userAgent });
                  if (!headerParams.find(function(param) {
                    return param.key.toLowerCase() === "content-type";
                  })) {
                    headerParams.push({ key: "Content-type", value: "application/json" });
                  }
                  pathParams = /* @__PURE__ */ new Map();
                  authorizationValue = "Bearer " + this.apiConfiguration.authorizationValue;
                  headerParams.push({ key: "Authorization", value: authorizationValue });
                  resourcePath = "/v1/alerts/timers";
                  errorDefinitions = /* @__PURE__ */ new Map();
                  errorDefinitions.set(200, "Success");
                  errorDefinitions.set(400, "Bad Request");
                  errorDefinitions.set(401, "Unauthorized");
                  errorDefinitions.set(403, "Forbidden");
                  errorDefinitions.set(500, "Internal Server Error");
                  errorDefinitions.set(504, "Device offline");
                  return [2, this.invoke("POST", this.apiConfiguration.apiEndpoint, resourcePath, pathParams, queryParams, headerParams, timerRequest, errorDefinitions)];
                });
              });
            };
            TimerManagementServiceClient2.prototype.createTimer = function(timerRequest) {
              return __awaiter(this, void 0, void 0, function() {
                var apiResponse;
                return __generator(this, function(_a) {
                  switch (_a.label) {
                    case 0:
                      return [4, this.callCreateTimer(timerRequest)];
                    case 1:
                      apiResponse = _a.sent();
                      return [2, apiResponse.body];
                  }
                });
              });
            };
            return TimerManagementServiceClient2;
          })(services2.BaseServiceClient)
        );
        timerManagement2.TimerManagementServiceClient = TimerManagementServiceClient;
      })(timerManagement = services2.timerManagement || (services2.timerManagement = {}));
    })(services = exports2.services || (exports2.services = {}));
    (function(services2) {
      var ups;
      (function(ups2) {
        var UpsServiceClient = (
          /** @class */
          (function(_super) {
            __extends(UpsServiceClient2, _super);
            function UpsServiceClient2(apiConfiguration, customUserAgent) {
              if (customUserAgent === void 0) {
                customUserAgent = null;
              }
              var _this = _super.call(this, apiConfiguration) || this;
              _this.userAgent = createUserAgent("" + require_package().version, customUserAgent);
              return _this;
            }
            UpsServiceClient2.prototype.callGetProfileEmail = function() {
              return __awaiter(this, void 0, void 0, function() {
                var __operationId__, queryParams, headerParams, pathParams, authorizationValue, resourcePath, errorDefinitions;
                return __generator(this, function(_a) {
                  __operationId__ = "callGetProfileEmail";
                  queryParams = [];
                  headerParams = [];
                  headerParams.push({ key: "User-Agent", value: this.userAgent });
                  pathParams = /* @__PURE__ */ new Map();
                  authorizationValue = "Bearer " + this.apiConfiguration.authorizationValue;
                  headerParams.push({ key: "Authorization", value: authorizationValue });
                  resourcePath = "/v2/accounts/~current/settings/Profile.email";
                  errorDefinitions = /* @__PURE__ */ new Map();
                  errorDefinitions.set(200, "Successfully retrieved the requested information.");
                  errorDefinitions.set(204, "The query did not return any results.");
                  errorDefinitions.set(401, "The authentication token is malformed or invalid.");
                  errorDefinitions.set(403, "The authentication token does not have access to resource.");
                  errorDefinitions.set(429, "The skill has been throttled due to an excessive number of requests.");
                  errorDefinitions.set(0, "An unexpected error occurred.");
                  return [2, this.invoke("GET", this.apiConfiguration.apiEndpoint, resourcePath, pathParams, queryParams, headerParams, null, errorDefinitions)];
                });
              });
            };
            UpsServiceClient2.prototype.getProfileEmail = function() {
              return __awaiter(this, void 0, void 0, function() {
                var apiResponse;
                return __generator(this, function(_a) {
                  switch (_a.label) {
                    case 0:
                      return [4, this.callGetProfileEmail()];
                    case 1:
                      apiResponse = _a.sent();
                      return [2, apiResponse.body];
                  }
                });
              });
            };
            UpsServiceClient2.prototype.callGetProfileGivenName = function() {
              return __awaiter(this, void 0, void 0, function() {
                var __operationId__, queryParams, headerParams, pathParams, authorizationValue, resourcePath, errorDefinitions;
                return __generator(this, function(_a) {
                  __operationId__ = "callGetProfileGivenName";
                  queryParams = [];
                  headerParams = [];
                  headerParams.push({ key: "User-Agent", value: this.userAgent });
                  pathParams = /* @__PURE__ */ new Map();
                  authorizationValue = "Bearer " + this.apiConfiguration.authorizationValue;
                  headerParams.push({ key: "Authorization", value: authorizationValue });
                  resourcePath = "/v2/accounts/~current/settings/Profile.givenName";
                  errorDefinitions = /* @__PURE__ */ new Map();
                  errorDefinitions.set(200, "Successfully retrieved the requested information.");
                  errorDefinitions.set(204, "The query did not return any results.");
                  errorDefinitions.set(401, "The authentication token is malformed or invalid.");
                  errorDefinitions.set(403, "The authentication token does not have access to resource.");
                  errorDefinitions.set(429, "The skill has been throttled due to an excessive number of requests.");
                  errorDefinitions.set(0, "An unexpected error occurred.");
                  return [2, this.invoke("GET", this.apiConfiguration.apiEndpoint, resourcePath, pathParams, queryParams, headerParams, null, errorDefinitions)];
                });
              });
            };
            UpsServiceClient2.prototype.getProfileGivenName = function() {
              return __awaiter(this, void 0, void 0, function() {
                var apiResponse;
                return __generator(this, function(_a) {
                  switch (_a.label) {
                    case 0:
                      return [4, this.callGetProfileGivenName()];
                    case 1:
                      apiResponse = _a.sent();
                      return [2, apiResponse.body];
                  }
                });
              });
            };
            UpsServiceClient2.prototype.callGetProfileMobileNumber = function() {
              return __awaiter(this, void 0, void 0, function() {
                var __operationId__, queryParams, headerParams, pathParams, authorizationValue, resourcePath, errorDefinitions;
                return __generator(this, function(_a) {
                  __operationId__ = "callGetProfileMobileNumber";
                  queryParams = [];
                  headerParams = [];
                  headerParams.push({ key: "User-Agent", value: this.userAgent });
                  pathParams = /* @__PURE__ */ new Map();
                  authorizationValue = "Bearer " + this.apiConfiguration.authorizationValue;
                  headerParams.push({ key: "Authorization", value: authorizationValue });
                  resourcePath = "/v2/accounts/~current/settings/Profile.mobileNumber";
                  errorDefinitions = /* @__PURE__ */ new Map();
                  errorDefinitions.set(200, "Successfully retrieved the requested information.");
                  errorDefinitions.set(204, "The query did not return any results.");
                  errorDefinitions.set(401, "The authentication token is malformed or invalid.");
                  errorDefinitions.set(403, "The authentication token does not have access to resource.");
                  errorDefinitions.set(429, "The skill has been throttled due to an excessive number of requests.");
                  errorDefinitions.set(0, "An unexpected error occurred.");
                  return [2, this.invoke("GET", this.apiConfiguration.apiEndpoint, resourcePath, pathParams, queryParams, headerParams, null, errorDefinitions)];
                });
              });
            };
            UpsServiceClient2.prototype.getProfileMobileNumber = function() {
              return __awaiter(this, void 0, void 0, function() {
                var apiResponse;
                return __generator(this, function(_a) {
                  switch (_a.label) {
                    case 0:
                      return [4, this.callGetProfileMobileNumber()];
                    case 1:
                      apiResponse = _a.sent();
                      return [2, apiResponse.body];
                  }
                });
              });
            };
            UpsServiceClient2.prototype.callGetProfileName = function() {
              return __awaiter(this, void 0, void 0, function() {
                var __operationId__, queryParams, headerParams, pathParams, authorizationValue, resourcePath, errorDefinitions;
                return __generator(this, function(_a) {
                  __operationId__ = "callGetProfileName";
                  queryParams = [];
                  headerParams = [];
                  headerParams.push({ key: "User-Agent", value: this.userAgent });
                  pathParams = /* @__PURE__ */ new Map();
                  authorizationValue = "Bearer " + this.apiConfiguration.authorizationValue;
                  headerParams.push({ key: "Authorization", value: authorizationValue });
                  resourcePath = "/v2/accounts/~current/settings/Profile.name";
                  errorDefinitions = /* @__PURE__ */ new Map();
                  errorDefinitions.set(200, "Successfully retrieved the requested information.");
                  errorDefinitions.set(204, "The query did not return any results.");
                  errorDefinitions.set(401, "The authentication token is malformed or invalid.");
                  errorDefinitions.set(403, "The authentication token does not have access to resource.");
                  errorDefinitions.set(429, "The skill has been throttled due to an excessive number of requests.");
                  errorDefinitions.set(0, "An unexpected error occurred.");
                  return [2, this.invoke("GET", this.apiConfiguration.apiEndpoint, resourcePath, pathParams, queryParams, headerParams, null, errorDefinitions)];
                });
              });
            };
            UpsServiceClient2.prototype.getProfileName = function() {
              return __awaiter(this, void 0, void 0, function() {
                var apiResponse;
                return __generator(this, function(_a) {
                  switch (_a.label) {
                    case 0:
                      return [4, this.callGetProfileName()];
                    case 1:
                      apiResponse = _a.sent();
                      return [2, apiResponse.body];
                  }
                });
              });
            };
            UpsServiceClient2.prototype.callGetSystemDistanceUnits = function(deviceId) {
              return __awaiter(this, void 0, void 0, function() {
                var __operationId__, queryParams, headerParams, pathParams, authorizationValue, resourcePath, errorDefinitions;
                return __generator(this, function(_a) {
                  __operationId__ = "callGetSystemDistanceUnits";
                  if (deviceId == null) {
                    throw new Error("Required parameter deviceId was null or undefined when calling " + __operationId__ + ".");
                  }
                  queryParams = [];
                  headerParams = [];
                  headerParams.push({ key: "User-Agent", value: this.userAgent });
                  pathParams = /* @__PURE__ */ new Map();
                  pathParams.set("deviceId", deviceId);
                  authorizationValue = "Bearer " + this.apiConfiguration.authorizationValue;
                  headerParams.push({ key: "Authorization", value: authorizationValue });
                  resourcePath = "/v2/devices/{deviceId}/settings/System.distanceUnits";
                  errorDefinitions = /* @__PURE__ */ new Map();
                  errorDefinitions.set(200, "Successfully get the setting");
                  errorDefinitions.set(204, "The query did not return any results.");
                  errorDefinitions.set(401, "The authentication token is malformed or invalid.");
                  errorDefinitions.set(403, "The authentication token does not have access to resource.");
                  errorDefinitions.set(429, "The skill has been throttled due to an excessive number of requests.");
                  errorDefinitions.set(0, "An unexpected error occurred.");
                  return [2, this.invoke("GET", this.apiConfiguration.apiEndpoint, resourcePath, pathParams, queryParams, headerParams, null, errorDefinitions)];
                });
              });
            };
            UpsServiceClient2.prototype.getSystemDistanceUnits = function(deviceId) {
              return __awaiter(this, void 0, void 0, function() {
                var apiResponse;
                return __generator(this, function(_a) {
                  switch (_a.label) {
                    case 0:
                      return [4, this.callGetSystemDistanceUnits(deviceId)];
                    case 1:
                      apiResponse = _a.sent();
                      return [2, apiResponse.body];
                  }
                });
              });
            };
            UpsServiceClient2.prototype.callGetSystemTemperatureUnit = function(deviceId) {
              return __awaiter(this, void 0, void 0, function() {
                var __operationId__, queryParams, headerParams, pathParams, authorizationValue, resourcePath, errorDefinitions;
                return __generator(this, function(_a) {
                  __operationId__ = "callGetSystemTemperatureUnit";
                  if (deviceId == null) {
                    throw new Error("Required parameter deviceId was null or undefined when calling " + __operationId__ + ".");
                  }
                  queryParams = [];
                  headerParams = [];
                  headerParams.push({ key: "User-Agent", value: this.userAgent });
                  pathParams = /* @__PURE__ */ new Map();
                  pathParams.set("deviceId", deviceId);
                  authorizationValue = "Bearer " + this.apiConfiguration.authorizationValue;
                  headerParams.push({ key: "Authorization", value: authorizationValue });
                  resourcePath = "/v2/devices/{deviceId}/settings/System.temperatureUnit";
                  errorDefinitions = /* @__PURE__ */ new Map();
                  errorDefinitions.set(200, "Successfully get the setting");
                  errorDefinitions.set(204, "The query did not return any results.");
                  errorDefinitions.set(401, "The authentication token is malformed or invalid.");
                  errorDefinitions.set(403, "The authentication token does not have access to resource.");
                  errorDefinitions.set(429, "The skill has been throttled due to an excessive number of requests.");
                  errorDefinitions.set(0, "An unexpected error occurred.");
                  return [2, this.invoke("GET", this.apiConfiguration.apiEndpoint, resourcePath, pathParams, queryParams, headerParams, null, errorDefinitions)];
                });
              });
            };
            UpsServiceClient2.prototype.getSystemTemperatureUnit = function(deviceId) {
              return __awaiter(this, void 0, void 0, function() {
                var apiResponse;
                return __generator(this, function(_a) {
                  switch (_a.label) {
                    case 0:
                      return [4, this.callGetSystemTemperatureUnit(deviceId)];
                    case 1:
                      apiResponse = _a.sent();
                      return [2, apiResponse.body];
                  }
                });
              });
            };
            UpsServiceClient2.prototype.callGetSystemTimeZone = function(deviceId) {
              return __awaiter(this, void 0, void 0, function() {
                var __operationId__, queryParams, headerParams, pathParams, authorizationValue, resourcePath, errorDefinitions;
                return __generator(this, function(_a) {
                  __operationId__ = "callGetSystemTimeZone";
                  if (deviceId == null) {
                    throw new Error("Required parameter deviceId was null or undefined when calling " + __operationId__ + ".");
                  }
                  queryParams = [];
                  headerParams = [];
                  headerParams.push({ key: "User-Agent", value: this.userAgent });
                  pathParams = /* @__PURE__ */ new Map();
                  pathParams.set("deviceId", deviceId);
                  authorizationValue = "Bearer " + this.apiConfiguration.authorizationValue;
                  headerParams.push({ key: "Authorization", value: authorizationValue });
                  resourcePath = "/v2/devices/{deviceId}/settings/System.timeZone";
                  errorDefinitions = /* @__PURE__ */ new Map();
                  errorDefinitions.set(200, "Successfully get the setting");
                  errorDefinitions.set(204, "The query did not return any results.");
                  errorDefinitions.set(401, "The authentication token is malformed or invalid.");
                  errorDefinitions.set(403, "The authentication token does not have access to resource.");
                  errorDefinitions.set(429, "The skill has been throttled due to an excessive number of requests.");
                  errorDefinitions.set(0, "An unexpected error occurred.");
                  return [2, this.invoke("GET", this.apiConfiguration.apiEndpoint, resourcePath, pathParams, queryParams, headerParams, null, errorDefinitions)];
                });
              });
            };
            UpsServiceClient2.prototype.getSystemTimeZone = function(deviceId) {
              return __awaiter(this, void 0, void 0, function() {
                var apiResponse;
                return __generator(this, function(_a) {
                  switch (_a.label) {
                    case 0:
                      return [4, this.callGetSystemTimeZone(deviceId)];
                    case 1:
                      apiResponse = _a.sent();
                      return [2, apiResponse.body];
                  }
                });
              });
            };
            UpsServiceClient2.prototype.callGetPersonsProfileGivenName = function() {
              return __awaiter(this, void 0, void 0, function() {
                var __operationId__, queryParams, headerParams, pathParams, authorizationValue, resourcePath, errorDefinitions;
                return __generator(this, function(_a) {
                  __operationId__ = "callGetPersonsProfileGivenName";
                  queryParams = [];
                  headerParams = [];
                  headerParams.push({ key: "User-Agent", value: this.userAgent });
                  pathParams = /* @__PURE__ */ new Map();
                  authorizationValue = "Bearer " + this.apiConfiguration.authorizationValue;
                  headerParams.push({ key: "Authorization", value: authorizationValue });
                  resourcePath = "/v2/persons/~current/profile/givenName";
                  errorDefinitions = /* @__PURE__ */ new Map();
                  errorDefinitions.set(200, "Successfully retrieved the requested information.");
                  errorDefinitions.set(204, "The query did not return any results.");
                  errorDefinitions.set(401, "The authentication token is malformed or invalid.");
                  errorDefinitions.set(403, "The authentication token does not have access to resource.");
                  errorDefinitions.set(429, "The skill has been throttled due to an excessive number of requests.");
                  errorDefinitions.set(0, "An unexpected error occurred.");
                  return [2, this.invoke("GET", this.apiConfiguration.apiEndpoint, resourcePath, pathParams, queryParams, headerParams, null, errorDefinitions)];
                });
              });
            };
            UpsServiceClient2.prototype.getPersonsProfileGivenName = function() {
              return __awaiter(this, void 0, void 0, function() {
                var apiResponse;
                return __generator(this, function(_a) {
                  switch (_a.label) {
                    case 0:
                      return [4, this.callGetPersonsProfileGivenName()];
                    case 1:
                      apiResponse = _a.sent();
                      return [2, apiResponse.body];
                  }
                });
              });
            };
            UpsServiceClient2.prototype.callGetPersonsProfileMobileNumber = function() {
              return __awaiter(this, void 0, void 0, function() {
                var __operationId__, queryParams, headerParams, pathParams, authorizationValue, resourcePath, errorDefinitions;
                return __generator(this, function(_a) {
                  __operationId__ = "callGetPersonsProfileMobileNumber";
                  queryParams = [];
                  headerParams = [];
                  headerParams.push({ key: "User-Agent", value: this.userAgent });
                  pathParams = /* @__PURE__ */ new Map();
                  authorizationValue = "Bearer " + this.apiConfiguration.authorizationValue;
                  headerParams.push({ key: "Authorization", value: authorizationValue });
                  resourcePath = "/v2/persons/~current/profile/mobileNumber";
                  errorDefinitions = /* @__PURE__ */ new Map();
                  errorDefinitions.set(200, "Successfully retrieved the requested information.");
                  errorDefinitions.set(204, "The query did not return any results.");
                  errorDefinitions.set(401, "The authentication token is malformed or invalid.");
                  errorDefinitions.set(403, "The authentication token does not have access to resource.");
                  errorDefinitions.set(429, "The skill has been throttled due to an excessive number of requests.");
                  errorDefinitions.set(0, "An unexpected error occurred.");
                  return [2, this.invoke("GET", this.apiConfiguration.apiEndpoint, resourcePath, pathParams, queryParams, headerParams, null, errorDefinitions)];
                });
              });
            };
            UpsServiceClient2.prototype.getPersonsProfileMobileNumber = function() {
              return __awaiter(this, void 0, void 0, function() {
                var apiResponse;
                return __generator(this, function(_a) {
                  switch (_a.label) {
                    case 0:
                      return [4, this.callGetPersonsProfileMobileNumber()];
                    case 1:
                      apiResponse = _a.sent();
                      return [2, apiResponse.body];
                  }
                });
              });
            };
            UpsServiceClient2.prototype.callGetPersonsProfileName = function() {
              return __awaiter(this, void 0, void 0, function() {
                var __operationId__, queryParams, headerParams, pathParams, authorizationValue, resourcePath, errorDefinitions;
                return __generator(this, function(_a) {
                  __operationId__ = "callGetPersonsProfileName";
                  queryParams = [];
                  headerParams = [];
                  headerParams.push({ key: "User-Agent", value: this.userAgent });
                  pathParams = /* @__PURE__ */ new Map();
                  authorizationValue = "Bearer " + this.apiConfiguration.authorizationValue;
                  headerParams.push({ key: "Authorization", value: authorizationValue });
                  resourcePath = "/v2/persons/~current/profile/name";
                  errorDefinitions = /* @__PURE__ */ new Map();
                  errorDefinitions.set(200, "Successfully retrieved the requested information.");
                  errorDefinitions.set(204, "The query did not return any results.");
                  errorDefinitions.set(401, "The authentication token is malformed or invalid.");
                  errorDefinitions.set(403, "The authentication token does not have access to resource.");
                  errorDefinitions.set(429, "The skill has been throttled due to an excessive number of requests.");
                  errorDefinitions.set(0, "An unexpected error occurred.");
                  return [2, this.invoke("GET", this.apiConfiguration.apiEndpoint, resourcePath, pathParams, queryParams, headerParams, null, errorDefinitions)];
                });
              });
            };
            UpsServiceClient2.prototype.getPersonsProfileName = function() {
              return __awaiter(this, void 0, void 0, function() {
                var apiResponse;
                return __generator(this, function(_a) {
                  switch (_a.label) {
                    case 0:
                      return [4, this.callGetPersonsProfileName()];
                    case 1:
                      apiResponse = _a.sent();
                      return [2, apiResponse.body];
                  }
                });
              });
            };
            return UpsServiceClient2;
          })(services2.BaseServiceClient)
        );
        ups2.UpsServiceClient = UpsServiceClient;
      })(ups = services2.ups || (services2.ups = {}));
    })(services = exports2.services || (exports2.services = {}));
    (function(services2) {
      var ServiceClientFactory = (
        /** @class */
        (function() {
          function ServiceClientFactory2(apiConfiguration) {
            this.apiConfiguration = apiConfiguration;
          }
          ServiceClientFactory2.prototype.getDeviceAddressServiceClient = function() {
            try {
              return new services2.deviceAddress.DeviceAddressServiceClient(this.apiConfiguration);
            } catch (e) {
              var factoryError = new Error("ServiceClientFactory Error while initializing DeviceAddressServiceClient: " + e.message);
              factoryError["name"] = "ServiceClientFactoryError";
              throw factoryError;
            }
          };
          ServiceClientFactory2.prototype.getDirectiveServiceClient = function() {
            try {
              return new services2.directive.DirectiveServiceClient(this.apiConfiguration);
            } catch (e) {
              var factoryError = new Error("ServiceClientFactory Error while initializing DirectiveServiceClient: " + e.message);
              factoryError["name"] = "ServiceClientFactoryError";
              throw factoryError;
            }
          };
          ServiceClientFactory2.prototype.getEndpointEnumerationServiceClient = function() {
            try {
              return new services2.endpointEnumeration.EndpointEnumerationServiceClient(this.apiConfiguration);
            } catch (e) {
              var factoryError = new Error("ServiceClientFactory Error while initializing EndpointEnumerationServiceClient: " + e.message);
              factoryError["name"] = "ServiceClientFactoryError";
              throw factoryError;
            }
          };
          ServiceClientFactory2.prototype.getListManagementServiceClient = function() {
            try {
              return new services2.listManagement.ListManagementServiceClient(this.apiConfiguration);
            } catch (e) {
              var factoryError = new Error("ServiceClientFactory Error while initializing ListManagementServiceClient: " + e.message);
              factoryError["name"] = "ServiceClientFactoryError";
              throw factoryError;
            }
          };
          ServiceClientFactory2.prototype.getMonetizationServiceClient = function() {
            try {
              return new services2.monetization.MonetizationServiceClient(this.apiConfiguration);
            } catch (e) {
              var factoryError = new Error("ServiceClientFactory Error while initializing MonetizationServiceClient: " + e.message);
              factoryError["name"] = "ServiceClientFactoryError";
              throw factoryError;
            }
          };
          ServiceClientFactory2.prototype.getReminderManagementServiceClient = function() {
            try {
              return new services2.reminderManagement.ReminderManagementServiceClient(this.apiConfiguration);
            } catch (e) {
              var factoryError = new Error("ServiceClientFactory Error while initializing ReminderManagementServiceClient: " + e.message);
              factoryError["name"] = "ServiceClientFactoryError";
              throw factoryError;
            }
          };
          ServiceClientFactory2.prototype.getTimerManagementServiceClient = function() {
            try {
              return new services2.timerManagement.TimerManagementServiceClient(this.apiConfiguration);
            } catch (e) {
              var factoryError = new Error("ServiceClientFactory Error while initializing TimerManagementServiceClient: " + e.message);
              factoryError["name"] = "ServiceClientFactoryError";
              throw factoryError;
            }
          };
          ServiceClientFactory2.prototype.getUpsServiceClient = function() {
            try {
              return new services2.ups.UpsServiceClient(this.apiConfiguration);
            } catch (e) {
              var factoryError = new Error("ServiceClientFactory Error while initializing UpsServiceClient: " + e.message);
              factoryError["name"] = "ServiceClientFactoryError";
              throw factoryError;
            }
          };
          return ServiceClientFactory2;
        })()
      );
      services2.ServiceClientFactory = ServiceClientFactory;
    })(services = exports2.services || (exports2.services = {}));
  }
});

// node_modules/ask-sdk-core/package.json
var require_package2 = __commonJS({
  "node_modules/ask-sdk-core/package.json"(exports2, module2) {
    module2.exports = {
      name: "ask-sdk-core",
      version: "2.14.0",
      description: "Core package for Alexa Skills Kit SDK",
      main: "dist/index.js",
      types: "dist/index.d.ts",
      scripts: {
        build: "tsc && npm run lint",
        compile: "tsc",
        test: 'cross-env TS_NODE_FILES=true mocha -r ts-node/register "./tst/**/*.spec.ts"',
        lint: 'eslint "lib/**/*.{ts,tsx}" "tst/**/*.{ts,tsx}"',
        clean: "rm -rf ./dist",
        reinstall: "rm -rf ./node_modules && npm install"
      },
      author: "Amazon.com",
      contributors: [
        {
          name: "Tianren Zhang",
          email: "tianrenz@amazon.com"
        },
        {
          name: "Tiantian Xie",
          email: "xtiantia@amazon.com"
        }
      ],
      license: "Apache-2.0",
      keywords: [
        "Alexa",
        "SDK"
      ],
      dependencies: {
        "ask-sdk-runtime": "^2.14.0"
      },
      peerDependencies: {
        "ask-sdk-model": "^1.29.0"
      },
      devDependencies: {
        "@types/chai": "^4.1.2",
        "@types/mocha": "^5.0.0",
        "@types/node": "^16.11.1",
        "@types/sinon": "^7.0.13",
        "@typescript-eslint/eslint-plugin": "^3.9.0",
        "@typescript-eslint/parser": "^3.9.0",
        "ask-sdk-model": "^1.29.0",
        chai: "^4.1.2",
        "cross-env": "^7.0.2",
        eslint: "^7.6.0",
        "eslint-plugin-tsdoc": "^0.2.6",
        mocha: "^5.0.5",
        nock: "^9.2.3",
        nyc: "^14.1.1",
        sinon: "^7.0.13",
        "ts-node": "^6.0.1",
        typescript: "^4.9.5"
      },
      repository: "github:alexa/alexa-skills-kit-sdk-for-nodejs",
      bugs: "https://github.com/alexa/alexa-skill-sdk-for-nodejs/issues",
      homepage: "https://github.com/alexa/alexa-skill-sdk-for-nodejs#readme",
      gitHead: "f2bc5744b5240e01cef9b6f797f49408af7d984b"
    };
  }
});

// node_modules/ask-sdk-core/dist/skill/CustomSkill.js
var require_CustomSkill = __commonJS({
  "node_modules/ask-sdk-core/dist/skill/CustomSkill.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.CustomSkill = void 0;
    var ask_sdk_model_1 = require_ask_sdk_model();
    var ask_sdk_runtime_1 = require_dist();
    var AttributesManagerFactory_1 = require_AttributesManagerFactory();
    var ResponseFactory_1 = require_ResponseFactory();
    var ServiceClientFactory = ask_sdk_model_1.services.ServiceClientFactory;
    var CustomSkill = class {
      constructor(skillConfiguration) {
        this.persistenceAdapter = skillConfiguration.persistenceAdapter;
        this.apiClient = skillConfiguration.apiClient;
        this.customUserAgent = skillConfiguration.customUserAgent;
        this.skillId = skillConfiguration.skillId;
        this.requestDispatcher = new ask_sdk_runtime_1.GenericRequestDispatcher({
          requestMappers: skillConfiguration.requestMappers,
          handlerAdapters: skillConfiguration.handlerAdapters,
          errorMapper: skillConfiguration.errorMapper,
          requestInterceptors: skillConfiguration.requestInterceptors,
          responseInterceptors: skillConfiguration.responseInterceptors
        });
        const packageInfo = require_package2();
        ask_sdk_runtime_1.UserAgentManager.registerComponent((0, ask_sdk_runtime_1.createAskSdkUserAgent)(packageInfo.version));
        if (this.customUserAgent) {
          ask_sdk_runtime_1.UserAgentManager.registerComponent(this.customUserAgent);
        }
      }
      /**
       * Invokes the dispatcher to handler the request envelope and construct the handler input.
       * @param requestEnvelope
       * @param context
       */
      async invoke(requestEnvelope, context) {
        if (this.skillId != null && requestEnvelope.context.System.application.applicationId !== this.skillId) {
          throw (0, ask_sdk_runtime_1.createAskSdkError)(this.constructor.name, "CustomSkill ID verification failed!");
        }
        const input = {
          requestEnvelope,
          context,
          attributesManager: AttributesManagerFactory_1.AttributesManagerFactory.init({
            requestEnvelope,
            persistenceAdapter: this.persistenceAdapter
          }),
          responseBuilder: ResponseFactory_1.ResponseFactory.init(),
          serviceClientFactory: this.apiClient ? new ServiceClientFactory({
            apiClient: this.apiClient,
            apiEndpoint: requestEnvelope.context.System.apiEndpoint,
            authorizationValue: requestEnvelope.context.System.apiAccessToken
          }) : void 0
        };
        const response = await this.requestDispatcher.dispatch(input);
        return {
          version: "1.0",
          response,
          userAgent: ask_sdk_runtime_1.UserAgentManager.getUserAgent(),
          sessionAttributes: requestEnvelope.session ? input.attributesManager.getSessionAttributes() : void 0
        };
      }
      /**
       * Determines if the skill can support the specific request type.
       * @param input
       * @param context
       */
      supports(input, context) {
        return !!input.request;
      }
      /**
       * Append additional user agent info
       * @param userAgent
       */
      appendAdditionalUserAgent(userAgent) {
        ask_sdk_runtime_1.UserAgentManager.registerComponent(userAgent);
      }
    };
    exports2.CustomSkill = CustomSkill;
  }
});

// node_modules/ask-sdk-core/dist/skill/factory/BaseSkillFactory.js
var require_BaseSkillFactory = __commonJS({
  "node_modules/ask-sdk-core/dist/skill/factory/BaseSkillFactory.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.BaseSkillFactory = void 0;
    var ask_sdk_runtime_1 = require_dist();
    var CustomSkill_1 = require_CustomSkill();
    var BaseSkillFactory = class {
      static init() {
        const runtimeConfigurationBuilder = new ask_sdk_runtime_1.RuntimeConfigurationBuilder();
        let thisCustomUserAgent;
        let thisSkillId;
        return {
          addRequestHandler(matcher, executor) {
            const canHandle = typeof matcher === "string" ? ({ requestEnvelope }) => matcher === (requestEnvelope.request.type === "IntentRequest" ? requestEnvelope.request.intent.name : requestEnvelope.request.type) : matcher;
            runtimeConfigurationBuilder.addRequestHandler(canHandle, executor);
            return this;
          },
          addRequestHandlers(...requestHandlers) {
            runtimeConfigurationBuilder.addRequestHandlers(...requestHandlers);
            return this;
          },
          addRequestInterceptors(...executors) {
            runtimeConfigurationBuilder.addRequestInterceptors(...executors);
            return this;
          },
          addResponseInterceptors(...executors) {
            runtimeConfigurationBuilder.addResponseInterceptors(...executors);
            return this;
          },
          addErrorHandler(matcher, executor) {
            runtimeConfigurationBuilder.addErrorHandler(matcher, executor);
            return this;
          },
          addErrorHandlers(...errorHandlers) {
            runtimeConfigurationBuilder.addErrorHandlers(...errorHandlers);
            return this;
          },
          withCustomUserAgent(customUserAgent) {
            thisCustomUserAgent = customUserAgent;
            return this;
          },
          withSkillId(skillId) {
            thisSkillId = skillId;
            return this;
          },
          getSkillConfiguration() {
            const runtimeConfiguration = runtimeConfigurationBuilder.getRuntimeConfiguration();
            return Object.assign(Object.assign({}, runtimeConfiguration), { customUserAgent: thisCustomUserAgent, skillId: thisSkillId });
          },
          create() {
            return new CustomSkill_1.CustomSkill(this.getSkillConfiguration());
          },
          lambda() {
            const skill = new CustomSkill_1.CustomSkill(this.getSkillConfiguration());
            return (event, context, callback) => {
              skill.invoke(event, context).then((response) => {
                callback(null, response);
              }).catch((err) => {
                callback(err, null);
              });
            };
          }
        };
      }
      constructor() {
      }
    };
    exports2.BaseSkillFactory = BaseSkillFactory;
  }
});

// node_modules/ask-sdk-core/dist/skill/factory/CustomSkillFactory.js
var require_CustomSkillFactory = __commonJS({
  "node_modules/ask-sdk-core/dist/skill/factory/CustomSkillFactory.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.CustomSkillFactory = void 0;
    var BaseSkillFactory_1 = require_BaseSkillFactory();
    var CustomSkillFactory = class {
      static init() {
        let thisPersistenceAdapter;
        let thisApiClient;
        const baseSkillBuilder = BaseSkillFactory_1.BaseSkillFactory.init();
        return Object.assign(Object.assign({}, baseSkillBuilder), {
          getSkillConfiguration() {
            const skillConfiguration = baseSkillBuilder.getSkillConfiguration();
            return Object.assign(Object.assign({}, skillConfiguration), { persistenceAdapter: thisPersistenceAdapter, apiClient: thisApiClient });
          },
          withPersistenceAdapter(persistenceAdapter) {
            thisPersistenceAdapter = persistenceAdapter;
            return this;
          },
          withApiClient(apiClient) {
            thisApiClient = apiClient;
            return this;
          }
        });
      }
      constructor() {
      }
    };
    exports2.CustomSkillFactory = CustomSkillFactory;
  }
});

// node_modules/ask-sdk-core/dist/skill/SkillBuilders.js
var require_SkillBuilders = __commonJS({
  "node_modules/ask-sdk-core/dist/skill/SkillBuilders.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.SkillBuilders = void 0;
    var CustomSkillFactory_1 = require_CustomSkillFactory();
    exports2.SkillBuilders = {
      custom() {
        return CustomSkillFactory_1.CustomSkillFactory.init();
      }
    };
  }
});

// node_modules/ask-sdk-core/dist/util/ViewportUtils.js
var require_ViewportUtils = __commonJS({
  "node_modules/ask-sdk-core/dist/util/ViewportUtils.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.getViewportProfile = exports2.getViewportDpiGroup = exports2.getViewportSizeGroup = exports2.getViewportOrientation = exports2.ViewportDpiGroupOrder = exports2.ViewportSizeGroupOrder = void 0;
    var ask_sdk_runtime_1 = require_dist();
    exports2.ViewportSizeGroupOrder = ["XSMALL", "SMALL", "MEDIUM", "LARGE", "XLARGE"];
    exports2.ViewportDpiGroupOrder = ["XLOW", "LOW", "MEDIUM", "HIGH", "XHIGH", "XXHIGH"];
    function getViewportOrientation(width, height) {
      return width > height ? "LANDSCAPE" : width < height ? "PORTRAIT" : "EQUAL";
    }
    exports2.getViewportOrientation = getViewportOrientation;
    function getViewportSizeGroup(size) {
      if (isBetween(size, 0, 600)) {
        return "XSMALL";
      } else if (isBetween(size, 600, 960)) {
        return "SMALL";
      } else if (isBetween(size, 960, 1280)) {
        return "MEDIUM";
      } else if (isBetween(size, 1280, 1920)) {
        return "LARGE";
      } else if (isBetween(size, 1920, Number.MAX_VALUE)) {
        return "XLARGE";
      }
      throw (0, ask_sdk_runtime_1.createAskSdkError)("ViewportUtils", `unknown size group value ${size}`);
    }
    exports2.getViewportSizeGroup = getViewportSizeGroup;
    function getViewportDpiGroup(dpi) {
      if (isBetween(dpi, 0, 121)) {
        return "XLOW";
      } else if (isBetween(dpi, 121, 161)) {
        return "LOW";
      } else if (isBetween(dpi, 161, 241)) {
        return "MEDIUM";
      } else if (isBetween(dpi, 241, 321)) {
        return "HIGH";
      } else if (isBetween(dpi, 321, 481)) {
        return "XHIGH";
      } else if (isBetween(dpi, 481, Number.MAX_VALUE)) {
        return "XXHIGH";
      }
      throw (0, ask_sdk_runtime_1.createAskSdkError)("ViewportUtils", `unknown dpi group value ${dpi}`);
    }
    exports2.getViewportDpiGroup = getViewportDpiGroup;
    function isBetween(target, min, max) {
      return target >= min && target < max;
    }
    function getViewportProfile(requestEnvelope) {
      const viewportState = requestEnvelope.context.Viewport;
      if (viewportState) {
        const currentPixelWidth = viewportState.currentPixelWidth;
        const currentPixelHeight = viewportState.currentPixelHeight;
        const dpi = viewportState.dpi;
        const shape = viewportState.shape;
        const viewportOrientation = getViewportOrientation(currentPixelWidth, currentPixelHeight);
        const viewportDpiGroup = getViewportDpiGroup(dpi);
        const pixelWidthSizeGroup = getViewportSizeGroup(currentPixelWidth);
        const pixelHeightSizeGroup = getViewportSizeGroup(currentPixelHeight);
        if (shape === "ROUND" && viewportOrientation === "EQUAL" && viewportDpiGroup === "LOW" && pixelWidthSizeGroup === "XSMALL" && pixelHeightSizeGroup === "XSMALL") {
          return "HUB-ROUND-SMALL";
        }
        if (shape === "RECTANGLE" && viewportOrientation === "LANDSCAPE" && viewportDpiGroup === "LOW" && exports2.ViewportSizeGroupOrder.indexOf(pixelWidthSizeGroup) <= exports2.ViewportSizeGroupOrder.indexOf("MEDIUM") && exports2.ViewportSizeGroupOrder.indexOf(pixelHeightSizeGroup) <= exports2.ViewportSizeGroupOrder.indexOf("XSMALL")) {
          return "HUB-LANDSCAPE-SMALL";
        }
        if (shape === "RECTANGLE" && viewportOrientation === "LANDSCAPE" && viewportDpiGroup === "LOW" && exports2.ViewportSizeGroupOrder.indexOf(pixelWidthSizeGroup) <= exports2.ViewportSizeGroupOrder.indexOf("MEDIUM") && exports2.ViewportSizeGroupOrder.indexOf(pixelHeightSizeGroup) <= exports2.ViewportSizeGroupOrder.indexOf("SMALL")) {
          return "HUB-LANDSCAPE-MEDIUM";
        }
        if (shape === "RECTANGLE" && viewportOrientation === "LANDSCAPE" && viewportDpiGroup === "LOW" && exports2.ViewportSizeGroupOrder.indexOf(pixelWidthSizeGroup) >= exports2.ViewportSizeGroupOrder.indexOf("LARGE") && exports2.ViewportSizeGroupOrder.indexOf(pixelHeightSizeGroup) >= exports2.ViewportSizeGroupOrder.indexOf("SMALL")) {
          return "HUB-LANDSCAPE-LARGE";
        }
        if (shape === "RECTANGLE" && viewportOrientation === "LANDSCAPE" && viewportDpiGroup === "MEDIUM" && exports2.ViewportSizeGroupOrder.indexOf(pixelWidthSizeGroup) >= exports2.ViewportSizeGroupOrder.indexOf("MEDIUM") && exports2.ViewportSizeGroupOrder.indexOf(pixelHeightSizeGroup) >= exports2.ViewportSizeGroupOrder.indexOf("SMALL")) {
          return "MOBILE-LANDSCAPE-MEDIUM";
        }
        if (shape === "RECTANGLE" && viewportOrientation === "PORTRAIT" && viewportDpiGroup === "MEDIUM" && exports2.ViewportSizeGroupOrder.indexOf(pixelWidthSizeGroup) >= exports2.ViewportSizeGroupOrder.indexOf("SMALL") && exports2.ViewportSizeGroupOrder.indexOf(pixelHeightSizeGroup) >= exports2.ViewportSizeGroupOrder.indexOf("MEDIUM")) {
          return "MOBILE-PORTRAIT-MEDIUM";
        }
        if (shape === "RECTANGLE" && viewportOrientation === "LANDSCAPE" && viewportDpiGroup === "MEDIUM" && exports2.ViewportSizeGroupOrder.indexOf(pixelWidthSizeGroup) >= exports2.ViewportSizeGroupOrder.indexOf("SMALL") && exports2.ViewportSizeGroupOrder.indexOf(pixelHeightSizeGroup) >= exports2.ViewportSizeGroupOrder.indexOf("XSMALL")) {
          return "MOBILE-LANDSCAPE-SMALL";
        }
        if (shape === "RECTANGLE" && viewportOrientation === "PORTRAIT" && viewportDpiGroup === "MEDIUM" && exports2.ViewportSizeGroupOrder.indexOf(pixelWidthSizeGroup) >= exports2.ViewportSizeGroupOrder.indexOf("XSMALL") && exports2.ViewportSizeGroupOrder.indexOf(pixelHeightSizeGroup) >= exports2.ViewportSizeGroupOrder.indexOf("SMALL")) {
          return "MOBILE-PORTRAIT-SMALL";
        }
        if (shape === "RECTANGLE" && viewportOrientation === "LANDSCAPE" && exports2.ViewportDpiGroupOrder.indexOf(viewportDpiGroup) >= exports2.ViewportDpiGroupOrder.indexOf("HIGH") && exports2.ViewportSizeGroupOrder.indexOf(pixelWidthSizeGroup) >= exports2.ViewportSizeGroupOrder.indexOf("XLARGE") && exports2.ViewportSizeGroupOrder.indexOf(pixelHeightSizeGroup) >= exports2.ViewportSizeGroupOrder.indexOf("MEDIUM")) {
          return "TV-LANDSCAPE-XLARGE";
        }
        if (shape === "RECTANGLE" && viewportOrientation === "PORTRAIT" && exports2.ViewportDpiGroupOrder.indexOf(viewportDpiGroup) >= exports2.ViewportDpiGroupOrder.indexOf("HIGH") && pixelWidthSizeGroup === "XSMALL" && pixelHeightSizeGroup === "XLARGE") {
          return "TV-PORTRAIT-MEDIUM";
        }
        if (shape === "RECTANGLE" && viewportOrientation === "LANDSCAPE" && exports2.ViewportDpiGroupOrder.indexOf(viewportDpiGroup) >= exports2.ViewportDpiGroupOrder.indexOf("HIGH") && pixelWidthSizeGroup === "MEDIUM" && pixelHeightSizeGroup === "SMALL") {
          return "TV-LANDSCAPE-MEDIUM";
        }
      }
      return "UNKNOWN-VIEWPORT-PROFILE";
    }
    exports2.getViewportProfile = getViewportProfile;
  }
});

// node_modules/ask-sdk-core/dist/util/SsmlUtils.js
var require_SsmlUtils = __commonJS({
  "node_modules/ask-sdk-core/dist/util/SsmlUtils.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.escapeXmlCharacters = void 0;
    function escapeXmlCharacters(input) {
      const invalidXmlCharactersMapping = {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&apos;"
      };
      const invalidXmlCharactersMappingReverse = Object.keys(invalidXmlCharactersMapping).reduce(
        /* eslint-disable-next-line */
        (obj, key) => {
          obj[invalidXmlCharactersMapping[key]] = key;
          return obj;
        },
        {}
      );
      const sanitizedInput = input.replace(/&amp;|&lt;|&gt;|&quot;|&apos;]/g, (c) => invalidXmlCharactersMappingReverse[c]);
      return sanitizedInput.replace(/[&'"><]/g, (c) => invalidXmlCharactersMapping[c]);
    }
    exports2.escapeXmlCharacters = escapeXmlCharacters;
  }
});

// node_modules/ask-sdk-core/dist/components/ComponentInterface.js
var require_ComponentInterface = __commonJS({
  "node_modules/ask-sdk-core/dist/components/ComponentInterface.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.ComponentInterface = void 0;
    var ComponentInterface = class {
    };
    exports2.ComponentInterface = ComponentInterface;
  }
});

// node_modules/ask-sdk-core/dist/util/ComponentUtils.js
var require_ComponentUtils = __commonJS({
  "node_modules/ask-sdk-core/dist/util/ComponentUtils.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.egressFromComponent = exports2.launchComponent = void 0;
    var ask_sdk_runtime_1 = require_dist();
    var RequestEnvelopeUtils_1 = require_RequestEnvelopeUtils();
    function launchComponent(options) {
      const directiveType = "Dialog.DelegateRequest";
      const delegationTarget = "AMAZON.Conversations";
      const updatedRequestType = "Dialog.InputRequest";
      const delegationPeriod = {
        until: "EXPLICIT_RETURN"
      };
      if (!options || options.isUserUtteranceInput || !options.utteranceSetName) {
        const delegateRequestDirective2 = {
          type: directiveType,
          target: delegationTarget,
          period: delegationPeriod
        };
        return delegateRequestDirective2;
      }
      const dialogInput = {
        name: options.utteranceSetName,
        slots: options.slots || {}
      };
      const updatedRequest = {
        type: updatedRequestType,
        input: dialogInput
      };
      const delegateRequestDirective = {
        type: directiveType,
        target: delegationTarget,
        period: delegationPeriod,
        updatedRequest
      };
      return delegateRequestDirective;
    }
    exports2.launchComponent = launchComponent;
    function egressFromComponent(actionName, egressInput) {
      if (!egressInput.intentName && !egressInput.handle) {
        throw (0, ask_sdk_runtime_1.createAskSdkError)("ComponentUtils", "No intentName or handle callback provided for egressing from skill component");
      }
      const directiveType = "Dialog.DelegateRequest";
      const delegationTarget = "skill";
      const updatedRequestType = "IntentRequest";
      const delegationPeriod = {
        until: "EXPLICIT_RETURN"
      };
      const skillRequestType = "Dialog.API.Invoked";
      const delegateToIntentHandler = {
        canHandle(input) {
          return (0, RequestEnvelopeUtils_1.getRequestType)(input.requestEnvelope) === skillRequestType && input.requestEnvelope.request.apiRequest.name === actionName;
        },
        handle(input) {
          if (egressInput.handle) {
            return egressInput.handle(input);
          }
          const intent = {
            name: egressInput.intentName,
            confirmationStatus: "NONE"
          };
          const updatedRequest = {
            type: updatedRequestType,
            intent
          };
          const delegateRequestDirective = {
            type: directiveType,
            target: delegationTarget,
            period: delegationPeriod,
            updatedRequest
          };
          return input.responseBuilder.addDirective(delegateRequestDirective).getResponse();
        }
      };
      return delegateToIntentHandler;
    }
    exports2.egressFromComponent = egressFromComponent;
  }
});

// node_modules/ask-sdk-core/dist/index.js
var require_dist2 = __commonJS({
  "node_modules/ask-sdk-core/dist/index.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.egressFromComponent = exports2.launchComponent = exports2.ComponentInterface = exports2.UserAgentManager = exports2.createAskSdkUserAgent = exports2.createAskSdkError = exports2.isNewSession = exports2.getSupportedInterfaces = exports2.getSlotValue = exports2.getSlot = exports2.getSimpleSlotValues = exports2.getRequestType = exports2.getRequest = exports2.getLocale = exports2.getIntentName = exports2.getSlotValueV2 = exports2.getDialogState = exports2.getUserId = exports2.getDeviceId = exports2.getApiAccessToken = exports2.getAccountLinkingAccessToken = exports2.escapeXmlCharacters = exports2.ViewportSizeGroupOrder = exports2.ViewportDpiGroupOrder = exports2.getViewportSizeGroup = exports2.getViewportProfile = exports2.getViewportOrientation = exports2.getViewportDpiGroup = exports2.SkillBuilders = exports2.CustomSkillFactory = exports2.BaseSkillFactory = exports2.Skill = exports2.DefaultApiClient = exports2.TextContentHelper = exports2.RichTextContentHelper = exports2.ResponseFactory = exports2.PlainTextContentHelper = exports2.ImageHelper = exports2.DelegateToIntentHandler = exports2.AttributesManagerFactory = void 0;
    var AttributesManagerFactory_1 = require_AttributesManagerFactory();
    Object.defineProperty(exports2, "AttributesManagerFactory", { enumerable: true, get: function() {
      return AttributesManagerFactory_1.AttributesManagerFactory;
    } });
    var DelegateToIntentHandler_1 = require_DelegateToIntentHandler();
    Object.defineProperty(exports2, "DelegateToIntentHandler", { enumerable: true, get: function() {
      return DelegateToIntentHandler_1.DelegateToIntentHandler;
    } });
    var ImageHelper_1 = require_ImageHelper();
    Object.defineProperty(exports2, "ImageHelper", { enumerable: true, get: function() {
      return ImageHelper_1.ImageHelper;
    } });
    var PlainTextContentHelper_1 = require_PlainTextContentHelper();
    Object.defineProperty(exports2, "PlainTextContentHelper", { enumerable: true, get: function() {
      return PlainTextContentHelper_1.PlainTextContentHelper;
    } });
    var ResponseFactory_1 = require_ResponseFactory();
    Object.defineProperty(exports2, "ResponseFactory", { enumerable: true, get: function() {
      return ResponseFactory_1.ResponseFactory;
    } });
    var RichTextContentHelper_1 = require_RichTextContentHelper();
    Object.defineProperty(exports2, "RichTextContentHelper", { enumerable: true, get: function() {
      return RichTextContentHelper_1.RichTextContentHelper;
    } });
    var TextContentHelper_1 = require_TextContentHelper();
    Object.defineProperty(exports2, "TextContentHelper", { enumerable: true, get: function() {
      return TextContentHelper_1.TextContentHelper;
    } });
    var DefaultApiClient_1 = require_DefaultApiClient();
    Object.defineProperty(exports2, "DefaultApiClient", { enumerable: true, get: function() {
      return DefaultApiClient_1.DefaultApiClient;
    } });
    var CustomSkill_1 = require_CustomSkill();
    Object.defineProperty(exports2, "Skill", { enumerable: true, get: function() {
      return CustomSkill_1.CustomSkill;
    } });
    var BaseSkillFactory_1 = require_BaseSkillFactory();
    Object.defineProperty(exports2, "BaseSkillFactory", { enumerable: true, get: function() {
      return BaseSkillFactory_1.BaseSkillFactory;
    } });
    var CustomSkillFactory_1 = require_CustomSkillFactory();
    Object.defineProperty(exports2, "CustomSkillFactory", { enumerable: true, get: function() {
      return CustomSkillFactory_1.CustomSkillFactory;
    } });
    var SkillBuilders_1 = require_SkillBuilders();
    Object.defineProperty(exports2, "SkillBuilders", { enumerable: true, get: function() {
      return SkillBuilders_1.SkillBuilders;
    } });
    var ViewportUtils_1 = require_ViewportUtils();
    Object.defineProperty(exports2, "getViewportDpiGroup", { enumerable: true, get: function() {
      return ViewportUtils_1.getViewportDpiGroup;
    } });
    Object.defineProperty(exports2, "getViewportOrientation", { enumerable: true, get: function() {
      return ViewportUtils_1.getViewportOrientation;
    } });
    Object.defineProperty(exports2, "getViewportProfile", { enumerable: true, get: function() {
      return ViewportUtils_1.getViewportProfile;
    } });
    Object.defineProperty(exports2, "getViewportSizeGroup", { enumerable: true, get: function() {
      return ViewportUtils_1.getViewportSizeGroup;
    } });
    Object.defineProperty(exports2, "ViewportDpiGroupOrder", { enumerable: true, get: function() {
      return ViewportUtils_1.ViewportDpiGroupOrder;
    } });
    Object.defineProperty(exports2, "ViewportSizeGroupOrder", { enumerable: true, get: function() {
      return ViewportUtils_1.ViewportSizeGroupOrder;
    } });
    var SsmlUtils_1 = require_SsmlUtils();
    Object.defineProperty(exports2, "escapeXmlCharacters", { enumerable: true, get: function() {
      return SsmlUtils_1.escapeXmlCharacters;
    } });
    var RequestEnvelopeUtils_1 = require_RequestEnvelopeUtils();
    Object.defineProperty(exports2, "getAccountLinkingAccessToken", { enumerable: true, get: function() {
      return RequestEnvelopeUtils_1.getAccountLinkingAccessToken;
    } });
    Object.defineProperty(exports2, "getApiAccessToken", { enumerable: true, get: function() {
      return RequestEnvelopeUtils_1.getApiAccessToken;
    } });
    Object.defineProperty(exports2, "getDeviceId", { enumerable: true, get: function() {
      return RequestEnvelopeUtils_1.getDeviceId;
    } });
    Object.defineProperty(exports2, "getUserId", { enumerable: true, get: function() {
      return RequestEnvelopeUtils_1.getUserId;
    } });
    Object.defineProperty(exports2, "getDialogState", { enumerable: true, get: function() {
      return RequestEnvelopeUtils_1.getDialogState;
    } });
    Object.defineProperty(exports2, "getSlotValueV2", { enumerable: true, get: function() {
      return RequestEnvelopeUtils_1.getSlotValueV2;
    } });
    Object.defineProperty(exports2, "getIntentName", { enumerable: true, get: function() {
      return RequestEnvelopeUtils_1.getIntentName;
    } });
    Object.defineProperty(exports2, "getLocale", { enumerable: true, get: function() {
      return RequestEnvelopeUtils_1.getLocale;
    } });
    Object.defineProperty(exports2, "getRequest", { enumerable: true, get: function() {
      return RequestEnvelopeUtils_1.getRequest;
    } });
    Object.defineProperty(exports2, "getRequestType", { enumerable: true, get: function() {
      return RequestEnvelopeUtils_1.getRequestType;
    } });
    Object.defineProperty(exports2, "getSimpleSlotValues", { enumerable: true, get: function() {
      return RequestEnvelopeUtils_1.getSimpleSlotValues;
    } });
    Object.defineProperty(exports2, "getSlot", { enumerable: true, get: function() {
      return RequestEnvelopeUtils_1.getSlot;
    } });
    Object.defineProperty(exports2, "getSlotValue", { enumerable: true, get: function() {
      return RequestEnvelopeUtils_1.getSlotValue;
    } });
    Object.defineProperty(exports2, "getSupportedInterfaces", { enumerable: true, get: function() {
      return RequestEnvelopeUtils_1.getSupportedInterfaces;
    } });
    Object.defineProperty(exports2, "isNewSession", { enumerable: true, get: function() {
      return RequestEnvelopeUtils_1.isNewSession;
    } });
    var ask_sdk_runtime_1 = require_dist();
    Object.defineProperty(exports2, "createAskSdkError", { enumerable: true, get: function() {
      return ask_sdk_runtime_1.createAskSdkError;
    } });
    Object.defineProperty(exports2, "createAskSdkUserAgent", { enumerable: true, get: function() {
      return ask_sdk_runtime_1.createAskSdkUserAgent;
    } });
    Object.defineProperty(exports2, "UserAgentManager", { enumerable: true, get: function() {
      return ask_sdk_runtime_1.UserAgentManager;
    } });
    var ComponentInterface_1 = require_ComponentInterface();
    Object.defineProperty(exports2, "ComponentInterface", { enumerable: true, get: function() {
      return ComponentInterface_1.ComponentInterface;
    } });
    var ComponentUtils_1 = require_ComponentUtils();
    Object.defineProperty(exports2, "launchComponent", { enumerable: true, get: function() {
      return ComponentUtils_1.launchComponent;
    } });
    Object.defineProperty(exports2, "egressFromComponent", { enumerable: true, get: function() {
      return ComponentUtils_1.egressFromComponent;
    } });
  }
});

// src/index.ts
var index_exports = {};
__export(index_exports, {
  handler: () => handler
});
module.exports = __toCommonJS(index_exports);
var Alexa6 = __toESM(require_dist2());

// src/handlers/launch.ts
var LaunchRequestHandler = {
  canHandle(input) {
    return input.requestEnvelope.request.type === "LaunchRequest";
  },
  handle(input) {
    const speech = "Willkommen bei Momo! Du kannst eine Aufgabe hinzuf\xFCgen, deine t\xE4gliche Quest abfragen oder deine offenen Aufgaben h\xF6ren. Was m\xF6chtest du tun?";
    const reprompt = "Sage zum Beispiel: F\xFCge Zahnarzt hinzu, oder: Was ist meine Quest?";
    return input.responseBuilder.speak(speech).reprompt(reprompt).withSimpleCard("Momo", "Aufgaben hinzuf\xFCgen \xB7 Quest abfragen \xB7 Aufgaben auflisten").getResponse();
  }
};

// src/handlers/add-task.ts
var Alexa = __toESM(require_dist2());

// src/momo-client.ts
var BASE_URL = (process.env.MOMO_API_BASE_URL ?? "https://momotask.app").replace(/\/$/, "");
async function momoFetch(apiKey, path, options = {}) {
  const url = `${BASE_URL}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      ...options.headers ?? {}
    }
  });
  if (!res.ok) {
    let msg = `Momo API error ${res.status}`;
    try {
      const body = await res.json();
      if (body.error) msg = body.error;
    } catch {
    }
    throw new Error(msg);
  }
  return res.json();
}
async function addTask(apiKey, title) {
  const data = await momoFetch(apiKey, "/api/tasks", {
    method: "POST",
    body: JSON.stringify({ title, type: "ONE_TIME" })
  });
  return data.task;
}
async function getDailyQuest(apiKey) {
  const data = await momoFetch(
    apiKey,
    "/api/daily-quest"
  );
  return data.quest;
}
async function getOpenTasks(apiKey) {
  const data = await momoFetch(apiKey, "/api/tasks");
  return data.tasks.filter((t) => t.completedAt === null);
}

// src/handlers/add-task.ts
var AddTaskIntentHandler = {
  canHandle(input) {
    return input.requestEnvelope.request.type === "IntentRequest" && Alexa.getIntentName(input.requestEnvelope) === "AddTaskIntent";
  },
  async handle(input) {
    const apiKey = input.requestEnvelope.context.System.user.accessToken;
    if (!apiKey) {
      return input.responseBuilder.speak(
        "Bitte verkn\xFCpfe zuerst dein Momo-Konto in der Alexa-App. \xD6ffne die Alexa-App, gehe zu diesem Skill und tippe auf Konto verkn\xFCpfen."
      ).withLinkAccountCard().getResponse();
    }
    const request = input.requestEnvelope.request;
    const taskNameSlot = request.intent.slots?.taskName;
    const taskTitle = taskNameSlot?.value?.trim();
    if (!taskTitle) {
      return input.responseBuilder.speak("Wie soll die Aufgabe hei\xDFen? Sage zum Beispiel: F\xFCge Zahnarzt hinzu.").reprompt("F\xFCr welche Aufgabe soll ich einen Eintrag erstellen?").getResponse();
    }
    try {
      const task = await addTask(apiKey, taskTitle);
      const speech = `Erledigt! Aufgabe \u201E${task.title}" wurde zu Momo hinzugef\xFCgt.`;
      const cardText = `\u2713 ${task.title}`;
      return input.responseBuilder.speak(speech).withSimpleCard("Aufgabe hinzugef\xFCgt", cardText).getResponse();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unbekannter Fehler";
      console.error("[AddTaskIntent] API error:", errorMessage);
      return input.responseBuilder.speak(
        "Das hat leider nicht geklappt. Bitte pr\xFCfe deine Internetverbindung und versuche es erneut."
      ).getResponse();
    }
  }
};

// src/handlers/get-quest.ts
var Alexa2 = __toESM(require_dist2());
var GetQuestIntentHandler = {
  canHandle(input) {
    return input.requestEnvelope.request.type === "IntentRequest" && Alexa2.getIntentName(input.requestEnvelope) === "GetQuestIntent";
  },
  async handle(input) {
    const apiKey = input.requestEnvelope.context.System.user.accessToken;
    if (!apiKey) {
      return input.responseBuilder.speak(
        "Bitte verkn\xFCpfe zuerst dein Momo-Konto in der Alexa-App."
      ).withLinkAccountCard().getResponse();
    }
    try {
      const quest = await getDailyQuest(apiKey);
      if (!quest) {
        return input.responseBuilder.speak(
          "Du hast aktuell keine offenen Aufgaben in Momo. F\xFCge zuerst ein paar Aufgaben hinzu!"
        ).withSimpleCard("Momo Quest", "Keine offenen Aufgaben vorhanden.").getResponse();
      }
      const topicInfo = quest.topic ? ` im Thema ${quest.topic.title}` : "";
      const coinInfo = quest.coinValue > 1 ? ` Daf\xFCr gibt es ${quest.coinValue} M\xFCnzen.` : "";
      const speech = `Deine heutige Quest ist: ${quest.title}${topicInfo}.${coinInfo} Viel Erfolg!`;
      const cardText = [
        `\u{1F4CB} ${quest.title}`,
        quest.topic ? `Thema: ${quest.topic.title}` : null,
        quest.estimatedMinutes ? `\u23F1 ${quest.estimatedMinutes} Minuten` : null,
        `\u{1FA99} ${quest.coinValue} M\xFCnze${quest.coinValue !== 1 ? "n" : ""}`
      ].filter(Boolean).join("\n");
      return input.responseBuilder.speak(speech).withSimpleCard("Deine Daily Quest", cardText).getResponse();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unbekannter Fehler";
      console.error("[GetQuestIntent] API error:", errorMessage);
      return input.responseBuilder.speak("Ich konnte deine Quest leider nicht abrufen. Bitte versuche es sp\xE4ter erneut.").getResponse();
    }
  }
};

// src/handlers/list-tasks.ts
var Alexa3 = __toESM(require_dist2());
var MAX_SPOKEN_TASKS = 5;
var ListTasksIntentHandler = {
  canHandle(input) {
    return input.requestEnvelope.request.type === "IntentRequest" && Alexa3.getIntentName(input.requestEnvelope) === "ListTasksIntent";
  },
  async handle(input) {
    const apiKey = input.requestEnvelope.context.System.user.accessToken;
    if (!apiKey) {
      return input.responseBuilder.speak("Bitte verkn\xFCpfe zuerst dein Momo-Konto in der Alexa-App.").withLinkAccountCard().getResponse();
    }
    try {
      const tasks = await getOpenTasks(apiKey);
      if (tasks.length === 0) {
        return input.responseBuilder.speak(
          "Du hast keine offenen Aufgaben. F\xFCge neue Aufgaben hinzu, indem du sagst: F\xFCge eine Aufgabe hinzu."
        ).withSimpleCard("Momo Aufgaben", "Keine offenen Aufgaben.").getResponse();
      }
      const spoken = tasks.slice(0, MAX_SPOKEN_TASKS);
      const remaining = tasks.length - spoken.length;
      const taskList = spoken.map((t, i) => `${i + 1}. ${t.title}`).join(", ");
      let speech;
      if (tasks.length === 1) {
        speech = `Du hast eine offene Aufgabe: ${spoken[0].title}.`;
      } else if (remaining === 0) {
        speech = `Du hast ${tasks.length} offene Aufgaben: ${taskList}.`;
      } else {
        speech = `Du hast ${tasks.length} offene Aufgaben. Die ersten ${spoken.length} sind: ${taskList}. Und ${remaining} weitere. \xD6ffne Momo f\xFCr die vollst\xE4ndige Liste.`;
      }
      const cardLines = tasks.slice(0, 10).map((t) => `\u2022 ${t.title}`).join("\n");
      const cardText = tasks.length > 10 ? `${cardLines}
\u2026 und ${tasks.length - 10} weitere` : cardLines;
      return input.responseBuilder.speak(speech).withSimpleCard(`Momo \u2013 ${tasks.length} offene Aufgaben`, cardText).getResponse();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unbekannter Fehler";
      console.error("[ListTasksIntent] API error:", errorMessage);
      return input.responseBuilder.speak("Ich konnte deine Aufgaben leider nicht abrufen. Bitte versuche es sp\xE4ter erneut.").getResponse();
    }
  }
};

// src/handlers/help.ts
var Alexa4 = __toESM(require_dist2());
var HelpIntentHandler = {
  canHandle(input) {
    return input.requestEnvelope.request.type === "IntentRequest" && Alexa4.getIntentName(input.requestEnvelope) === "AMAZON.HelpIntent";
  },
  handle(input) {
    const speech = 'Mit Momo kannst du Folgendes tun: Sage "Fuege Zahnarzt hinzu", um eine neue Aufgabe zu erstellen. Sage "Was ist meine Quest?", um deine heutige Aufgabe zu hoeren. Sage "Liste meine Aufgaben", um alle offenen Aufgaben zu hoeren. Was moechtest du tun?';
    const reprompt = "Sage zum Beispiel: Fuege eine Aufgabe hinzu.";
    const cardText = 'Befehle:\n* "Fuege [Aufgabe] hinzu"\n* "Was ist meine Quest?"\n* "Liste meine Aufgaben"\n* "Beenden"';
    return input.responseBuilder.speak(speech).reprompt(reprompt).withSimpleCard("Momo - Hilfe", cardText).getResponse();
  }
};

// src/handlers/cancel-stop.ts
var Alexa5 = __toESM(require_dist2());
var CancelAndStopIntentHandler = {
  canHandle(input) {
    if (input.requestEnvelope.request.type !== "IntentRequest") return false;
    const intent = Alexa5.getIntentName(input.requestEnvelope);
    return intent === "AMAZON.CancelIntent" || intent === "AMAZON.StopIntent";
  },
  handle(input) {
    return input.responseBuilder.speak("Bis bald! Viel Erfolg mit deinen Aufgaben.").withShouldEndSession(true).getResponse();
  }
};
var SessionEndedRequestHandler = {
  canHandle(input) {
    return input.requestEnvelope.request.type === "SessionEndedRequest";
  },
  handle(input) {
    console.info("[SessionEnded]", JSON.stringify(input.requestEnvelope.request));
    return input.responseBuilder.getResponse();
  }
};

// src/handlers/error.ts
var GlobalErrorHandler = {
  canHandle() {
    return true;
  },
  handle(input, error) {
    console.error("[GlobalErrorHandler]", error.name, error.message, error.stack);
    return input.responseBuilder.speak(
      "Es ist ein unerwarteter Fehler aufgetreten. Bitte versuche es sp\xE4ter erneut."
    ).withShouldEndSession(true).getResponse();
  }
};

// src/index.ts
var handler = Alexa6.SkillBuilders.custom().addRequestHandlers(
  LaunchRequestHandler,
  AddTaskIntentHandler,
  GetQuestIntentHandler,
  ListTasksIntentHandler,
  HelpIntentHandler,
  CancelAndStopIntentHandler,
  SessionEndedRequestHandler
).addErrorHandlers(GlobalErrorHandler).lambda();
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  handler
});
