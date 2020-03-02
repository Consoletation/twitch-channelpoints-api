(function ($$1) {
    'use strict';

    $$1 = $$1 && $$1.hasOwnProperty('default') ? $$1['default'] : $$1;

    const prefix = '[BetterPoints]';
    function log() {
      const args = Array.prototype.slice.call(arguments);
      args.unshift('%c' + prefix, 'background: #222; color: #bada55');
      console.log.apply(console, args);
    }

    const COMMAND_PRESETS = {
      SetCurrentScene: {
        functionName: 'SetCurrentScene',
        prettyName: 'Change to scene',
        actions: [{
          name: 'Scene Name',
          property: 'scene-name',
          propertySafe: 'sceneName',
          type: 'text'
        }]
      },
      Wait: {
        functionName: 'Wait',
        prettyName: 'Pause (ms)',
        actions: [{
          name: 'Time (ms)',
          property: 'timeInMs',
          propertySafe: 'timeInMs',
          type: 'number'
        }]
      },
      SetSourceVisibility: {
        functionName: 'SetSourceVisibility',
        prettyName: 'Set Source Visibility',
        actions: [{
          name: 'Source Name',
          property: 'item',
          type: 'text'
        }, {
          name: 'Visibility',
          property: 'visibility',
          type: 'checkbox',
          value: 'true'
        }]
      }
    };
    class Command {
      constructor(attributes) {
        this.functionName = attributes.functionName;
        const preset = COMMAND_PRESETS[this.functionName];
        this.config = {};
        this.prettyName = preset.prettyName;
        attributes.config.forEach(configElement => {
          this.config[configElement.name] = configElement.value;
        });
      }

    }

    const cooldowns = [];
    let settings = {};
    let redemptionEvents = {};
    const storage = window.localStorage;
    const REDEMPTIONS_KEY = 'redemptionEvents';
    const SETTINGS_KEY = 'redemptionSettings';
    const DEFAULT_SETTINGS = {
      address: 'localhost:4444',
      password: ''
    };
    const demoEvent = {
      redemptionName: 'Event: Take On Me',
      startScene: 'Game Capture',
      // if start scene is specified then the alert only plays when OBS is on that scene
      cooldownInSeconds: 600,
      hold: false,
      // do we return to the start scene?
      commands: [{
        functionName: 'SetCurrentScene',
        prettyName: 'Change to scene',
        config: {
          'scene-name': 'Game Capture (takeonme)'
        }
      }, {
        functionName: 'Wait',
        prettyName: 'Pause',
        config: {
          timeInMs: 1300
        }
      }]
    };
    const commands = {
      SetCurrentScene: config => {
        return settings.obs.client.send('SetCurrentScene', config);
      },
      Wait: config => {
        return delay(config.timeInMs);
      },
      SetSourceVisibility: config => {
        return settings.obs.client.send('SetSceneItemProperties', {
          visible: config.visibility
        });
      }
    };
    async function connect() {
      log$1('Channel Points Event Handler Loaded.');
      settings.obs = await loadSettings();
      redemptionEvents = await loadRedemptionEvents();
      displayRedemptions(redemptionEvents);
      return connectToOBS(settings.obs);
    }
    async function loadSettings() {
      var _JSON$parse;

      const storedSettings = (_JSON$parse = JSON.parse(storage.getItem(SETTINGS_KEY))) !== null && _JSON$parse !== void 0 ? _JSON$parse : DEFAULT_SETTINGS;
      console.log(`Loaded settings: `, storedSettings);
      displaySettings(storedSettings);
      return Promise.resolve(storedSettings);
    }
    async function saveSettings(newSettings) {
      disconnectFromOBS(settings.obs);
      settings.obs = { ...newSettings
      };
      storage.setItem(SETTINGS_KEY, JSON.stringify(settings.obs));

      try {
        await connectToOBS(settings.obs);
        log$1('Connected to OBS!');
      } catch (obsError) {
        const error = new Error(`There was a problem connecting to OBS: ${obsError.code} ${obsError.description}`);
        displayError(error);
      }
    }
    async function saveRedemptionEvent(redemption, override) {
      // not overriding existing settings so check if it exists
      if (!override) {
        if (redemptionEvents[redemption.redemptionName]) {
          return Promise.reject(new Error('Entry already exists, are you sure you want to replace it?'));
        }
      }

      redemptionEvents[redemption.redemptionName] = redemption;
      storage.setItem(REDEMPTIONS_KEY, JSON.stringify(redemptionEvents));
      displayRedemptions(redemptionEvents);
      return Promise.resolve(true);
    }
    async function loadRedemptionEvents() {
      var _JSON$parse2;

      const storedItems = (_JSON$parse2 = JSON.parse(storage.getItem(REDEMPTIONS_KEY))) !== null && _JSON$parse2 !== void 0 ? _JSON$parse2 : {};
      storedItems[demoEvent.redemptionName] = demoEvent;
      console.log(`Loaded redemptions: `, storedItems);
      return Promise.resolve(storedItems);
    }
    async function getRedemption(redemptionName) {
      return Promise.resolve(redemptionEvents[redemptionName]);
    }

    async function connectToOBS(obs) {
      log$1('OBS integration enabled. Attempting connection...');
      obs.client = new OBSWebSocket();
      return obs.client.connect(settings.obs);
    }

    async function disconnectFromOBS(obs) {
      obs.client.disconnect();
    } // used handle the redemption event, accepts jquery object


    async function executeRedemption(redemptionData) {
      try {
        // check if its on cooldown
        if (cooldowns.indexOf(redemptionData.rewardName) >= 0) {
          rejectRedemption(redemptionData);
          throw new Error(`Reward, ${redemptionData.rewardName} is on cooldown, rejecting`);
        } else {
          // immediately add to cooldown
          addToCooldown(redemptionData);
        }

        try {
          // execute the reward function
          await executeCommandChain(redemptionData);
          acceptRedemption(redemptionData);
        } catch (e) {
          log$1('rejecting: ' + e.message); // need to remove it from the cooldowns because it didn't actually run

          removeFromCooldown(redemptionData);
          rejectRedemption(redemptionData);
        }
      } catch (e) {
        // unexpected reward failure!
        console.error(e.message); // need to remove it from the cooldowns because it didn't actually run

        removeFromCooldown(redemptionData);
        rejectRedemption(redemptionData);
      }
    }

    function rejectRedemption(redemptionData) {
      log$1(`rejecting: ${redemptionData.rewardName}`); // click the reject button
    }

    function acceptRedemption(redemptionData) {
      log$1(`accepting: ${redemptionData.rewardName}`); // click the accept button
    }

    async function executeCommandChain(redemptionData) {
      const redemption = redemptionEvents[redemptionData.rewardName];
      const initialScene = await settings.obs.client.send('GetCurrentScene'); // check if the redemption exists

      if (!redemption) {
        throw new Error(`Received unhandled reward: ${redemptionData.rewardName}, ignoring`);
      } // does the user require a specific scene to be active to start


      if (redemption.startScene && initialScene.name !== redemption.startScene) {
        throw new Error(`Not on correct start scene, requires '${redemption.startScene}' but have '${initialScene.name}'`);
      } // execute all of the commands in series


      for (let index = 0, len = redemption.commands.length; index < len; index++) {
        const command = redemption.commands[index];
        await commands[command.functionName](command.config);
      } // do we return to the initial scene?


      if (!redemption.hold) {
        await settings.obs.client.send('SetCurrentScene', {
          'scene-name': initialScene.name
        });
      }

      console.log('finished execution chain');
      return true;
    }

    function addToCooldown(redemptionData) {
      const reward = redemptionEvents[redemptionData.rewardName];
      const name = redemptionData.rewardName;
      const cooldown = reward.cooldownInSeconds;
      cooldowns.push(name);
      setTimeout(() => {
        removeFromCooldown(redemptionData);
      }, cooldown * 1000);
      log$1('Added ', name + ' to cooldowns');
    }

    function removeFromCooldown(redemptionData) {
      const name = redemptionData.rewardName;
      const index = cooldowns.indexOf(name);

      if (index >= 0) {
        cooldowns.splice(index, 1);
        log$1('Removed ', name + ' from cooldowns');
      }
    }

    function log$1() {
      const prefix = '[ctPoints]';
      const args = Array.prototype.slice.call(arguments);
      args.unshift('%c' + prefix, 'background: #222; color: #bada55');
      console.log.apply(console, args);
    }

    function delay(t, v) {
      return new Promise(function (resolve) {
        setTimeout(resolve.bind(null, v), t);
      });
    }

    Promise.prototype.delay = function (t) {
      return this.then(function (v) {
        return delay(t, v);
      });
    };

    var commonjsGlobal = typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : typeof self !== 'undefined' ? self : {};

    function unwrapExports (x) {
    	return x && x.__esModule && Object.prototype.hasOwnProperty.call(x, 'default') ? x['default'] : x;
    }

    function createCommonjsModule(fn, module) {
    	return module = { exports: {} }, fn(module, module.exports), module.exports;
    }

    var utils = createCommonjsModule(function (module, exports) {

    exports.__esModule = true;
    exports.extend = extend;
    exports.indexOf = indexOf;
    exports.escapeExpression = escapeExpression;
    exports.isEmpty = isEmpty;
    exports.createFrame = createFrame;
    exports.blockParams = blockParams;
    exports.appendContextPath = appendContextPath;
    var escape = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#x27;',
      '`': '&#x60;',
      '=': '&#x3D;'
    };

    var badChars = /[&<>"'`=]/g,
        possible = /[&<>"'`=]/;

    function escapeChar(chr) {
      return escape[chr];
    }

    function extend(obj /* , ...source */) {
      for (var i = 1; i < arguments.length; i++) {
        for (var key in arguments[i]) {
          if (Object.prototype.hasOwnProperty.call(arguments[i], key)) {
            obj[key] = arguments[i][key];
          }
        }
      }

      return obj;
    }

    var toString = Object.prototype.toString;

    exports.toString = toString;
    // Sourced from lodash
    // https://github.com/bestiejs/lodash/blob/master/LICENSE.txt
    /* eslint-disable func-style */
    var isFunction = function isFunction(value) {
      return typeof value === 'function';
    };
    // fallback for older versions of Chrome and Safari
    /* istanbul ignore next */
    if (isFunction(/x/)) {
      exports.isFunction = isFunction = function (value) {
        return typeof value === 'function' && toString.call(value) === '[object Function]';
      };
    }
    exports.isFunction = isFunction;

    /* eslint-enable func-style */

    /* istanbul ignore next */
    var isArray = Array.isArray || function (value) {
      return value && typeof value === 'object' ? toString.call(value) === '[object Array]' : false;
    };

    exports.isArray = isArray;
    // Older IE versions do not directly support indexOf so we must implement our own, sadly.

    function indexOf(array, value) {
      for (var i = 0, len = array.length; i < len; i++) {
        if (array[i] === value) {
          return i;
        }
      }
      return -1;
    }

    function escapeExpression(string) {
      if (typeof string !== 'string') {
        // don't escape SafeStrings, since they're already safe
        if (string && string.toHTML) {
          return string.toHTML();
        } else if (string == null) {
          return '';
        } else if (!string) {
          return string + '';
        }

        // Force a string conversion as this will be done by the append regardless and
        // the regex test will do this transparently behind the scenes, causing issues if
        // an object's to string has escaped characters in it.
        string = '' + string;
      }

      if (!possible.test(string)) {
        return string;
      }
      return string.replace(badChars, escapeChar);
    }

    function isEmpty(value) {
      if (!value && value !== 0) {
        return true;
      } else if (isArray(value) && value.length === 0) {
        return true;
      } else {
        return false;
      }
    }

    function createFrame(object) {
      var frame = extend({}, object);
      frame._parent = object;
      return frame;
    }

    function blockParams(params, ids) {
      params.path = ids;
      return params;
    }

    function appendContextPath(contextPath, id) {
      return (contextPath ? contextPath + '.' : '') + id;
    }

    });

    unwrapExports(utils);
    var utils_1 = utils.extend;
    var utils_2 = utils.indexOf;
    var utils_3 = utils.escapeExpression;
    var utils_4 = utils.isEmpty;
    var utils_5 = utils.createFrame;
    var utils_6 = utils.blockParams;
    var utils_7 = utils.appendContextPath;
    var utils_8 = utils.isFunction;
    var utils_9 = utils.isArray;

    var exception = createCommonjsModule(function (module, exports) {

    exports.__esModule = true;
    var errorProps = ['description', 'fileName', 'lineNumber', 'endLineNumber', 'message', 'name', 'number', 'stack'];

    function Exception(message, node) {
      var loc = node && node.loc,
          line = undefined,
          endLineNumber = undefined,
          column = undefined,
          endColumn = undefined;

      if (loc) {
        line = loc.start.line;
        endLineNumber = loc.end.line;
        column = loc.start.column;
        endColumn = loc.end.column;

        message += ' - ' + line + ':' + column;
      }

      var tmp = Error.prototype.constructor.call(this, message);

      // Unfortunately errors are not enumerable in Chrome (at least), so `for prop in tmp` doesn't work.
      for (var idx = 0; idx < errorProps.length; idx++) {
        this[errorProps[idx]] = tmp[errorProps[idx]];
      }

      /* istanbul ignore else */
      if (Error.captureStackTrace) {
        Error.captureStackTrace(this, Exception);
      }

      try {
        if (loc) {
          this.lineNumber = line;
          this.endLineNumber = endLineNumber;

          // Work around issue under safari where we can't directly set the column value
          /* istanbul ignore next */
          if (Object.defineProperty) {
            Object.defineProperty(this, 'column', {
              value: column,
              enumerable: true
            });
            Object.defineProperty(this, 'endColumn', {
              value: endColumn,
              enumerable: true
            });
          } else {
            this.column = column;
            this.endColumn = endColumn;
          }
        }
      } catch (nop) {
        /* Ignore if the browser is very particular */
      }
    }

    Exception.prototype = new Error();

    exports['default'] = Exception;
    module.exports = exports['default'];

    });

    unwrapExports(exception);

    var blockHelperMissing = createCommonjsModule(function (module, exports) {

    exports.__esModule = true;



    exports['default'] = function (instance) {
      instance.registerHelper('blockHelperMissing', function (context, options) {
        var inverse = options.inverse,
            fn = options.fn;

        if (context === true) {
          return fn(this);
        } else if (context === false || context == null) {
          return inverse(this);
        } else if (utils.isArray(context)) {
          if (context.length > 0) {
            if (options.ids) {
              options.ids = [options.name];
            }

            return instance.helpers.each(context, options);
          } else {
            return inverse(this);
          }
        } else {
          if (options.data && options.ids) {
            var data = utils.createFrame(options.data);
            data.contextPath = utils.appendContextPath(options.data.contextPath, options.name);
            options = { data: data };
          }

          return fn(context, options);
        }
      });
    };

    module.exports = exports['default'];

    });

    unwrapExports(blockHelperMissing);

    var each = createCommonjsModule(function (module, exports) {

    exports.__esModule = true;
    // istanbul ignore next

    function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }





    var _exception2 = _interopRequireDefault(exception);

    exports['default'] = function (instance) {
      instance.registerHelper('each', function (context, options) {
        if (!options) {
          throw new _exception2['default']('Must pass iterator to #each');
        }

        var fn = options.fn,
            inverse = options.inverse,
            i = 0,
            ret = '',
            data = undefined,
            contextPath = undefined;

        if (options.data && options.ids) {
          contextPath = utils.appendContextPath(options.data.contextPath, options.ids[0]) + '.';
        }

        if (utils.isFunction(context)) {
          context = context.call(this);
        }

        if (options.data) {
          data = utils.createFrame(options.data);
        }

        function execIteration(field, index, last) {
          if (data) {
            data.key = field;
            data.index = index;
            data.first = index === 0;
            data.last = !!last;

            if (contextPath) {
              data.contextPath = contextPath + field;
            }
          }

          ret = ret + fn(context[field], {
            data: data,
            blockParams: utils.blockParams([context[field], field], [contextPath + field, null])
          });
        }

        if (context && typeof context === 'object') {
          if (utils.isArray(context)) {
            for (var j = context.length; i < j; i++) {
              if (i in context) {
                execIteration(i, i, i === context.length - 1);
              }
            }
          } else if (commonjsGlobal.Symbol && context[commonjsGlobal.Symbol.iterator]) {
            var newContext = [];
            var iterator = context[commonjsGlobal.Symbol.iterator]();
            for (var it = iterator.next(); !it.done; it = iterator.next()) {
              newContext.push(it.value);
            }
            context = newContext;
            for (var j = context.length; i < j; i++) {
              execIteration(i, i, i === context.length - 1);
            }
          } else {
            (function () {
              var priorKey = undefined;

              Object.keys(context).forEach(function (key) {
                // We're running the iterations one step out of sync so we can detect
                // the last iteration without have to scan the object twice and create
                // an itermediate keys array.
                if (priorKey !== undefined) {
                  execIteration(priorKey, i - 1);
                }
                priorKey = key;
                i++;
              });
              if (priorKey !== undefined) {
                execIteration(priorKey, i - 1, true);
              }
            })();
          }
        }

        if (i === 0) {
          ret = inverse(this);
        }

        return ret;
      });
    };

    module.exports = exports['default'];

    });

    unwrapExports(each);

    var helperMissing = createCommonjsModule(function (module, exports) {

    exports.__esModule = true;
    // istanbul ignore next

    function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }



    var _exception2 = _interopRequireDefault(exception);

    exports['default'] = function (instance) {
      instance.registerHelper('helperMissing', function () /* [args, ]options */{
        if (arguments.length === 1) {
          // A missing field in a {{foo}} construct.
          return undefined;
        } else {
          // Someone is actually trying to call something, blow up.
          throw new _exception2['default']('Missing helper: "' + arguments[arguments.length - 1].name + '"');
        }
      });
    };

    module.exports = exports['default'];

    });

    unwrapExports(helperMissing);

    var _if = createCommonjsModule(function (module, exports) {

    exports.__esModule = true;
    // istanbul ignore next

    function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }





    var _exception2 = _interopRequireDefault(exception);

    exports['default'] = function (instance) {
      instance.registerHelper('if', function (conditional, options) {
        if (arguments.length != 2) {
          throw new _exception2['default']('#if requires exactly one argument');
        }
        if (utils.isFunction(conditional)) {
          conditional = conditional.call(this);
        }

        // Default behavior is to render the positive path if the value is truthy and not empty.
        // The `includeZero` option may be set to treat the condtional as purely not empty based on the
        // behavior of isEmpty. Effectively this determines if 0 is handled by the positive path or negative.
        if (!options.hash.includeZero && !conditional || utils.isEmpty(conditional)) {
          return options.inverse(this);
        } else {
          return options.fn(this);
        }
      });

      instance.registerHelper('unless', function (conditional, options) {
        if (arguments.length != 2) {
          throw new _exception2['default']('#unless requires exactly one argument');
        }
        return instance.helpers['if'].call(this, conditional, {
          fn: options.inverse,
          inverse: options.fn,
          hash: options.hash
        });
      });
    };

    module.exports = exports['default'];

    });

    unwrapExports(_if);

    var log$2 = createCommonjsModule(function (module, exports) {

    exports.__esModule = true;

    exports['default'] = function (instance) {
      instance.registerHelper('log', function () /* message, options */{
        var args = [undefined],
            options = arguments[arguments.length - 1];
        for (var i = 0; i < arguments.length - 1; i++) {
          args.push(arguments[i]);
        }

        var level = 1;
        if (options.hash.level != null) {
          level = options.hash.level;
        } else if (options.data && options.data.level != null) {
          level = options.data.level;
        }
        args[0] = level;

        instance.log.apply(instance, args);
      });
    };

    module.exports = exports['default'];

    });

    unwrapExports(log$2);

    var lookup = createCommonjsModule(function (module, exports) {

    exports.__esModule = true;

    exports['default'] = function (instance) {
      instance.registerHelper('lookup', function (obj, field, options) {
        if (!obj) {
          // Note for 5.0: Change to "obj == null" in 5.0
          return obj;
        }
        return options.lookupProperty(obj, field);
      });
    };

    module.exports = exports['default'];

    });

    unwrapExports(lookup);

    var _with = createCommonjsModule(function (module, exports) {

    exports.__esModule = true;
    // istanbul ignore next

    function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }





    var _exception2 = _interopRequireDefault(exception);

    exports['default'] = function (instance) {
      instance.registerHelper('with', function (context, options) {
        if (arguments.length != 2) {
          throw new _exception2['default']('#with requires exactly one argument');
        }
        if (utils.isFunction(context)) {
          context = context.call(this);
        }

        var fn = options.fn;

        if (!utils.isEmpty(context)) {
          var data = options.data;
          if (options.data && options.ids) {
            data = utils.createFrame(options.data);
            data.contextPath = utils.appendContextPath(options.data.contextPath, options.ids[0]);
          }

          return fn(context, {
            data: data,
            blockParams: utils.blockParams([context], [data && data.contextPath])
          });
        } else {
          return options.inverse(this);
        }
      });
    };

    module.exports = exports['default'];

    });

    unwrapExports(_with);

    var helpers = createCommonjsModule(function (module, exports) {

    exports.__esModule = true;
    exports.registerDefaultHelpers = registerDefaultHelpers;
    exports.moveHelperToHooks = moveHelperToHooks;
    // istanbul ignore next

    function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }



    var _helpersBlockHelperMissing2 = _interopRequireDefault(blockHelperMissing);



    var _helpersEach2 = _interopRequireDefault(each);



    var _helpersHelperMissing2 = _interopRequireDefault(helperMissing);



    var _helpersIf2 = _interopRequireDefault(_if);



    var _helpersLog2 = _interopRequireDefault(log$2);



    var _helpersLookup2 = _interopRequireDefault(lookup);



    var _helpersWith2 = _interopRequireDefault(_with);

    function registerDefaultHelpers(instance) {
      _helpersBlockHelperMissing2['default'](instance);
      _helpersEach2['default'](instance);
      _helpersHelperMissing2['default'](instance);
      _helpersIf2['default'](instance);
      _helpersLog2['default'](instance);
      _helpersLookup2['default'](instance);
      _helpersWith2['default'](instance);
    }

    function moveHelperToHooks(instance, helperName, keepHelper) {
      if (instance.helpers[helperName]) {
        instance.hooks[helperName] = instance.helpers[helperName];
        if (!keepHelper) {
          delete instance.helpers[helperName];
        }
      }
    }

    });

    unwrapExports(helpers);
    var helpers_1 = helpers.registerDefaultHelpers;
    var helpers_2 = helpers.moveHelperToHooks;

    var inline = createCommonjsModule(function (module, exports) {

    exports.__esModule = true;



    exports['default'] = function (instance) {
      instance.registerDecorator('inline', function (fn, props, container, options) {
        var ret = fn;
        if (!props.partials) {
          props.partials = {};
          ret = function (context, options) {
            // Create a new partials stack frame prior to exec.
            var original = container.partials;
            container.partials = utils.extend({}, original, props.partials);
            var ret = fn(context, options);
            container.partials = original;
            return ret;
          };
        }

        props.partials[options.args[0]] = options.fn;

        return ret;
      });
    };

    module.exports = exports['default'];

    });

    unwrapExports(inline);

    var decorators = createCommonjsModule(function (module, exports) {

    exports.__esModule = true;
    exports.registerDefaultDecorators = registerDefaultDecorators;
    // istanbul ignore next

    function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }



    var _decoratorsInline2 = _interopRequireDefault(inline);

    function registerDefaultDecorators(instance) {
      _decoratorsInline2['default'](instance);
    }

    });

    unwrapExports(decorators);
    var decorators_1 = decorators.registerDefaultDecorators;

    var logger_1 = createCommonjsModule(function (module, exports) {

    exports.__esModule = true;



    var logger = {
      methodMap: ['debug', 'info', 'warn', 'error'],
      level: 'info',

      // Maps a given level value to the `methodMap` indexes above.
      lookupLevel: function lookupLevel(level) {
        if (typeof level === 'string') {
          var levelMap = utils.indexOf(logger.methodMap, level.toLowerCase());
          if (levelMap >= 0) {
            level = levelMap;
          } else {
            level = parseInt(level, 10);
          }
        }

        return level;
      },

      // Can be overridden in the host environment
      log: function log(level) {
        level = logger.lookupLevel(level);

        if (typeof console !== 'undefined' && logger.lookupLevel(logger.level) <= level) {
          var method = logger.methodMap[level];
          // eslint-disable-next-line no-console
          if (!console[method]) {
            method = 'log';
          }

          for (var _len = arguments.length, message = Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
            message[_key - 1] = arguments[_key];
          }

          console[method].apply(console, message); // eslint-disable-line no-console
        }
      }
    };

    exports['default'] = logger;
    module.exports = exports['default'];

    });

    unwrapExports(logger_1);

    var createNewLookupObject_1 = createCommonjsModule(function (module, exports) {

    exports.__esModule = true;
    exports.createNewLookupObject = createNewLookupObject;



    /**
     * Create a new object with "null"-prototype to avoid truthy results on prototype properties.
     * The resulting object can be used with "object[property]" to check if a property exists
     * @param {...object} sources a varargs parameter of source objects that will be merged
     * @returns {object}
     */

    function createNewLookupObject() {
      for (var _len = arguments.length, sources = Array(_len), _key = 0; _key < _len; _key++) {
        sources[_key] = arguments[_key];
      }

      return utils.extend.apply(undefined, [Object.create(null)].concat(sources));
    }

    });

    unwrapExports(createNewLookupObject_1);
    var createNewLookupObject_2 = createNewLookupObject_1.createNewLookupObject;

    var protoAccess = createCommonjsModule(function (module, exports) {

    exports.__esModule = true;
    exports.createProtoAccessControl = createProtoAccessControl;
    exports.resultIsAllowed = resultIsAllowed;
    exports.resetLoggedProperties = resetLoggedProperties;
    // istanbul ignore next

    function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj['default'] = obj; return newObj; } }





    var logger = _interopRequireWildcard(logger_1);

    var loggedProperties = Object.create(null);

    function createProtoAccessControl(runtimeOptions) {
      var defaultMethodWhiteList = Object.create(null);
      defaultMethodWhiteList['constructor'] = false;
      defaultMethodWhiteList['__defineGetter__'] = false;
      defaultMethodWhiteList['__defineSetter__'] = false;
      defaultMethodWhiteList['__lookupGetter__'] = false;

      var defaultPropertyWhiteList = Object.create(null);
      // eslint-disable-next-line no-proto
      defaultPropertyWhiteList['__proto__'] = false;

      return {
        properties: {
          whitelist: createNewLookupObject_1.createNewLookupObject(defaultPropertyWhiteList, runtimeOptions.allowedProtoProperties),
          defaultValue: runtimeOptions.allowProtoPropertiesByDefault
        },
        methods: {
          whitelist: createNewLookupObject_1.createNewLookupObject(defaultMethodWhiteList, runtimeOptions.allowedProtoMethods),
          defaultValue: runtimeOptions.allowProtoMethodsByDefault
        }
      };
    }

    function resultIsAllowed(result, protoAccessControl, propertyName) {
      if (typeof result === 'function') {
        return checkWhiteList(protoAccessControl.methods, propertyName);
      } else {
        return checkWhiteList(protoAccessControl.properties, propertyName);
      }
    }

    function checkWhiteList(protoAccessControlForType, propertyName) {
      if (protoAccessControlForType.whitelist[propertyName] !== undefined) {
        return protoAccessControlForType.whitelist[propertyName] === true;
      }
      if (protoAccessControlForType.defaultValue !== undefined) {
        return protoAccessControlForType.defaultValue;
      }
      logUnexpecedPropertyAccessOnce(propertyName);
      return false;
    }

    function logUnexpecedPropertyAccessOnce(propertyName) {
      if (loggedProperties[propertyName] !== true) {
        loggedProperties[propertyName] = true;
        logger.log('error', 'Handlebars: Access has been denied to resolve the property "' + propertyName + '" because it is not an "own property" of its parent.\n' + 'You can add a runtime option to disable the check or this warning:\n' + 'See https://handlebarsjs.com/api-reference/runtime-options.html#options-to-control-prototype-access for details');
      }
    }

    function resetLoggedProperties() {
      Object.keys(loggedProperties).forEach(function (propertyName) {
        delete loggedProperties[propertyName];
      });
    }

    });

    unwrapExports(protoAccess);
    var protoAccess_1 = protoAccess.createProtoAccessControl;
    var protoAccess_2 = protoAccess.resultIsAllowed;
    var protoAccess_3 = protoAccess.resetLoggedProperties;

    var base = createCommonjsModule(function (module, exports) {

    exports.__esModule = true;
    exports.HandlebarsEnvironment = HandlebarsEnvironment;
    // istanbul ignore next

    function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }





    var _exception2 = _interopRequireDefault(exception);







    var _logger2 = _interopRequireDefault(logger_1);



    var VERSION = '4.7.3';
    exports.VERSION = VERSION;
    var COMPILER_REVISION = 8;
    exports.COMPILER_REVISION = COMPILER_REVISION;
    var LAST_COMPATIBLE_COMPILER_REVISION = 7;

    exports.LAST_COMPATIBLE_COMPILER_REVISION = LAST_COMPATIBLE_COMPILER_REVISION;
    var REVISION_CHANGES = {
      1: '<= 1.0.rc.2', // 1.0.rc.2 is actually rev2 but doesn't report it
      2: '== 1.0.0-rc.3',
      3: '== 1.0.0-rc.4',
      4: '== 1.x.x',
      5: '== 2.0.0-alpha.x',
      6: '>= 2.0.0-beta.1',
      7: '>= 4.0.0 <4.3.0',
      8: '>= 4.3.0'
    };

    exports.REVISION_CHANGES = REVISION_CHANGES;
    var objectType = '[object Object]';

    function HandlebarsEnvironment(helpers$1, partials, decorators$1) {
      this.helpers = helpers$1 || {};
      this.partials = partials || {};
      this.decorators = decorators$1 || {};

      helpers.registerDefaultHelpers(this);
      decorators.registerDefaultDecorators(this);
    }

    HandlebarsEnvironment.prototype = {
      constructor: HandlebarsEnvironment,

      logger: _logger2['default'],
      log: _logger2['default'].log,

      registerHelper: function registerHelper(name, fn) {
        if (utils.toString.call(name) === objectType) {
          if (fn) {
            throw new _exception2['default']('Arg not supported with multiple helpers');
          }
          utils.extend(this.helpers, name);
        } else {
          this.helpers[name] = fn;
        }
      },
      unregisterHelper: function unregisterHelper(name) {
        delete this.helpers[name];
      },

      registerPartial: function registerPartial(name, partial) {
        if (utils.toString.call(name) === objectType) {
          utils.extend(this.partials, name);
        } else {
          if (typeof partial === 'undefined') {
            throw new _exception2['default']('Attempting to register a partial called "' + name + '" as undefined');
          }
          this.partials[name] = partial;
        }
      },
      unregisterPartial: function unregisterPartial(name) {
        delete this.partials[name];
      },

      registerDecorator: function registerDecorator(name, fn) {
        if (utils.toString.call(name) === objectType) {
          if (fn) {
            throw new _exception2['default']('Arg not supported with multiple decorators');
          }
          utils.extend(this.decorators, name);
        } else {
          this.decorators[name] = fn;
        }
      },
      unregisterDecorator: function unregisterDecorator(name) {
        delete this.decorators[name];
      },
      /**
       * Reset the memory of illegal property accesses that have already been logged.
       * @deprecated should only be used in handlebars test-cases
       */
      resetLoggedPropertyAccesses: function resetLoggedPropertyAccesses() {
        protoAccess.resetLoggedProperties();
      }
    };

    var log = _logger2['default'].log;

    exports.log = log;
    exports.createFrame = utils.createFrame;
    exports.logger = _logger2['default'];

    });

    unwrapExports(base);
    var base_1 = base.HandlebarsEnvironment;
    var base_2 = base.VERSION;
    var base_3 = base.COMPILER_REVISION;
    var base_4 = base.LAST_COMPATIBLE_COMPILER_REVISION;
    var base_5 = base.REVISION_CHANGES;
    var base_6 = base.log;
    var base_7 = base.createFrame;
    var base_8 = base.logger;

    var safeString = createCommonjsModule(function (module, exports) {

    exports.__esModule = true;
    function SafeString(string) {
      this.string = string;
    }

    SafeString.prototype.toString = SafeString.prototype.toHTML = function () {
      return '' + this.string;
    };

    exports['default'] = SafeString;
    module.exports = exports['default'];

    });

    unwrapExports(safeString);

    var wrapHelper_1 = createCommonjsModule(function (module, exports) {

    exports.__esModule = true;
    exports.wrapHelper = wrapHelper;

    function wrapHelper(helper, transformOptionsFn) {
      if (typeof helper !== 'function') {
        // This should not happen, but apparently it does in https://github.com/wycats/handlebars.js/issues/1639
        // We try to make the wrapper least-invasive by not wrapping it, if the helper is not a function.
        return helper;
      }
      var wrapper = function wrapper() /* dynamic arguments */{
        var options = arguments[arguments.length - 1];
        arguments[arguments.length - 1] = transformOptionsFn(options);
        return helper.apply(this, arguments);
      };
      return wrapper;
    }

    });

    unwrapExports(wrapHelper_1);
    var wrapHelper_2 = wrapHelper_1.wrapHelper;

    var runtime = createCommonjsModule(function (module, exports) {

    exports.__esModule = true;
    exports.checkRevision = checkRevision;
    exports.template = template;
    exports.wrapProgram = wrapProgram;
    exports.resolvePartial = resolvePartial;
    exports.invokePartial = invokePartial;
    exports.noop = noop;
    // istanbul ignore next

    function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

    // istanbul ignore next

    function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj['default'] = obj; return newObj; } }



    var Utils = _interopRequireWildcard(utils);



    var _exception2 = _interopRequireDefault(exception);









    function checkRevision(compilerInfo) {
      var compilerRevision = compilerInfo && compilerInfo[0] || 1,
          currentRevision = base.COMPILER_REVISION;

      if (compilerRevision >= base.LAST_COMPATIBLE_COMPILER_REVISION && compilerRevision <= base.COMPILER_REVISION) {
        return;
      }

      if (compilerRevision < base.LAST_COMPATIBLE_COMPILER_REVISION) {
        var runtimeVersions = base.REVISION_CHANGES[currentRevision],
            compilerVersions = base.REVISION_CHANGES[compilerRevision];
        throw new _exception2['default']('Template was precompiled with an older version of Handlebars than the current runtime. ' + 'Please update your precompiler to a newer version (' + runtimeVersions + ') or downgrade your runtime to an older version (' + compilerVersions + ').');
      } else {
        // Use the embedded version info since the runtime doesn't know about this revision yet
        throw new _exception2['default']('Template was precompiled with a newer version of Handlebars than the current runtime. ' + 'Please update your runtime to a newer version (' + compilerInfo[1] + ').');
      }
    }

    function template(templateSpec, env) {
      /* istanbul ignore next */
      if (!env) {
        throw new _exception2['default']('No environment passed to template');
      }
      if (!templateSpec || !templateSpec.main) {
        throw new _exception2['default']('Unknown template object: ' + typeof templateSpec);
      }

      templateSpec.main.decorator = templateSpec.main_d;

      // Note: Using env.VM references rather than local var references throughout this section to allow
      // for external users to override these as pseudo-supported APIs.
      env.VM.checkRevision(templateSpec.compiler);

      // backwards compatibility for precompiled templates with compiler-version 7 (<4.3.0)
      var templateWasPrecompiledWithCompilerV7 = templateSpec.compiler && templateSpec.compiler[0] === 7;

      function invokePartialWrapper(partial, context, options) {
        if (options.hash) {
          context = Utils.extend({}, context, options.hash);
          if (options.ids) {
            options.ids[0] = true;
          }
        }
        partial = env.VM.resolvePartial.call(this, partial, context, options);

        var extendedOptions = Utils.extend({}, options, {
          hooks: this.hooks,
          protoAccessControl: this.protoAccessControl
        });

        var result = env.VM.invokePartial.call(this, partial, context, extendedOptions);

        if (result == null && env.compile) {
          options.partials[options.name] = env.compile(partial, templateSpec.compilerOptions, env);
          result = options.partials[options.name](context, extendedOptions);
        }
        if (result != null) {
          if (options.indent) {
            var lines = result.split('\n');
            for (var i = 0, l = lines.length; i < l; i++) {
              if (!lines[i] && i + 1 === l) {
                break;
              }

              lines[i] = options.indent + lines[i];
            }
            result = lines.join('\n');
          }
          return result;
        } else {
          throw new _exception2['default']('The partial ' + options.name + ' could not be compiled when running in runtime-only mode');
        }
      }

      // Just add water
      var container = {
        strict: function strict(obj, name, loc) {
          if (!obj || !(name in obj)) {
            throw new _exception2['default']('"' + name + '" not defined in ' + obj, {
              loc: loc
            });
          }
          return obj[name];
        },
        lookupProperty: function lookupProperty(parent, propertyName) {
          var result = parent[propertyName];
          if (result == null) {
            return result;
          }
          if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
            return result;
          }

          if (protoAccess.resultIsAllowed(result, container.protoAccessControl, propertyName)) {
            return result;
          }
          return undefined;
        },
        lookup: function lookup(depths, name) {
          var len = depths.length;
          for (var i = 0; i < len; i++) {
            var result = depths[i] && container.lookupProperty(depths[i], name);
            if (result != null) {
              return depths[i][name];
            }
          }
        },
        lambda: function lambda(current, context) {
          return typeof current === 'function' ? current.call(context) : current;
        },

        escapeExpression: Utils.escapeExpression,
        invokePartial: invokePartialWrapper,

        fn: function fn(i) {
          var ret = templateSpec[i];
          ret.decorator = templateSpec[i + '_d'];
          return ret;
        },

        programs: [],
        program: function program(i, data, declaredBlockParams, blockParams, depths) {
          var programWrapper = this.programs[i],
              fn = this.fn(i);
          if (data || depths || blockParams || declaredBlockParams) {
            programWrapper = wrapProgram(this, i, fn, data, declaredBlockParams, blockParams, depths);
          } else if (!programWrapper) {
            programWrapper = this.programs[i] = wrapProgram(this, i, fn);
          }
          return programWrapper;
        },

        data: function data(value, depth) {
          while (value && depth--) {
            value = value._parent;
          }
          return value;
        },
        mergeIfNeeded: function mergeIfNeeded(param, common) {
          var obj = param || common;

          if (param && common && param !== common) {
            obj = Utils.extend({}, common, param);
          }

          return obj;
        },
        // An empty object to use as replacement for null-contexts
        nullContext: Object.seal({}),

        noop: env.VM.noop,
        compilerInfo: templateSpec.compiler
      };

      function ret(context) {
        var options = arguments.length <= 1 || arguments[1] === undefined ? {} : arguments[1];

        var data = options.data;

        ret._setup(options);
        if (!options.partial && templateSpec.useData) {
          data = initData(context, data);
        }
        var depths = undefined,
            blockParams = templateSpec.useBlockParams ? [] : undefined;
        if (templateSpec.useDepths) {
          if (options.depths) {
            depths = context != options.depths[0] ? [context].concat(options.depths) : options.depths;
          } else {
            depths = [context];
          }
        }

        function main(context /*, options*/) {
          return '' + templateSpec.main(container, context, container.helpers, container.partials, data, blockParams, depths);
        }

        main = executeDecorators(templateSpec.main, main, container, options.depths || [], data, blockParams);
        return main(context, options);
      }

      ret.isTop = true;

      ret._setup = function (options) {
        if (!options.partial) {
          var mergedHelpers = Utils.extend({}, env.helpers, options.helpers);
          wrapHelpersToPassLookupProperty(mergedHelpers, container);
          container.helpers = mergedHelpers;

          if (templateSpec.usePartial) {
            // Use mergeIfNeeded here to prevent compiling global partials multiple times
            container.partials = container.mergeIfNeeded(options.partials, env.partials);
          }
          if (templateSpec.usePartial || templateSpec.useDecorators) {
            container.decorators = Utils.extend({}, env.decorators, options.decorators);
          }

          container.hooks = {};
          container.protoAccessControl = protoAccess.createProtoAccessControl(options);

          var keepHelperInHelpers = options.allowCallsToHelperMissing || templateWasPrecompiledWithCompilerV7;
          helpers.moveHelperToHooks(container, 'helperMissing', keepHelperInHelpers);
          helpers.moveHelperToHooks(container, 'blockHelperMissing', keepHelperInHelpers);
        } else {
          container.protoAccessControl = options.protoAccessControl; // internal option
          container.helpers = options.helpers;
          container.partials = options.partials;
          container.decorators = options.decorators;
          container.hooks = options.hooks;
        }
      };

      ret._child = function (i, data, blockParams, depths) {
        if (templateSpec.useBlockParams && !blockParams) {
          throw new _exception2['default']('must pass block params');
        }
        if (templateSpec.useDepths && !depths) {
          throw new _exception2['default']('must pass parent depths');
        }

        return wrapProgram(container, i, templateSpec[i], data, 0, blockParams, depths);
      };
      return ret;
    }

    function wrapProgram(container, i, fn, data, declaredBlockParams, blockParams, depths) {
      function prog(context) {
        var options = arguments.length <= 1 || arguments[1] === undefined ? {} : arguments[1];

        var currentDepths = depths;
        if (depths && context != depths[0] && !(context === container.nullContext && depths[0] === null)) {
          currentDepths = [context].concat(depths);
        }

        return fn(container, context, container.helpers, container.partials, options.data || data, blockParams && [options.blockParams].concat(blockParams), currentDepths);
      }

      prog = executeDecorators(fn, prog, container, depths, data, blockParams);

      prog.program = i;
      prog.depth = depths ? depths.length : 0;
      prog.blockParams = declaredBlockParams || 0;
      return prog;
    }

    /**
     * This is currently part of the official API, therefore implementation details should not be changed.
     */

    function resolvePartial(partial, context, options) {
      if (!partial) {
        if (options.name === '@partial-block') {
          partial = options.data['partial-block'];
        } else {
          partial = options.partials[options.name];
        }
      } else if (!partial.call && !options.name) {
        // This is a dynamic partial that returned a string
        options.name = partial;
        partial = options.partials[partial];
      }
      return partial;
    }

    function invokePartial(partial, context, options) {
      // Use the current closure context to save the partial-block if this partial
      var currentPartialBlock = options.data && options.data['partial-block'];
      options.partial = true;
      if (options.ids) {
        options.data.contextPath = options.ids[0] || options.data.contextPath;
      }

      var partialBlock = undefined;
      if (options.fn && options.fn !== noop) {
        (function () {
          options.data = base.createFrame(options.data);
          // Wrapper function to get access to currentPartialBlock from the closure
          var fn = options.fn;
          partialBlock = options.data['partial-block'] = function partialBlockWrapper(context) {
            var options = arguments.length <= 1 || arguments[1] === undefined ? {} : arguments[1];

            // Restore the partial-block from the closure for the execution of the block
            // i.e. the part inside the block of the partial call.
            options.data = base.createFrame(options.data);
            options.data['partial-block'] = currentPartialBlock;
            return fn(context, options);
          };
          if (fn.partials) {
            options.partials = Utils.extend({}, options.partials, fn.partials);
          }
        })();
      }

      if (partial === undefined && partialBlock) {
        partial = partialBlock;
      }

      if (partial === undefined) {
        throw new _exception2['default']('The partial ' + options.name + ' could not be found');
      } else if (partial instanceof Function) {
        return partial(context, options);
      }
    }

    function noop() {
      return '';
    }

    function initData(context, data) {
      if (!data || !('root' in data)) {
        data = data ? base.createFrame(data) : {};
        data.root = context;
      }
      return data;
    }

    function executeDecorators(fn, prog, container, depths, data, blockParams) {
      if (fn.decorator) {
        var props = {};
        prog = fn.decorator(prog, props, container, depths && depths[0], data, blockParams, depths);
        Utils.extend(prog, props);
      }
      return prog;
    }

    function wrapHelpersToPassLookupProperty(mergedHelpers, container) {
      Object.keys(mergedHelpers).forEach(function (helperName) {
        var helper = mergedHelpers[helperName];
        mergedHelpers[helperName] = passLookupPropertyOption(helper, container);
      });
    }

    function passLookupPropertyOption(helper, container) {
      var lookupProperty = container.lookupProperty;
      return wrapHelper_1.wrapHelper(helper, function (options) {
        return Utils.extend({ lookupProperty: lookupProperty }, options);
      });
    }

    });

    unwrapExports(runtime);
    var runtime_1 = runtime.checkRevision;
    var runtime_2 = runtime.template;
    var runtime_3 = runtime.wrapProgram;
    var runtime_4 = runtime.resolvePartial;
    var runtime_5 = runtime.invokePartial;
    var runtime_6 = runtime.noop;

    var noConflict = createCommonjsModule(function (module, exports) {

    exports.__esModule = true;

    exports['default'] = function (Handlebars) {
      /* istanbul ignore next */
      var root = typeof commonjsGlobal !== 'undefined' ? commonjsGlobal : window,
          $Handlebars = root.Handlebars;
      /* istanbul ignore next */
      Handlebars.noConflict = function () {
        if (root.Handlebars === Handlebars) {
          root.Handlebars = $Handlebars;
        }
        return Handlebars;
      };
    };

    module.exports = exports['default'];

    });

    unwrapExports(noConflict);

    var handlebars_runtime = createCommonjsModule(function (module, exports) {

    exports.__esModule = true;
    // istanbul ignore next

    function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

    // istanbul ignore next

    function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj['default'] = obj; return newObj; } }



    var base$1 = _interopRequireWildcard(base);

    // Each of these augment the Handlebars object. No need to setup here.
    // (This is done to easily share code between commonjs and browse envs)



    var _handlebarsSafeString2 = _interopRequireDefault(safeString);



    var _handlebarsException2 = _interopRequireDefault(exception);



    var Utils = _interopRequireWildcard(utils);



    var runtime$1 = _interopRequireWildcard(runtime);



    var _handlebarsNoConflict2 = _interopRequireDefault(noConflict);

    // For compatibility and usage outside of module systems, make the Handlebars object a namespace
    function create() {
      var hb = new base$1.HandlebarsEnvironment();

      Utils.extend(hb, base$1);
      hb.SafeString = _handlebarsSafeString2['default'];
      hb.Exception = _handlebarsException2['default'];
      hb.Utils = Utils;
      hb.escapeExpression = Utils.escapeExpression;

      hb.VM = runtime$1;
      hb.template = function (spec) {
        return runtime$1.template(spec, hb);
      };

      return hb;
    }

    var inst = create();
    inst.create = create;

    _handlebarsNoConflict2['default'](inst);

    inst['default'] = inst;

    exports['default'] = inst;
    module.exports = exports['default'];

    });

    var Handlebars = unwrapExports(handlebars_runtime);

    var Template = Handlebars.template({"compiler":[8,">= 4.3.0"],"main":function(container,depth0,helpers,partials,data) {
        var helper, lookupProperty = container.lookupProperty || function(parent, propertyName) {
            if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
              return parent[propertyName];
            }
            return undefined
        };

      return "<div class=\"error-container\">"
        + container.escapeExpression(((helper = (helper = lookupProperty(helpers,"message") || (depth0 != null ? lookupProperty(depth0,"message") : depth0)) != null ? helper : container.hooks.helperMissing),(typeof helper === "function" ? helper.call(depth0 != null ? depth0 : (container.nullContext || {}),{"name":"message","hash":{},"data":data,"loc":{"source":"D:\\Documents\\GitHub\\twitch-channelpoints-api\\src\\views\\app-button.hbs","start":{"line":1,"column":29},"end":{"line":1,"column":40}}}) : helper)))
        + "</div>";
    },"useData":true});
    function ErrorContainer(data, options, asString) {
      var html = Template(data, options);
      return (asString || false) ? html : $$1(html);
    }

    var Template$1 = Handlebars.template({"compiler":[8,">= 4.3.0"],"main":function(container,depth0,helpers,partials,data) {
        return "<div class=\"app-container\">\r\n    <div class=\"app-bar\">Better Points <button id=\"close-app-button\">Close</button></div>\r\n    <div class=\"app-content\">\r\n        <div class=\"errors\"></div>\r\n        <div class=\"settings-form-container section-container\">\r\n            <h4>Settings</h4>\r\n            <div class=\"settings\"></div>\r\n            <div class=\"button-group\">\r\n                <button type=\"button\" id=\"settings-form-submit-button\" class=\"app-buttons\">Save</button>\r\n            </div>\r\n        </div>\r\n        <div class=\"create-form-container section-container\">\r\n            <h4>New Redemption Event</h4>\r\n            <div class=\"main-options\"></div>\r\n            <div class=\"command-options\">\r\n                <h5>Commands</h5>\r\n                <div class='command-group'></div>\r\n                <button type=\"button\" id=\"create-form-create-command\" class=\"app-buttons command-form-buttons\">New</button>\r\n            </div>\r\n            <div class=\"button-group\">\r\n                <button type=\"button\" id=\"create-form-submit-button\" class=\"app-buttons\">Save Redemption Event</button>\r\n            </div>\r\n        </div>\r\n        <div class=\"edit-form-container section-container\">\r\n            <h4>Edit Redemption Event</h4>\r\n            <div class=\"main-options\"></div>\r\n            <div class=\"command-options\">\r\n                <h5>Commands</h5>\r\n                <div class='command-group'></div>\r\n                <button type=\"button\" id=\"edit-form-create-command\" class=\"app-buttons command-form-buttons\">New</button>\r\n            </div>\r\n            <div class=\"button-group\">\r\n                <button type=\"button\" id=\"edit-form-submit-button\" class=\"app-buttons\">Save Changes</button>\r\n            </div>\r\n        </div>\r\n        <div class=\"redemptions-container section-container\">\r\n            <h4>Redemptions</h4>\r\n\r\n        </div>\r\n    </div>\r\n\r\n</div>";
    },"useData":true});
    function AppContainer(data, options, asString) {
      var html = Template$1(data, options);
      return (asString || false) ? html : $$1(html);
    }

    var Template$2 = Handlebars.template({"compiler":[8,">= 4.3.0"],"main":function(container,depth0,helpers,partials,data) {
        return "<div class=\"app-button-container\">\r\n    <button class=\"app-button\">BP</button>\r\n</div>";
    },"useData":true});
    function AppButton(data, options, asString) {
      var html = Template$2(data, options);
      return (asString || false) ? html : $$1(html);
    }

    var Template$3 = Handlebars.template({"1":function(container,depth0,helpers,partials,data) {
        var stack1, lookupProperty = container.lookupProperty || function(parent, propertyName) {
            if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
              return parent[propertyName];
            }
            return undefined
        };

      return "        <div>\r\n            - "
        + container.escapeExpression(container.lambda((depth0 != null ? lookupProperty(depth0,"prettyName") : depth0), depth0))
        + ":\r\n"
        + ((stack1 = lookupProperty(helpers,"each").call(depth0 != null ? depth0 : (container.nullContext || {}),(depth0 != null ? lookupProperty(depth0,"config") : depth0),{"name":"each","hash":{},"fn":container.program(2, data, 0),"inverse":container.noop,"data":data,"loc":{"source":"D:\\Documents\\GitHub\\twitch-channelpoints-api\\src\\views\\app-button.hbs","start":{"line":13,"column":12},"end":{"line":15,"column":21}}})) != null ? stack1 : "")
        + "        </div>\r\n";
    },"2":function(container,depth0,helpers,partials,data) {
        return "                "
        + container.escapeExpression(container.lambda(depth0, depth0))
        + "\r\n";
    },"compiler":[8,">= 4.3.0"],"main":function(container,depth0,helpers,partials,data) {
        var stack1, helper, alias1=depth0 != null ? depth0 : (container.nullContext || {}), alias2=container.escapeExpression, alias3=container.lambda, lookupProperty = container.lookupProperty || function(parent, propertyName) {
            if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
              return parent[propertyName];
            }
            return undefined
        };

      return "<div class=\"redemption-container\">\r\n    <button type=\"button\" id=\"redemption-edit-button\">Edit Redemption Event</button>\r\n    <button type=\"button\" id=\"redemption-delete-button\">Delete Redemption Event</button>\r\n    <div><h4>"
        + alias2(((helper = (helper = lookupProperty(helpers,"redemptionName") || (depth0 != null ? lookupProperty(depth0,"redemptionName") : depth0)) != null ? helper : container.hooks.helperMissing),(typeof helper === "function" ? helper.call(alias1,{"name":"redemptionName","hash":{},"data":data,"loc":{"source":"D:\\Documents\\GitHub\\twitch-channelpoints-api\\src\\views\\app-button.hbs","start":{"line":4,"column":13},"end":{"line":4,"column":31}}}) : helper)))
        + "</h4></div>\r\n    <div>cooldown: "
        + alias2(alias3(((stack1 = (depth0 != null ? lookupProperty(depth0,"redemption") : depth0)) != null ? lookupProperty(stack1,"cooldownInSeconds") : stack1), depth0))
        + "</div>\r\n    <div>hold: "
        + alias2(alias3(((stack1 = (depth0 != null ? lookupProperty(depth0,"redemption") : depth0)) != null ? lookupProperty(stack1,"hold") : stack1), depth0))
        + "</div>\r\n    <div>start scene: "
        + alias2(alias3(((stack1 = (depth0 != null ? lookupProperty(depth0,"redemption") : depth0)) != null ? lookupProperty(stack1,"startScene") : stack1), depth0))
        + "</div>\r\n    <div>\r\n        <div>commands: </div>\r\n"
        + ((stack1 = lookupProperty(helpers,"each").call(alias1,((stack1 = (depth0 != null ? lookupProperty(depth0,"redemption") : depth0)) != null ? lookupProperty(stack1,"commands") : stack1),{"name":"each","hash":{},"fn":container.program(1, data, 0),"inverse":container.noop,"data":data,"loc":{"source":"D:\\Documents\\GitHub\\twitch-channelpoints-api\\src\\views\\app-button.hbs","start":{"line":10,"column":8},"end":{"line":17,"column":17}}})) != null ? stack1 : "")
        + "    </div>\r\n</div>";
    },"useData":true});
    function RedemptionEvent(data, options, asString) {
      var html = Template$3(data, options);
      return (asString || false) ? html : $$1(html);
    }

    var Template$4 = Handlebars.template({"compiler":[8,">= 4.3.0"],"main":function(container,depth0,helpers,partials,data) {
        var helper, alias1=depth0 != null ? depth0 : (container.nullContext || {}), alias2=container.hooks.helperMissing, alias3="function", alias4=container.escapeExpression, lookupProperty = container.lookupProperty || function(parent, propertyName) {
            if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
              return parent[propertyName];
            }
            return undefined
        };

      return "<form class=\"form\">\r\n    <div class=\"form-group\">\r\n        <label for=\"address\">URL</label>\r\n        <input class=\"flex-grow\" type=\"text\" name=\"address\" id=\"\" value=\""
        + alias4(((helper = (helper = lookupProperty(helpers,"address") || (depth0 != null ? lookupProperty(depth0,"address") : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"address","hash":{},"data":data,"loc":{"source":"D:\\Documents\\GitHub\\twitch-channelpoints-api\\src\\views\\app-button.hbs","start":{"line":4,"column":73},"end":{"line":4,"column":84}}}) : helper)))
        + "\">\r\n    </div>\r\n    <div class=\"form-group\">\r\n        <label for=\"password\">Password</label>\r\n        <input class=\"flex-grow\" type=\"text\" name=\"password\" id=\"\" value=\""
        + alias4(((helper = (helper = lookupProperty(helpers,"password") || (depth0 != null ? lookupProperty(depth0,"password") : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"password","hash":{},"data":data,"loc":{"source":"D:\\Documents\\GitHub\\twitch-channelpoints-api\\src\\views\\app-button.hbs","start":{"line":8,"column":74},"end":{"line":8,"column":86}}}) : helper)))
        + "\">\r\n    </div>\r\n</form>";
    },"useData":true});
    function SettingsForm(data, options, asString) {
      var html = Template$4(data, options);
      return (asString || false) ? html : $$1(html);
    }

    var Template$5 = Handlebars.template({"1":function(container,depth0,helpers,partials,data) {
        return "checked ";
    },"compiler":[8,">= 4.3.0"],"main":function(container,depth0,helpers,partials,data) {
        var stack1, helper, alias1=depth0 != null ? depth0 : (container.nullContext || {}), alias2=container.hooks.helperMissing, alias3="function", alias4=container.escapeExpression, lookupProperty = container.lookupProperty || function(parent, propertyName) {
            if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
              return parent[propertyName];
            }
            return undefined
        };

      return "<form class=\"form\">\r\n    <div class=\"form-group\">\r\n        <label for=\"redemptionName\">Redemption Name</label>\r\n        <input class=\"flex-grow\" type=\"text\" name=\"redemptionName\" id=\"\" value=\""
        + alias4(((helper = (helper = lookupProperty(helpers,"redemptionName") || (depth0 != null ? lookupProperty(depth0,"redemptionName") : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"redemptionName","hash":{},"data":data,"loc":{"source":"D:\\Documents\\GitHub\\twitch-channelpoints-api\\src\\views\\app-button.hbs","start":{"line":4,"column":80},"end":{"line":4,"column":98}}}) : helper)))
        + "\">\r\n    </div>\r\n    <div class=\"form-group\">\r\n        <label for=\"startScene\">Start Scene</label>\r\n        <input class=\"flex-grow\" type=\"text\" name=\"startScene\" id=\"\" value=\""
        + alias4(((helper = (helper = lookupProperty(helpers,"startScene") || (depth0 != null ? lookupProperty(depth0,"startScene") : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"startScene","hash":{},"data":data,"loc":{"source":"D:\\Documents\\GitHub\\twitch-channelpoints-api\\src\\views\\app-button.hbs","start":{"line":8,"column":76},"end":{"line":8,"column":90}}}) : helper)))
        + "\">\r\n    </div>\r\n    <div class=\"form-group\">\r\n        <label for=\"cooldownInSeconds\">Cooldown (s)</label>\r\n        <input class=\"flex-grow\" type=\"number\" name=\"cooldownInSeconds\" id=\"\" value=\""
        + alias4(((helper = (helper = lookupProperty(helpers,"cooldownInSeconds") || (depth0 != null ? lookupProperty(depth0,"cooldownInSeconds") : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"cooldownInSeconds","hash":{},"data":data,"loc":{"source":"D:\\Documents\\GitHub\\twitch-channelpoints-api\\src\\views\\app-button.hbs","start":{"line":12,"column":85},"end":{"line":12,"column":106}}}) : helper)))
        + "\">\r\n    </div>\r\n    <div class=\"form-group\">\r\n        <label for=\"hold\">Hold</label>\r\n        <input type=\"checkbox\" name=\"hold\" id=\"\" value=\"true\" "
        + ((stack1 = lookupProperty(helpers,"if").call(alias1,(depth0 != null ? lookupProperty(depth0,"hold") : depth0),{"name":"if","hash":{},"fn":container.program(1, data, 0),"inverse":container.noop,"data":data,"loc":{"source":"D:\\Documents\\GitHub\\twitch-channelpoints-api\\src\\views\\app-button.hbs","start":{"line":16,"column":62},"end":{"line":16,"column":89}}})) != null ? stack1 : "")
        + ">\r\n    </div>\r\n</form>";
    },"useData":true});
    function CreateForm(data, options, asString) {
      var html = Template$5(data, options);
      return (asString || false) ? html : $$1(html);
    }

    var Template$6 = Handlebars.template({"compiler":[8,">= 4.3.0"],"main":function(container,depth0,helpers,partials,data) {
        return "<form class=\"command-form\">\r\n    <div class=\"form-group\">\r\n        <label for=\"function\">Action Command</label>\r\n        <select class=\"flex-grow\" name=\"function\" id=\"function-select\">\r\n            <option value=\"\" disabled selected hidden>Select an action</option>\r\n            <option value=\"SetCurrentScene\">Change to Scene</option>\r\n            <option value=\"Wait\">Pause (ms)</option>\r\n            <option value=\"SetSourceVisibility\">Set Source Visibility</option>\r\n        </select>\r\n    </div>\r\n\r\n    <div class=\"form-group action-value-group\">\r\n    </div>\r\n</form>";
    },"useData":true});
    function CommandForm(data, options, asString) {
      var html = Template$6(data, options);
      return (asString || false) ? html : $$1(html);
    }

    var Template$7 = Handlebars.template({"compiler":[8,">= 4.3.0"],"main":function(container,depth0,helpers,partials,data) {
        var helper, alias1=depth0 != null ? depth0 : (container.nullContext || {}), alias2=container.hooks.helperMissing, alias3="function", alias4=container.escapeExpression, lookupProperty = container.lookupProperty || function(parent, propertyName) {
            if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
              return parent[propertyName];
            }
            return undefined
        };

      return "<label for=\"actionValue\">"
        + alias4(((helper = (helper = lookupProperty(helpers,"name") || (depth0 != null ? lookupProperty(depth0,"name") : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"name","hash":{},"data":data,"loc":{"source":"D:\\Documents\\GitHub\\twitch-channelpoints-api\\src\\views\\app-button.hbs","start":{"line":1,"column":25},"end":{"line":1,"column":33}}}) : helper)))
        + "</label>\r\n<input class=\"flex-grow\" type=\""
        + alias4(((helper = (helper = lookupProperty(helpers,"type") || (depth0 != null ? lookupProperty(depth0,"type") : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"type","hash":{},"data":data,"loc":{"source":"D:\\Documents\\GitHub\\twitch-channelpoints-api\\src\\views\\app-button.hbs","start":{"line":2,"column":31},"end":{"line":2,"column":39}}}) : helper)))
        + "\" name=\""
        + alias4(((helper = (helper = lookupProperty(helpers,"property") || (depth0 != null ? lookupProperty(depth0,"property") : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"property","hash":{},"data":data,"loc":{"source":"D:\\Documents\\GitHub\\twitch-channelpoints-api\\src\\views\\app-button.hbs","start":{"line":2,"column":47},"end":{"line":2,"column":59}}}) : helper)))
        + "\" id=\"\" value=\""
        + alias4(((helper = (helper = lookupProperty(helpers,"value") || (depth0 != null ? lookupProperty(depth0,"value") : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"value","hash":{},"data":data,"loc":{"source":"D:\\Documents\\GitHub\\twitch-channelpoints-api\\src\\views\\app-button.hbs","start":{"line":2,"column":74},"end":{"line":2,"column":83}}}) : helper)))
        + "\">";
    },"useData":true});
    function CommandFormValue(data, options, asString) {
      var html = Template$7(data, options);
      return (asString || false) ? html : $$1(html);
    }

    log('Channel Points DOM Manipulator Loaded.'); // initialize the DOM with our UI components

    function setupDOM() {
      console.log('setting up the DOM');
      $('.app-container').remove();
      $('.reward-queue-body').prepend(AppContainer());
      $('*[data-test-selector="reward-queue-custom-reward-button"').prepend(AppButton());
      $('.create-form-container .main-options').prepend(CreateForm());
      $('.settings-form-container .settings').prepend(SettingsForm());
      $('.create-form-container .command-group').append(createNewCommandForm());
      bindClicks();
    }

    function bindClicks() {
      $('.app-button').click(showCreateView);
      $('#close-app-button').click(toggleApp);
      $('#create-form-submit-button').click(createNewRedemptionEvent);
      $('#settings-form-submit-button').click(parseSettingsFormAndSave);
      $('#create-form-create-command').click(() => {
        $('.create-form-container .command-group').append(createNewCommandForm());
      });
      $('#edit-form-create-command').click(() => {
        $('.edit-form-container .command-group').append(createNewCommandForm());
      });
      $('#edit-form-submit-button').click(() => {
        editRedemptionEvent();
      });
    }

    async function showCreateView(event) {
      var _ref;

      event.preventDefault();
      event.stopPropagation();
      toggleApp();
      hideOtherForms(); // get the surrounding button parent and find the event name

      const $parentButton = $(event.target).parents('button').first();
      const redemptionName = $parentButton.find('.reward-queue-sidebar__reward-title').text();
      const redemption = (_ref = await getRedemption(redemptionName)) !== null && _ref !== void 0 ? _ref : null;

      if (redemption) {
        loadEditView(redemptionName);
        return false;
      } else {
        // show the create view with the redemption name already filled out
        const $createForm = $('.create-form-container');
        $createForm.find('.main-options').empty().html(CreateForm({
          redemptionName
        }));
        $createForm.show();
        return false;
      }
    }

    function toggleApp() {
      $('.app-container').toggle();
    }

    function hideOtherForms() {
      $('.create-form-container').hide();
      $('.edit-form-container').hide();
    }

    function parseSettingsFormAndSave() {
      const settings = {}; // grab the values out of the form

      const $formContainer = $('.settings-form-container');
      const optionsSerialData = $formContainer.find('.form').serializeArray();
      optionsSerialData.forEach(element => {
        settings[element.name] = element.value;
      });
      saveSettings(settings);
    }

    async function createNewRedemptionEvent() {
      const $form = $('.create-form-container');
      const redemptionEvent = parseJqueryFormToObject($form); // send off the redemptionEvent for storage

      try {
        await saveRedemptionEvent(redemptionEvent);
      } catch (e) {
        // saving failed, do we need to confirm?
        if (confirm(e.message)) {
          await saveRedemptionEvent(redemptionEvent, true);
        }
      }
    }

    async function editRedemptionEvent() {
      const $formContainer = $('.edit-form-container');
      const redemptionEvent = parseJqueryFormToObject($formContainer); // send off the redemptionEvent for storage

      await saveRedemptionEvent(redemptionEvent, true);
    }

    function parseJqueryFormToObject($formContainer) {
      const redemptionEvent = {}; // grab the values out of the form

      const optionsSerialData = $formContainer.find('.form').serializeArray();
      optionsSerialData.forEach(element => {
        redemptionEvent[element.name] = element.value;
      }); // grab all of the commands and boil them down into Command objects

      const commandsSerialData = [];
      $formContainer.find('.command-form').each(function () {
        commandsSerialData.push($(this).serializeArray());
      });
      redemptionEvent.commands = [];
      commandsSerialData.forEach(element => {
        const functionName = element.shift().value;
        const config = element.map(el => {
          var _el$value;

          return {
            value: (_el$value = el.value) !== null && _el$value !== void 0 ? _el$value : false,
            name: el.name
          };
        });
        const commandData = {
          functionName,
          config
        };
        let command = new Command(commandData);
        redemptionEvent.commands.push(command);
      });
      return redemptionEvent;
    }

    function createNewCommandForm(defaults) {
      const $commandForm = $(CommandForm());
      const $functionSelect = $commandForm.find('#function-select');
      $functionSelect.change(function () {
        const functionName = $(this).val();
        const preset = COMMAND_PRESETS[functionName];
        const actions = preset.actions;
        $commandForm.find('.action-value-group').empty();
        actions.forEach(action => {
          const template = CommandFormValue({
            name: action.name,
            type: action.type,
            value: action.value,
            property: action.property
          });
          $commandForm.find('.action-value-group').append(template);
        });
      });
      return $commandForm;
    }

    function displayRedemptions(redemptions) {
      console.log('displaying redemptions');
      const redemptionTemplates = [];

      for (const redemptionName in redemptions) {
        if (redemptions.hasOwnProperty(redemptionName)) {
          const redemption = redemptions[redemptionName];
          const redemptionTemplate = RedemptionEvent({
            redemptionName,
            redemption
          });
          let $redemption = $(redemptionTemplate);
          bindRedemptionButtons(redemptionName, $redemption);
          redemptionTemplates.push($redemption);
        }
      }

      $('.redemptions-container').empty().append(redemptionTemplates);
    }
    function displaySettings(settings) {
      const $settingsForm = $('.settings-form-container .form');

      for (const key in settings) {
        $settingsForm.find(`input[name=${key}]`).val(settings[key]);
      }
    }

    function bindRedemptionButtons(redemptionName, $redemption) {
      $redemption.find('#redemption-edit-button').click(function () {
        loadEditView(redemptionName);
      });
      $redemption.find('#redemption-delete-button').click(function () {
        deleteRedemption();
      });
    }

    async function loadEditView(redemptionName) {
      hideOtherForms();
      const redemption = await getRedemption(redemptionName);
      const $editForm = $('.edit-form-container');
      $editForm.find('.main-options').empty().html(CreateForm(redemption));
      $editForm.show();
      $editForm.find('.command-options .command-group').empty();
      redemption.commands.forEach(command => {
        const $commandForm = createNewCommandForm();
        $editForm.find('.command-options .command-group').append($commandForm);
        $commandForm.find('#function-select').val(command.functionName).change(function () {
          for (const key in command.config) {
            const $input = $commandForm.find(`input[name=${key}]`);
            $input.val(command.config[key]);

            if ($input.attr('type') === 'checkbox') {
              $input.prop('checked', command.config[key]);
            }
          }
        }).change();
      });
    }

    function deleteRedemption(redemptionName) {
      alert('really?');
    }

    function displayError(error) {
      const errorContainer = ErrorContainer({
        message: error.message
      }); // check if we have a container on the DOM

      $('.error-container').remove();
      $('.errors').prepend(errorContainer);
      $('.errors').show(100);
      setTimeout(() => {
        $('.errors').hide(100);
      }, 5000);
    }

    const ctPointsContainerObserver = new MutationObserver(findRewardContainer);
    const ctPointsRewardObserver = new MutationObserver(filterDOMInsertionEvents);
    const handledRewards = new Map();
    const pendingRewards = new Map();
    let resolver = {};
    const DOMReady = new Promise(resolve => {
      resolver = resolve;
    });
    function listen() {
      log('Channel Points DOM Listener Loaded.'); // get the reward container

      ctPointsContainerObserver.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: false,
        characterData: false
      });
      return DOMReady;
    } // find reward container from mutation events

    function findRewardContainer(mutations) {
      mutations.forEach(function (mutation) {
        if (!mutation.addedNodes) return;
        mutation.addedNodes.forEach(function (node) {
          if (node.className.includes('simplebar-scroll-content')) {
            const queue = $(node).find('.reward-queue-body')[0];
            if (!queue) return; // No reward queue here

            log('Rewards container found! Listening for reward events...');
            ctPointsContainerObserver.disconnect();
            ctPointsRewardObserver.observe(queue, {
              childList: true,
              subtree: true,
              attributes: false,
              chatacterData: false
            }); // resolves the deferred promise

            resolver();
          }
        });
      });
    } // find DOM events we're interested in


    function filterDOMInsertionEvents(mutations) {
      mutations.forEach(function (mutation) {
        if (!mutation.addedNodes) return;
        mutation.addedNodes.forEach(function (node) {
          const $redemptionContainer = $(node).find('.redemption-card__card-body'); // check if we found a redemption card

          if ($redemptionContainer.length > 0) {
            // we have a redemtpion so now handle it
            handleRedemption($redemptionContainer);
          }
        });
      });
    } // used handle the redemption event, accepts jquery object


    async function handleRedemption($redemptionContainer) {
      const redemptionData = await extractAllData($redemptionContainer);

      if (handledRewards.has(redemptionData.reportId)) {
        log('Reward', redemptionData.reportId, 'already handled, skipping');
        return;
      } else {
        log('Handling redemption', redemptionData);
        handledRewards.set(redemptionData.reportId);
        pendingRewards.set(redemptionData.reportId, redemptionData);
        const result = await executeRedemption(redemptionData);
        console.log(result);
      }
    } // pull everything off the DOM and return an object


    async function extractAllData($redemptionContainer) {
      let userName = extractUsername($redemptionContainer);
      if (!userName) userName = await extractUsernameAsync($redemptionContainer);
      const rewardName = extractRewardName($redemptionContainer);
      const response = extractResponse($redemptionContainer);
      const reportId = extractId($redemptionContainer);
      const actions = extractActionButtons($redemptionContainer);
      return {
        userName,
        rewardName,
        response,
        reportId,
        actions
      };
    }

    function extractUsername($redemptionContainer) {
      // start with the text "USER" and find its div sibling with an h4 descendant
      const $rewardUserSibling = $redemptionContainer.find('h5:contains(USER)');
      const userName = $rewardUserSibling.siblings('div').find('h4').html();
      return userName;
    }

    function extractUsernameAsync($redemptionContainer) {
      let promiseResolve, promiseReject;
      const promise = new Promise(function (resolve, reject) {
        promiseResolve = resolve;
        promiseReject = reject;
      });
      const userObserver = new MutationObserver(function (mutations) {
        mutations.forEach(function (mutation) {
          if (!mutation.addedNodes) return;
          mutation.addedNodes.forEach(function (node) {
            if (node.nodeName === 'H4') {
              // We got a username
              userObserver.disconnect();
              promiseResolve(node.textContent); // return username
            }
          });
        });
      }); // start with the text "USER" and find its div sibling

      const $rewardUserSibling = $redemptionContainer.find('h5:contains(USER)');
      const userDiv = $rewardUserSibling.siblings('div')[0]; // Observe the div until we find an h4 element containing the username

      userObserver.observe(userDiv, {
        childList: true,
        subtree: false,
        attributes: false,
        chatacterData: false
      });
      setTimeout(() => {
        promiseReject('Could not get username');
      }, 3000);
      return promise;
    }

    function extractRewardName($redemptionContainer) {
      // start with the text "REWARD" and find its h4 sibling
      const $rewardTitleSibling = $redemptionContainer.find('h5:contains(REWARD)');
      const rewardName = $rewardTitleSibling.siblings('h4').html();
      return rewardName;
    }

    function extractResponse($redemptionContainer) {
      // start with the text "RESPONSE" and find its h4 sibling
      const $responseTitleSibling = $redemptionContainer.find('h5:contains(RESPONSE)');
      const response = $responseTitleSibling.siblings('h4').html();
      return response;
    }

    function extractId($redemptionContainer) {
      // drill down through report-button element for the id stored on the tooltip div
      const id = $redemptionContainer.find('.redemption-card__report-button').find('.mod-buttons').siblings('.tw-tooltip').attr('id');
      return id;
    }

    function extractActionButtons($redemptionContainer) {
      // look for button elements in the container (should only be two)
      const $buttons = $redemptionContainer.find('button'); // return the DOM elements themselves not jquery

      return {
        resolve: $buttons[0],
        reject: $buttons[1]
      };
    }

    $().ready(async () => {
      // start listening on the DOM
      await listen();
      console.log('Twitch DOM fully loaded');
      setupDOM(); // load settings and connect to OBS

      try {
        await connect();
        log('Connected to OBS!');
      } catch (obsError) {
        const error = new Error(`There was a problem connecting to OBS: ${obsError.code} ${obsError.description}`);
        displayError(error);
      }
    });

}($));
//# sourceMappingURL=content-script.js.map
