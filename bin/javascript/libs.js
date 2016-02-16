require=(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({"gsap":[function(require,module,exports){
(function (global){
/*!
 * VERSION: 1.18.2
 * DATE: 2015-12-22
 * UPDATES AND DOCS AT: http://greensock.com
 * 
 * Includes all of the following: TweenLite, TweenMax, TimelineLite, TimelineMax, EasePack, CSSPlugin, RoundPropsPlugin, BezierPlugin, AttrPlugin, DirectionalRotationPlugin
 *
 * @license Copyright (c) 2008-2016, GreenSock. All rights reserved.
 * This work is subject to the terms at http://greensock.com/standard-license or for
 * Club GreenSock members, the software agreement that was issued with your membership.
 * 
 * @author: Jack Doyle, jack@greensock.com
 **/
var _gsScope = (typeof(module) !== "undefined" && module.exports && typeof(global) !== "undefined") ? global : this || window; //helps ensure compatibility with AMD/RequireJS and CommonJS/Node
(_gsScope._gsQueue || (_gsScope._gsQueue = [])).push( function() {

	"use strict";

	_gsScope._gsDefine("TweenMax", ["core.Animation","core.SimpleTimeline","TweenLite"], function(Animation, SimpleTimeline, TweenLite) {

		var _slice = function(a) { //don't use [].slice because that doesn't work in IE8 with a NodeList that's returned by querySelectorAll()
				var b = [],
					l = a.length,
					i;
				for (i = 0; i !== l; b.push(a[i++]));
				return b;
			},
			_applyCycle = function(vars, targets, i) {
				var alt = vars.cycle,
					p, val;
				for (p in alt) {
					val = alt[p];
					vars[p] = (typeof(val) === "function") ? val.call(targets[i], i) : val[i % val.length];
				}
				delete vars.cycle;
			},
			TweenMax = function(target, duration, vars) {
				TweenLite.call(this, target, duration, vars);
				this._cycle = 0;
				this._yoyo = (this.vars.yoyo === true);
				this._repeat = this.vars.repeat || 0;
				this._repeatDelay = this.vars.repeatDelay || 0;
				this._dirty = true; //ensures that if there is any repeat, the totalDuration will get recalculated to accurately report it.
				this.render = TweenMax.prototype.render; //speed optimization (avoid prototype lookup on this "hot" method)
			},
			_tinyNum = 0.0000000001,
			TweenLiteInternals = TweenLite._internals,
			_isSelector = TweenLiteInternals.isSelector,
			_isArray = TweenLiteInternals.isArray,
			p = TweenMax.prototype = TweenLite.to({}, 0.1, {}),
			_blankArray = [];

		TweenMax.version = "1.18.2";
		p.constructor = TweenMax;
		p.kill()._gc = false;
		TweenMax.killTweensOf = TweenMax.killDelayedCallsTo = TweenLite.killTweensOf;
		TweenMax.getTweensOf = TweenLite.getTweensOf;
		TweenMax.lagSmoothing = TweenLite.lagSmoothing;
		TweenMax.ticker = TweenLite.ticker;
		TweenMax.render = TweenLite.render;

		p.invalidate = function() {
			this._yoyo = (this.vars.yoyo === true);
			this._repeat = this.vars.repeat || 0;
			this._repeatDelay = this.vars.repeatDelay || 0;
			this._uncache(true);
			return TweenLite.prototype.invalidate.call(this);
		};
		
		p.updateTo = function(vars, resetDuration) {
			var curRatio = this.ratio,
				immediate = this.vars.immediateRender || vars.immediateRender,
				p;
			if (resetDuration && this._startTime < this._timeline._time) {
				this._startTime = this._timeline._time;
				this._uncache(false);
				if (this._gc) {
					this._enabled(true, false);
				} else {
					this._timeline.insert(this, this._startTime - this._delay); //ensures that any necessary re-sequencing of Animations in the timeline occurs to make sure the rendering order is correct.
				}
			}
			for (p in vars) {
				this.vars[p] = vars[p];
			}
			if (this._initted || immediate) {
				if (resetDuration) {
					this._initted = false;
					if (immediate) {
						this.render(0, true, true);
					}
				} else {
					if (this._gc) {
						this._enabled(true, false);
					}
					if (this._notifyPluginsOfEnabled && this._firstPT) {
						TweenLite._onPluginEvent("_onDisable", this); //in case a plugin like MotionBlur must perform some cleanup tasks
					}
					if (this._time / this._duration > 0.998) { //if the tween has finished (or come extremely close to finishing), we just need to rewind it to 0 and then render it again at the end which forces it to re-initialize (parsing the new vars). We allow tweens that are close to finishing (but haven't quite finished) to work this way too because otherwise, the values are so small when determining where to project the starting values that binary math issues creep in and can make the tween appear to render incorrectly when run backwards. 
						var prevTime = this._totalTime;
						this.render(0, true, false);
						this._initted = false;
						this.render(prevTime, true, false);
					} else {
						this._initted = false;
						this._init();
						if (this._time > 0 || immediate) {
							var inv = 1 / (1 - curRatio),
								pt = this._firstPT, endValue;
							while (pt) {
								endValue = pt.s + pt.c;
								pt.c *= inv;
								pt.s = endValue - pt.c;
								pt = pt._next;
							}
						}
					}
				}
			}
			return this;
		};
				
		p.render = function(time, suppressEvents, force) {
			if (!this._initted) if (this._duration === 0 && this.vars.repeat) { //zero duration tweens that render immediately have render() called from TweenLite's constructor, before TweenMax's constructor has finished setting _repeat, _repeatDelay, and _yoyo which are critical in determining totalDuration() so we need to call invalidate() which is a low-kb way to get those set properly.
				this.invalidate();
			}
			var totalDur = (!this._dirty) ? this._totalDuration : this.totalDuration(),
				prevTime = this._time,
				prevTotalTime = this._totalTime, 
				prevCycle = this._cycle,
				duration = this._duration,
				prevRawPrevTime = this._rawPrevTime,
				isComplete, callback, pt, cycleDuration, r, type, pow, rawPrevTime;
			if (time >= totalDur - 0.0000001) { //to work around occasional floating point math artifacts.
				this._totalTime = totalDur;
				this._cycle = this._repeat;
				if (this._yoyo && (this._cycle & 1) !== 0) {
					this._time = 0;
					this.ratio = this._ease._calcEnd ? this._ease.getRatio(0) : 0;
				} else {
					this._time = duration;
					this.ratio = this._ease._calcEnd ? this._ease.getRatio(1) : 1;
				}
				if (!this._reversed) {
					isComplete = true;
					callback = "onComplete";
					force = (force || this._timeline.autoRemoveChildren); //otherwise, if the animation is unpaused/activated after it's already finished, it doesn't get removed from the parent timeline.
				}
				if (duration === 0) if (this._initted || !this.vars.lazy || force) { //zero-duration tweens are tricky because we must discern the momentum/direction of time in order to determine whether the starting values should be rendered or the ending values. If the "playhead" of its timeline goes past the zero-duration tween in the forward direction or lands directly on it, the end values should be rendered, but if the timeline's "playhead" moves past it in the backward direction (from a postitive time to a negative time), the starting values must be rendered.
					if (this._startTime === this._timeline._duration) { //if a zero-duration tween is at the VERY end of a timeline and that timeline renders at its end, it will typically add a tiny bit of cushion to the render time to prevent rounding errors from getting in the way of tweens rendering their VERY end. If we then reverse() that timeline, the zero-duration tween will trigger its onReverseComplete even though technically the playhead didn't pass over it again. It's a very specific edge case we must accommodate.
						time = 0;
					}
					if (prevRawPrevTime < 0 || (time <= 0 && time >= -0.0000001) || (prevRawPrevTime === _tinyNum && this.data !== "isPause")) if (prevRawPrevTime !== time) { //note: when this.data is "isPause", it's a callback added by addPause() on a timeline that we should not be triggered when LEAVING its exact start time. In other words, tl.addPause(1).play(1) shouldn't pause.
						force = true;
						if (prevRawPrevTime > _tinyNum) {
							callback = "onReverseComplete";
						}
					}
					this._rawPrevTime = rawPrevTime = (!suppressEvents || time || prevRawPrevTime === time) ? time : _tinyNum; //when the playhead arrives at EXACTLY time 0 (right on top) of a zero-duration tween, we need to discern if events are suppressed so that when the playhead moves again (next time), it'll trigger the callback. If events are NOT suppressed, obviously the callback would be triggered in this render. Basically, the callback should fire either when the playhead ARRIVES or LEAVES this exact spot, not both. Imagine doing a timeline.seek(0) and there's a callback that sits at 0. Since events are suppressed on that seek() by default, nothing will fire, but when the playhead moves off of that position, the callback should fire. This behavior is what people intuitively expect. We set the _rawPrevTime to be a precise tiny number to indicate this scenario rather than using another property/variable which would increase memory usage. This technique is less readable, but more efficient.
				}
				
			} else if (time < 0.0000001) { //to work around occasional floating point math artifacts, round super small values to 0.
				this._totalTime = this._time = this._cycle = 0;
				this.ratio = this._ease._calcEnd ? this._ease.getRatio(0) : 0;
				if (prevTotalTime !== 0 || (duration === 0 && prevRawPrevTime > 0)) {
					callback = "onReverseComplete";
					isComplete = this._reversed;
				}
				if (time < 0) {
					this._active = false;
					if (duration === 0) if (this._initted || !this.vars.lazy || force) { //zero-duration tweens are tricky because we must discern the momentum/direction of time in order to determine whether the starting values should be rendered or the ending values. If the "playhead" of its timeline goes past the zero-duration tween in the forward direction or lands directly on it, the end values should be rendered, but if the timeline's "playhead" moves past it in the backward direction (from a postitive time to a negative time), the starting values must be rendered.
						if (prevRawPrevTime >= 0) {
							force = true;
						}
						this._rawPrevTime = rawPrevTime = (!suppressEvents || time || prevRawPrevTime === time) ? time : _tinyNum; //when the playhead arrives at EXACTLY time 0 (right on top) of a zero-duration tween, we need to discern if events are suppressed so that when the playhead moves again (next time), it'll trigger the callback. If events are NOT suppressed, obviously the callback would be triggered in this render. Basically, the callback should fire either when the playhead ARRIVES or LEAVES this exact spot, not both. Imagine doing a timeline.seek(0) and there's a callback that sits at 0. Since events are suppressed on that seek() by default, nothing will fire, but when the playhead moves off of that position, the callback should fire. This behavior is what people intuitively expect. We set the _rawPrevTime to be a precise tiny number to indicate this scenario rather than using another property/variable which would increase memory usage. This technique is less readable, but more efficient.
					}
				}
				if (!this._initted) { //if we render the very beginning (time == 0) of a fromTo(), we must force the render (normal tweens wouldn't need to render at a time of 0 when the prevTime was also 0). This is also mandatory to make sure overwriting kicks in immediately.
					force = true;
				}
			} else {
				this._totalTime = this._time = time;
				
				if (this._repeat !== 0) {
					cycleDuration = duration + this._repeatDelay;
					this._cycle = (this._totalTime / cycleDuration) >> 0; //originally _totalTime % cycleDuration but floating point errors caused problems, so I normalized it. (4 % 0.8 should be 0 but Flash reports it as 0.79999999!)
					if (this._cycle !== 0) if (this._cycle === this._totalTime / cycleDuration) {
						this._cycle--; //otherwise when rendered exactly at the end time, it will act as though it is repeating (at the beginning)
					}
					this._time = this._totalTime - (this._cycle * cycleDuration);
					if (this._yoyo) if ((this._cycle & 1) !== 0) {
						this._time = duration - this._time;
					}
					if (this._time > duration) {
						this._time = duration;
					} else if (this._time < 0) {
						this._time = 0;
					}
				}

				if (this._easeType) {
					r = this._time / duration;
					type = this._easeType;
					pow = this._easePower;
					if (type === 1 || (type === 3 && r >= 0.5)) {
						r = 1 - r;
					}
					if (type === 3) {
						r *= 2;
					}
					if (pow === 1) {
						r *= r;
					} else if (pow === 2) {
						r *= r * r;
					} else if (pow === 3) {
						r *= r * r * r;
					} else if (pow === 4) {
						r *= r * r * r * r;
					}

					if (type === 1) {
						this.ratio = 1 - r;
					} else if (type === 2) {
						this.ratio = r;
					} else if (this._time / duration < 0.5) {
						this.ratio = r / 2;
					} else {
						this.ratio = 1 - (r / 2);
					}

				} else {
					this.ratio = this._ease.getRatio(this._time / duration);
				}
				
			}
				
			if (prevTime === this._time && !force && prevCycle === this._cycle) {
				if (prevTotalTime !== this._totalTime) if (this._onUpdate) if (!suppressEvents) { //so that onUpdate fires even during the repeatDelay - as long as the totalTime changed, we should trigger onUpdate.
					this._callback("onUpdate");
				}
				return;
			} else if (!this._initted) {
				this._init();
				if (!this._initted || this._gc) { //immediateRender tweens typically won't initialize until the playhead advances (_time is greater than 0) in order to ensure that overwriting occurs properly. Also, if all of the tweening properties have been overwritten (which would cause _gc to be true, as set in _init()), we shouldn't continue otherwise an onStart callback could be called for example.
					return;
				} else if (!force && this._firstPT && ((this.vars.lazy !== false && this._duration) || (this.vars.lazy && !this._duration))) { //we stick it in the queue for rendering at the very end of the tick - this is a performance optimization because browsers invalidate styles and force a recalculation if you read, write, and then read style data (so it's better to read/read/read/write/write/write than read/write/read/write/read/write). The down side, of course, is that usually you WANT things to render immediately because you may have code running right after that which depends on the change. Like imagine running TweenLite.set(...) and then immediately after that, creating a nother tween that animates the same property to another value; the starting values of that 2nd tween wouldn't be accurate if lazy is true.
					this._time = prevTime;
					this._totalTime = prevTotalTime;
					this._rawPrevTime = prevRawPrevTime;
					this._cycle = prevCycle;
					TweenLiteInternals.lazyTweens.push(this);
					this._lazy = [time, suppressEvents];
					return;
				}
				//_ease is initially set to defaultEase, so now that init() has run, _ease is set properly and we need to recalculate the ratio. Overall this is faster than using conditional logic earlier in the method to avoid having to set ratio twice because we only init() once but renderTime() gets called VERY frequently.
				if (this._time && !isComplete) {
					this.ratio = this._ease.getRatio(this._time / duration);
				} else if (isComplete && this._ease._calcEnd) {
					this.ratio = this._ease.getRatio((this._time === 0) ? 0 : 1);
				}
			}
			if (this._lazy !== false) {
				this._lazy = false;
			}

			if (!this._active) if (!this._paused && this._time !== prevTime && time >= 0) {
				this._active = true; //so that if the user renders a tween (as opposed to the timeline rendering it), the timeline is forced to re-render and align it with the proper time/frame on the next rendering cycle. Maybe the tween already finished but the user manually re-renders it as halfway done.
			}
			if (prevTotalTime === 0) {
				if (this._initted === 2 && time > 0) {
					//this.invalidate();
					this._init(); //will just apply overwriting since _initted of (2) means it was a from() tween that had immediateRender:true
				}
				if (this._startAt) {
					if (time >= 0) {
						this._startAt.render(time, suppressEvents, force);
					} else if (!callback) {
						callback = "_dummyGS"; //if no callback is defined, use a dummy value just so that the condition at the end evaluates as true because _startAt should render AFTER the normal render loop when the time is negative. We could handle this in a more intuitive way, of course, but the render loop is the MOST important thing to optimize, so this technique allows us to avoid adding extra conditional logic in a high-frequency area.
					}
				}
				if (this.vars.onStart) if (this._totalTime !== 0 || duration === 0) if (!suppressEvents) {
					this._callback("onStart");
				}
			}
			
			pt = this._firstPT;
			while (pt) {
				if (pt.f) {
					pt.t[pt.p](pt.c * this.ratio + pt.s);
				} else {
					pt.t[pt.p] = pt.c * this.ratio + pt.s;
				}
				pt = pt._next;
			}
			
			if (this._onUpdate) {
				if (time < 0) if (this._startAt && this._startTime) { //if the tween is positioned at the VERY beginning (_startTime 0) of its parent timeline, it's illegal for the playhead to go back further, so we should not render the recorded startAt values.
					this._startAt.render(time, suppressEvents, force); //note: for performance reasons, we tuck this conditional logic inside less traveled areas (most tweens don't have an onUpdate). We'd just have it at the end before the onComplete, but the values should be updated before any onUpdate is called, so we ALSO put it here and then if it's not called, we do so later near the onComplete.
				}
				if (!suppressEvents) if (this._totalTime !== prevTotalTime || isComplete) {
					this._callback("onUpdate");
				}
			}
			if (this._cycle !== prevCycle) if (!suppressEvents) if (!this._gc) if (this.vars.onRepeat) {
				this._callback("onRepeat");
			}
			if (callback) if (!this._gc || force) { //check gc because there's a chance that kill() could be called in an onUpdate
				if (time < 0 && this._startAt && !this._onUpdate && this._startTime) { //if the tween is positioned at the VERY beginning (_startTime 0) of its parent timeline, it's illegal for the playhead to go back further, so we should not render the recorded startAt values.
					this._startAt.render(time, suppressEvents, force);
				}
				if (isComplete) {
					if (this._timeline.autoRemoveChildren) {
						this._enabled(false, false);
					}
					this._active = false;
				}
				if (!suppressEvents && this.vars[callback]) {
					this._callback(callback);
				}
				if (duration === 0 && this._rawPrevTime === _tinyNum && rawPrevTime !== _tinyNum) { //the onComplete or onReverseComplete could trigger movement of the playhead and for zero-duration tweens (which must discern direction) that land directly back on their start time, we don't want to fire again on the next render. Think of several addPause()'s in a timeline that forces the playhead to a certain spot, but what if it's already paused and another tween is tweening the "time" of the timeline? Each time it moves [forward] past that spot, it would move back, and since suppressEvents is true, it'd reset _rawPrevTime to _tinyNum so that when it begins again, the callback would fire (so ultimately it could bounce back and forth during that tween). Again, this is a very uncommon scenario, but possible nonetheless.
					this._rawPrevTime = 0;
				}
			}
		};
		
//---- STATIC FUNCTIONS -----------------------------------------------------------------------------------------------------------
		
		TweenMax.to = function(target, duration, vars) {
			return new TweenMax(target, duration, vars);
		};
		
		TweenMax.from = function(target, duration, vars) {
			vars.runBackwards = true;
			vars.immediateRender = (vars.immediateRender != false);
			return new TweenMax(target, duration, vars);
		};
		
		TweenMax.fromTo = function(target, duration, fromVars, toVars) {
			toVars.startAt = fromVars;
			toVars.immediateRender = (toVars.immediateRender != false && fromVars.immediateRender != false);
			return new TweenMax(target, duration, toVars);
		};
		
		TweenMax.staggerTo = TweenMax.allTo = function(targets, duration, vars, stagger, onCompleteAll, onCompleteAllParams, onCompleteAllScope) {
			stagger = stagger || 0;
			var delay = 0,
				a = [],
				finalComplete = function() {
					if (vars.onComplete) {
						vars.onComplete.apply(vars.onCompleteScope || this, arguments);
					}
					onCompleteAll.apply(onCompleteAllScope || vars.callbackScope || this, onCompleteAllParams || _blankArray);
				},
				cycle = vars.cycle,
				fromCycle = (vars.startAt && vars.startAt.cycle),
				l, copy, i, p;
			if (!_isArray(targets)) {
				if (typeof(targets) === "string") {
					targets = TweenLite.selector(targets) || targets;
				}
				if (_isSelector(targets)) {
					targets = _slice(targets);
				}
			}
			targets = targets || [];
			if (stagger < 0) {
				targets = _slice(targets);
				targets.reverse();
				stagger *= -1;
			}
			l = targets.length - 1;
			for (i = 0; i <= l; i++) {
				copy = {};
				for (p in vars) {
					copy[p] = vars[p];
				}
				if (cycle) {
					_applyCycle(copy, targets, i);
				}
				if (fromCycle) {
					fromCycle = copy.startAt = {};
					for (p in vars.startAt) {
						fromCycle[p] = vars.startAt[p];
					}
					_applyCycle(copy.startAt, targets, i);
				}
				copy.delay = delay + (copy.delay || 0);
				if (i === l && onCompleteAll) {
					copy.onComplete = finalComplete;
				}
				a[i] = new TweenMax(targets[i], duration, copy);
				delay += stagger;
			}
			return a;
		};
		
		TweenMax.staggerFrom = TweenMax.allFrom = function(targets, duration, vars, stagger, onCompleteAll, onCompleteAllParams, onCompleteAllScope) {
			vars.runBackwards = true;
			vars.immediateRender = (vars.immediateRender != false);
			return TweenMax.staggerTo(targets, duration, vars, stagger, onCompleteAll, onCompleteAllParams, onCompleteAllScope);
		};
		
		TweenMax.staggerFromTo = TweenMax.allFromTo = function(targets, duration, fromVars, toVars, stagger, onCompleteAll, onCompleteAllParams, onCompleteAllScope) {
			toVars.startAt = fromVars;
			toVars.immediateRender = (toVars.immediateRender != false && fromVars.immediateRender != false);
			return TweenMax.staggerTo(targets, duration, toVars, stagger, onCompleteAll, onCompleteAllParams, onCompleteAllScope);
		};
				
		TweenMax.delayedCall = function(delay, callback, params, scope, useFrames) {
			return new TweenMax(callback, 0, {delay:delay, onComplete:callback, onCompleteParams:params, callbackScope:scope, onReverseComplete:callback, onReverseCompleteParams:params, immediateRender:false, useFrames:useFrames, overwrite:0});
		};
		
		TweenMax.set = function(target, vars) {
			return new TweenMax(target, 0, vars);
		};
		
		TweenMax.isTweening = function(target) {
			return (TweenLite.getTweensOf(target, true).length > 0);
		};
		
		var _getChildrenOf = function(timeline, includeTimelines) {
				var a = [],
					cnt = 0,
					tween = timeline._first;
				while (tween) {
					if (tween instanceof TweenLite) {
						a[cnt++] = tween;
					} else {
						if (includeTimelines) {
							a[cnt++] = tween;
						}
						a = a.concat(_getChildrenOf(tween, includeTimelines));
						cnt = a.length;
					}
					tween = tween._next;
				}
				return a;
			}, 
			getAllTweens = TweenMax.getAllTweens = function(includeTimelines) {
				return _getChildrenOf(Animation._rootTimeline, includeTimelines).concat( _getChildrenOf(Animation._rootFramesTimeline, includeTimelines) );
			};
		
		TweenMax.killAll = function(complete, tweens, delayedCalls, timelines) {
			if (tweens == null) {
				tweens = true;
			}
			if (delayedCalls == null) {
				delayedCalls = true;
			}
			var a = getAllTweens((timelines != false)),
				l = a.length,
				allTrue = (tweens && delayedCalls && timelines),
				isDC, tween, i;
			for (i = 0; i < l; i++) {
				tween = a[i];
				if (allTrue || (tween instanceof SimpleTimeline) || ((isDC = (tween.target === tween.vars.onComplete)) && delayedCalls) || (tweens && !isDC)) {
					if (complete) {
						tween.totalTime(tween._reversed ? 0 : tween.totalDuration());
					} else {
						tween._enabled(false, false);
					}
				}
			}
		};
		
		TweenMax.killChildTweensOf = function(parent, complete) {
			if (parent == null) {
				return;
			}
			var tl = TweenLiteInternals.tweenLookup,
				a, curParent, p, i, l;
			if (typeof(parent) === "string") {
				parent = TweenLite.selector(parent) || parent;
			}
			if (_isSelector(parent)) {
				parent = _slice(parent);
			}
			if (_isArray(parent)) {
				i = parent.length;
				while (--i > -1) {
					TweenMax.killChildTweensOf(parent[i], complete);
				}
				return;
			}
			a = [];
			for (p in tl) {
				curParent = tl[p].target.parentNode;
				while (curParent) {
					if (curParent === parent) {
						a = a.concat(tl[p].tweens);
					}
					curParent = curParent.parentNode;
				}
			}
			l = a.length;
			for (i = 0; i < l; i++) {
				if (complete) {
					a[i].totalTime(a[i].totalDuration());
				}
				a[i]._enabled(false, false);
			}
		};

		var _changePause = function(pause, tweens, delayedCalls, timelines) {
			tweens = (tweens !== false);
			delayedCalls = (delayedCalls !== false);
			timelines = (timelines !== false);
			var a = getAllTweens(timelines),
				allTrue = (tweens && delayedCalls && timelines),
				i = a.length,
				isDC, tween;
			while (--i > -1) {
				tween = a[i];
				if (allTrue || (tween instanceof SimpleTimeline) || ((isDC = (tween.target === tween.vars.onComplete)) && delayedCalls) || (tweens && !isDC)) {
					tween.paused(pause);
				}
			}
		};
		
		TweenMax.pauseAll = function(tweens, delayedCalls, timelines) {
			_changePause(true, tweens, delayedCalls, timelines);
		};
		
		TweenMax.resumeAll = function(tweens, delayedCalls, timelines) {
			_changePause(false, tweens, delayedCalls, timelines);
		};

		TweenMax.globalTimeScale = function(value) {
			var tl = Animation._rootTimeline,
				t = TweenLite.ticker.time;
			if (!arguments.length) {
				return tl._timeScale;
			}
			value = value || _tinyNum; //can't allow zero because it'll throw the math off
			tl._startTime = t - ((t - tl._startTime) * tl._timeScale / value);
			tl = Animation._rootFramesTimeline;
			t = TweenLite.ticker.frame;
			tl._startTime = t - ((t - tl._startTime) * tl._timeScale / value);
			tl._timeScale = Animation._rootTimeline._timeScale = value;
			return value;
		};
		
	
//---- GETTERS / SETTERS ----------------------------------------------------------------------------------------------------------
		
		p.progress = function(value) {
			return (!arguments.length) ? this._time / this.duration() : this.totalTime( this.duration() * ((this._yoyo && (this._cycle & 1) !== 0) ? 1 - value : value) + (this._cycle * (this._duration + this._repeatDelay)), false);
		};
		
		p.totalProgress = function(value) {
			return (!arguments.length) ? this._totalTime / this.totalDuration() : this.totalTime( this.totalDuration() * value, false);
		};
		
		p.time = function(value, suppressEvents) {
			if (!arguments.length) {
				return this._time;
			}
			if (this._dirty) {
				this.totalDuration();
			}
			if (value > this._duration) {
				value = this._duration;
			}
			if (this._yoyo && (this._cycle & 1) !== 0) {
				value = (this._duration - value) + (this._cycle * (this._duration + this._repeatDelay));
			} else if (this._repeat !== 0) {
				value += this._cycle * (this._duration + this._repeatDelay);
			}
			return this.totalTime(value, suppressEvents);
		};

		p.duration = function(value) {
			if (!arguments.length) {
				return this._duration; //don't set _dirty = false because there could be repeats that haven't been factored into the _totalDuration yet. Otherwise, if you create a repeated TweenMax and then immediately check its duration(), it would cache the value and the totalDuration would not be correct, thus repeats wouldn't take effect.
			}
			return Animation.prototype.duration.call(this, value);
		};

		p.totalDuration = function(value) {
			if (!arguments.length) {
				if (this._dirty) {
					//instead of Infinity, we use 999999999999 so that we can accommodate reverses
					this._totalDuration = (this._repeat === -1) ? 999999999999 : this._duration * (this._repeat + 1) + (this._repeatDelay * this._repeat);
					this._dirty = false;
				}
				return this._totalDuration;
			}
			return (this._repeat === -1) ? this : this.duration( (value - (this._repeat * this._repeatDelay)) / (this._repeat + 1) );
		};
		
		p.repeat = function(value) {
			if (!arguments.length) {
				return this._repeat;
			}
			this._repeat = value;
			return this._uncache(true);
		};
		
		p.repeatDelay = function(value) {
			if (!arguments.length) {
				return this._repeatDelay;
			}
			this._repeatDelay = value;
			return this._uncache(true);
		};
		
		p.yoyo = function(value) {
			if (!arguments.length) {
				return this._yoyo;
			}
			this._yoyo = value;
			return this;
		};
		
		
		return TweenMax;
		
	}, true);








/*
 * ----------------------------------------------------------------
 * TimelineLite
 * ----------------------------------------------------------------
 */
	_gsScope._gsDefine("TimelineLite", ["core.Animation","core.SimpleTimeline","TweenLite"], function(Animation, SimpleTimeline, TweenLite) {

		var TimelineLite = function(vars) {
				SimpleTimeline.call(this, vars);
				this._labels = {};
				this.autoRemoveChildren = (this.vars.autoRemoveChildren === true);
				this.smoothChildTiming = (this.vars.smoothChildTiming === true);
				this._sortChildren = true;
				this._onUpdate = this.vars.onUpdate;
				var v = this.vars,
					val, p;
				for (p in v) {
					val = v[p];
					if (_isArray(val)) if (val.join("").indexOf("{self}") !== -1) {
						v[p] = this._swapSelfInParams(val);
					}
				}
				if (_isArray(v.tweens)) {
					this.add(v.tweens, 0, v.align, v.stagger);
				}
			},
			_tinyNum = 0.0000000001,
			TweenLiteInternals = TweenLite._internals,
			_internals = TimelineLite._internals = {},
			_isSelector = TweenLiteInternals.isSelector,
			_isArray = TweenLiteInternals.isArray,
			_lazyTweens = TweenLiteInternals.lazyTweens,
			_lazyRender = TweenLiteInternals.lazyRender,
			_globals = _gsScope._gsDefine.globals,
			_copy = function(vars) {
				var copy = {}, p;
				for (p in vars) {
					copy[p] = vars[p];
				}
				return copy;
			},
			_applyCycle = function(vars, targets, i) {
				var alt = vars.cycle,
					p, val;
				for (p in alt) {
					val = alt[p];
					vars[p] = (typeof(val) === "function") ? val.call(targets[i], i) : val[i % val.length];
				}
				delete vars.cycle;
			},
			_pauseCallback = _internals.pauseCallback = function() {},
			_slice = function(a) { //don't use [].slice because that doesn't work in IE8 with a NodeList that's returned by querySelectorAll()
				var b = [],
					l = a.length,
					i;
				for (i = 0; i !== l; b.push(a[i++]));
				return b;
			},
			p = TimelineLite.prototype = new SimpleTimeline();

		TimelineLite.version = "1.18.2";
		p.constructor = TimelineLite;
		p.kill()._gc = p._forcingPlayhead = p._hasPause = false;

		/* might use later...
		//translates a local time inside an animation to the corresponding time on the root/global timeline, factoring in all nesting and timeScales.
		function localToGlobal(time, animation) {
			while (animation) {
				time = (time / animation._timeScale) + animation._startTime;
				animation = animation.timeline;
			}
			return time;
		}

		//translates the supplied time on the root/global timeline into the corresponding local time inside a particular animation, factoring in all nesting and timeScales
		function globalToLocal(time, animation) {
			var scale = 1;
			time -= localToGlobal(0, animation);
			while (animation) {
				scale *= animation._timeScale;
				animation = animation.timeline;
			}
			return time * scale;
		}
		*/

		p.to = function(target, duration, vars, position) {
			var Engine = (vars.repeat && _globals.TweenMax) || TweenLite;
			return duration ? this.add( new Engine(target, duration, vars), position) : this.set(target, vars, position);
		};

		p.from = function(target, duration, vars, position) {
			return this.add( ((vars.repeat && _globals.TweenMax) || TweenLite).from(target, duration, vars), position);
		};

		p.fromTo = function(target, duration, fromVars, toVars, position) {
			var Engine = (toVars.repeat && _globals.TweenMax) || TweenLite;
			return duration ? this.add( Engine.fromTo(target, duration, fromVars, toVars), position) : this.set(target, toVars, position);
		};

		p.staggerTo = function(targets, duration, vars, stagger, position, onCompleteAll, onCompleteAllParams, onCompleteAllScope) {
			var tl = new TimelineLite({onComplete:onCompleteAll, onCompleteParams:onCompleteAllParams, callbackScope:onCompleteAllScope, smoothChildTiming:this.smoothChildTiming}),
				cycle = vars.cycle,
				copy, i;
			if (typeof(targets) === "string") {
				targets = TweenLite.selector(targets) || targets;
			}
			targets = targets || [];
			if (_isSelector(targets)) { //senses if the targets object is a selector. If it is, we should translate it into an array.
				targets = _slice(targets);
			}
			stagger = stagger || 0;
			if (stagger < 0) {
				targets = _slice(targets);
				targets.reverse();
				stagger *= -1;
			}
			for (i = 0; i < targets.length; i++) {
				copy = _copy(vars);
				if (copy.startAt) {
					copy.startAt = _copy(copy.startAt);
					if (copy.startAt.cycle) {
						_applyCycle(copy.startAt, targets, i);
					}
				}
				if (cycle) {
					_applyCycle(copy, targets, i);
				}
				tl.to(targets[i], duration, copy, i * stagger);
			}
			return this.add(tl, position);
		};

		p.staggerFrom = function(targets, duration, vars, stagger, position, onCompleteAll, onCompleteAllParams, onCompleteAllScope) {
			vars.immediateRender = (vars.immediateRender != false);
			vars.runBackwards = true;
			return this.staggerTo(targets, duration, vars, stagger, position, onCompleteAll, onCompleteAllParams, onCompleteAllScope);
		};

		p.staggerFromTo = function(targets, duration, fromVars, toVars, stagger, position, onCompleteAll, onCompleteAllParams, onCompleteAllScope) {
			toVars.startAt = fromVars;
			toVars.immediateRender = (toVars.immediateRender != false && fromVars.immediateRender != false);
			return this.staggerTo(targets, duration, toVars, stagger, position, onCompleteAll, onCompleteAllParams, onCompleteAllScope);
		};

		p.call = function(callback, params, scope, position) {
			return this.add( TweenLite.delayedCall(0, callback, params, scope), position);
		};

		p.set = function(target, vars, position) {
			position = this._parseTimeOrLabel(position, 0, true);
			if (vars.immediateRender == null) {
				vars.immediateRender = (position === this._time && !this._paused);
			}
			return this.add( new TweenLite(target, 0, vars), position);
		};

		TimelineLite.exportRoot = function(vars, ignoreDelayedCalls) {
			vars = vars || {};
			if (vars.smoothChildTiming == null) {
				vars.smoothChildTiming = true;
			}
			var tl = new TimelineLite(vars),
				root = tl._timeline,
				tween, next;
			if (ignoreDelayedCalls == null) {
				ignoreDelayedCalls = true;
			}
			root._remove(tl, true);
			tl._startTime = 0;
			tl._rawPrevTime = tl._time = tl._totalTime = root._time;
			tween = root._first;
			while (tween) {
				next = tween._next;
				if (!ignoreDelayedCalls || !(tween instanceof TweenLite && tween.target === tween.vars.onComplete)) {
					tl.add(tween, tween._startTime - tween._delay);
				}
				tween = next;
			}
			root.add(tl, 0);
			return tl;
		};

		p.add = function(value, position, align, stagger) {
			var curTime, l, i, child, tl, beforeRawTime;
			if (typeof(position) !== "number") {
				position = this._parseTimeOrLabel(position, 0, true, value);
			}
			if (!(value instanceof Animation)) {
				if ((value instanceof Array) || (value && value.push && _isArray(value))) {
					align = align || "normal";
					stagger = stagger || 0;
					curTime = position;
					l = value.length;
					for (i = 0; i < l; i++) {
						if (_isArray(child = value[i])) {
							child = new TimelineLite({tweens:child});
						}
						this.add(child, curTime);
						if (typeof(child) !== "string" && typeof(child) !== "function") {
							if (align === "sequence") {
								curTime = child._startTime + (child.totalDuration() / child._timeScale);
							} else if (align === "start") {
								child._startTime -= child.delay();
							}
						}
						curTime += stagger;
					}
					return this._uncache(true);
				} else if (typeof(value) === "string") {
					return this.addLabel(value, position);
				} else if (typeof(value) === "function") {
					value = TweenLite.delayedCall(0, value);
				} else {
					throw("Cannot add " + value + " into the timeline; it is not a tween, timeline, function, or string.");
				}
			}

			SimpleTimeline.prototype.add.call(this, value, position);

			//if the timeline has already ended but the inserted tween/timeline extends the duration, we should enable this timeline again so that it renders properly. We should also align the playhead with the parent timeline's when appropriate.
			if (this._gc || this._time === this._duration) if (!this._paused) if (this._duration < this.duration()) {
				//in case any of the ancestors had completed but should now be enabled...
				tl = this;
				beforeRawTime = (tl.rawTime() > value._startTime); //if the tween is placed on the timeline so that it starts BEFORE the current rawTime, we should align the playhead (move the timeline). This is because sometimes users will create a timeline, let it finish, and much later append a tween and expect it to run instead of jumping to its end state. While technically one could argue that it should jump to its end state, that's not what users intuitively expect.
				while (tl._timeline) {
					if (beforeRawTime && tl._timeline.smoothChildTiming) {
						tl.totalTime(tl._totalTime, true); //moves the timeline (shifts its startTime) if necessary, and also enables it.
					} else if (tl._gc) {
						tl._enabled(true, false);
					}
					tl = tl._timeline;
				}
			}

			return this;
		};

		p.remove = function(value) {
			if (value instanceof Animation) {
				this._remove(value, false);
				var tl = value._timeline = value.vars.useFrames ? Animation._rootFramesTimeline : Animation._rootTimeline; //now that it's removed, default it to the root timeline so that if it gets played again, it doesn't jump back into this timeline.
				value._startTime = (value._paused ? value._pauseTime : tl._time) - ((!value._reversed ? value._totalTime : value.totalDuration() - value._totalTime) / value._timeScale); //ensure that if it gets played again, the timing is correct.
				return this;
			} else if (value instanceof Array || (value && value.push && _isArray(value))) {
				var i = value.length;
				while (--i > -1) {
					this.remove(value[i]);
				}
				return this;
			} else if (typeof(value) === "string") {
				return this.removeLabel(value);
			}
			return this.kill(null, value);
		};

		p._remove = function(tween, skipDisable) {
			SimpleTimeline.prototype._remove.call(this, tween, skipDisable);
			var last = this._last;
			if (!last) {
				this._time = this._totalTime = this._duration = this._totalDuration = 0;
			} else if (this._time > last._startTime + last._totalDuration / last._timeScale) {
				this._time = this.duration();
				this._totalTime = this._totalDuration;
			}
			return this;
		};

		p.append = function(value, offsetOrLabel) {
			return this.add(value, this._parseTimeOrLabel(null, offsetOrLabel, true, value));
		};

		p.insert = p.insertMultiple = function(value, position, align, stagger) {
			return this.add(value, position || 0, align, stagger);
		};

		p.appendMultiple = function(tweens, offsetOrLabel, align, stagger) {
			return this.add(tweens, this._parseTimeOrLabel(null, offsetOrLabel, true, tweens), align, stagger);
		};

		p.addLabel = function(label, position) {
			this._labels[label] = this._parseTimeOrLabel(position);
			return this;
		};

		p.addPause = function(position, callback, params, scope) {
			var t = TweenLite.delayedCall(0, _pauseCallback, params, scope || this);
			t.vars.onComplete = t.vars.onReverseComplete = callback;
			t.data = "isPause";
			this._hasPause = true;
			return this.add(t, position);
		};

		p.removeLabel = function(label) {
			delete this._labels[label];
			return this;
		};

		p.getLabelTime = function(label) {
			return (this._labels[label] != null) ? this._labels[label] : -1;
		};

		p._parseTimeOrLabel = function(timeOrLabel, offsetOrLabel, appendIfAbsent, ignore) {
			var i;
			//if we're about to add a tween/timeline (or an array of them) that's already a child of this timeline, we should remove it first so that it doesn't contaminate the duration().
			if (ignore instanceof Animation && ignore.timeline === this) {
				this.remove(ignore);
			} else if (ignore && ((ignore instanceof Array) || (ignore.push && _isArray(ignore)))) {
				i = ignore.length;
				while (--i > -1) {
					if (ignore[i] instanceof Animation && ignore[i].timeline === this) {
						this.remove(ignore[i]);
					}
				}
			}
			if (typeof(offsetOrLabel) === "string") {
				return this._parseTimeOrLabel(offsetOrLabel, (appendIfAbsent && typeof(timeOrLabel) === "number" && this._labels[offsetOrLabel] == null) ? timeOrLabel - this.duration() : 0, appendIfAbsent);
			}
			offsetOrLabel = offsetOrLabel || 0;
			if (typeof(timeOrLabel) === "string" && (isNaN(timeOrLabel) || this._labels[timeOrLabel] != null)) { //if the string is a number like "1", check to see if there's a label with that name, otherwise interpret it as a number (absolute value).
				i = timeOrLabel.indexOf("=");
				if (i === -1) {
					if (this._labels[timeOrLabel] == null) {
						return appendIfAbsent ? (this._labels[timeOrLabel] = this.duration() + offsetOrLabel) : offsetOrLabel;
					}
					return this._labels[timeOrLabel] + offsetOrLabel;
				}
				offsetOrLabel = parseInt(timeOrLabel.charAt(i-1) + "1", 10) * Number(timeOrLabel.substr(i+1));
				timeOrLabel = (i > 1) ? this._parseTimeOrLabel(timeOrLabel.substr(0, i-1), 0, appendIfAbsent) : this.duration();
			} else if (timeOrLabel == null) {
				timeOrLabel = this.duration();
			}
			return Number(timeOrLabel) + offsetOrLabel;
		};

		p.seek = function(position, suppressEvents) {
			return this.totalTime((typeof(position) === "number") ? position : this._parseTimeOrLabel(position), (suppressEvents !== false));
		};

		p.stop = function() {
			return this.paused(true);
		};

		p.gotoAndPlay = function(position, suppressEvents) {
			return this.play(position, suppressEvents);
		};

		p.gotoAndStop = function(position, suppressEvents) {
			return this.pause(position, suppressEvents);
		};

		p.render = function(time, suppressEvents, force) {
			if (this._gc) {
				this._enabled(true, false);
			}
			var totalDur = (!this._dirty) ? this._totalDuration : this.totalDuration(),
				prevTime = this._time,
				prevStart = this._startTime,
				prevTimeScale = this._timeScale,
				prevPaused = this._paused,
				tween, isComplete, next, callback, internalForce, pauseTween, curTime;
			if (time >= totalDur - 0.0000001) { //to work around occasional floating point math artifacts.
				this._totalTime = this._time = totalDur;
				if (!this._reversed) if (!this._hasPausedChild()) {
					isComplete = true;
					callback = "onComplete";
					internalForce = !!this._timeline.autoRemoveChildren; //otherwise, if the animation is unpaused/activated after it's already finished, it doesn't get removed from the parent timeline.
					if (this._duration === 0) if ((time <= 0 && time >= -0.0000001) || this._rawPrevTime < 0 || this._rawPrevTime === _tinyNum) if (this._rawPrevTime !== time && this._first) {
						internalForce = true;
						if (this._rawPrevTime > _tinyNum) {
							callback = "onReverseComplete";
						}
					}
				}
				this._rawPrevTime = (this._duration || !suppressEvents || time || this._rawPrevTime === time) ? time : _tinyNum; //when the playhead arrives at EXACTLY time 0 (right on top) of a zero-duration timeline or tween, we need to discern if events are suppressed so that when the playhead moves again (next time), it'll trigger the callback. If events are NOT suppressed, obviously the callback would be triggered in this render. Basically, the callback should fire either when the playhead ARRIVES or LEAVES this exact spot, not both. Imagine doing a timeline.seek(0) and there's a callback that sits at 0. Since events are suppressed on that seek() by default, nothing will fire, but when the playhead moves off of that position, the callback should fire. This behavior is what people intuitively expect. We set the _rawPrevTime to be a precise tiny number to indicate this scenario rather than using another property/variable which would increase memory usage. This technique is less readable, but more efficient.
				time = totalDur + 0.0001; //to avoid occasional floating point rounding errors - sometimes child tweens/timelines were not being fully completed (their progress might be 0.999999999999998 instead of 1 because when _time - tween._startTime is performed, floating point errors would return a value that was SLIGHTLY off). Try (999999999999.7 - 999999999999) * 1 = 0.699951171875 instead of 0.7.

			} else if (time < 0.0000001) { //to work around occasional floating point math artifacts, round super small values to 0.
				this._totalTime = this._time = 0;
				if (prevTime !== 0 || (this._duration === 0 && this._rawPrevTime !== _tinyNum && (this._rawPrevTime > 0 || (time < 0 && this._rawPrevTime >= 0)))) {
					callback = "onReverseComplete";
					isComplete = this._reversed;
				}
				if (time < 0) {
					this._active = false;
					if (this._timeline.autoRemoveChildren && this._reversed) { //ensures proper GC if a timeline is resumed after it's finished reversing.
						internalForce = isComplete = true;
						callback = "onReverseComplete";
					} else if (this._rawPrevTime >= 0 && this._first) { //when going back beyond the start, force a render so that zero-duration tweens that sit at the very beginning render their start values properly. Otherwise, if the parent timeline's playhead lands exactly at this timeline's startTime, and then moves backwards, the zero-duration tweens at the beginning would still be at their end state.
						internalForce = true;
					}
					this._rawPrevTime = time;
				} else {
					this._rawPrevTime = (this._duration || !suppressEvents || time || this._rawPrevTime === time) ? time : _tinyNum; //when the playhead arrives at EXACTLY time 0 (right on top) of a zero-duration timeline or tween, we need to discern if events are suppressed so that when the playhead moves again (next time), it'll trigger the callback. If events are NOT suppressed, obviously the callback would be triggered in this render. Basically, the callback should fire either when the playhead ARRIVES or LEAVES this exact spot, not both. Imagine doing a timeline.seek(0) and there's a callback that sits at 0. Since events are suppressed on that seek() by default, nothing will fire, but when the playhead moves off of that position, the callback should fire. This behavior is what people intuitively expect. We set the _rawPrevTime to be a precise tiny number to indicate this scenario rather than using another property/variable which would increase memory usage. This technique is less readable, but more efficient.
					if (time === 0 && isComplete) { //if there's a zero-duration tween at the very beginning of a timeline and the playhead lands EXACTLY at time 0, that tween will correctly render its end values, but we need to keep the timeline alive for one more render so that the beginning values render properly as the parent's playhead keeps moving beyond the begining. Imagine obj.x starts at 0 and then we do tl.set(obj, {x:100}).to(obj, 1, {x:200}) and then later we tl.reverse()...the goal is to have obj.x revert to 0. If the playhead happens to land on exactly 0, without this chunk of code, it'd complete the timeline and remove it from the rendering queue (not good).
						tween = this._first;
						while (tween && tween._startTime === 0) {
							if (!tween._duration) {
								isComplete = false;
							}
							tween = tween._next;
						}
					}
					time = 0; //to avoid occasional floating point rounding errors (could cause problems especially with zero-duration tweens at the very beginning of the timeline)
					if (!this._initted) {
						internalForce = true;
					}
				}

			} else {

				if (this._hasPause && !this._forcingPlayhead && !suppressEvents) {
					if (time >= prevTime) {
						tween = this._first;
						while (tween && tween._startTime <= time && !pauseTween) {
							if (!tween._duration) if (tween.data === "isPause" && !tween.ratio && !(tween._startTime === 0 && this._rawPrevTime === 0)) {
								pauseTween = tween;
							}
							tween = tween._next;
						}
					} else {
						tween = this._last;
						while (tween && tween._startTime >= time && !pauseTween) {
							if (!tween._duration) if (tween.data === "isPause" && tween._rawPrevTime > 0) {
								pauseTween = tween;
							}
							tween = tween._prev;
						}
					}
					if (pauseTween) {
						this._time = time = pauseTween._startTime;
						this._totalTime = time + (this._cycle * (this._totalDuration + this._repeatDelay));
					}
				}

				this._totalTime = this._time = this._rawPrevTime = time;
			}
			if ((this._time === prevTime || !this._first) && !force && !internalForce && !pauseTween) {
				return;
			} else if (!this._initted) {
				this._initted = true;
			}

			if (!this._active) if (!this._paused && this._time !== prevTime && time > 0) {
				this._active = true;  //so that if the user renders the timeline (as opposed to the parent timeline rendering it), it is forced to re-render and align it with the proper time/frame on the next rendering cycle. Maybe the timeline already finished but the user manually re-renders it as halfway done, for example.
			}

			if (prevTime === 0) if (this.vars.onStart) if (this._time !== 0) if (!suppressEvents) {
				this._callback("onStart");
			}

			curTime = this._time;
			if (curTime >= prevTime) {
				tween = this._first;
				while (tween) {
					next = tween._next; //record it here because the value could change after rendering...
					if (curTime !== this._time || (this._paused && !prevPaused)) { //in case a tween pauses or seeks the timeline when rendering, like inside of an onUpdate/onComplete
						break;
					} else if (tween._active || (tween._startTime <= curTime && !tween._paused && !tween._gc)) {
						if (pauseTween === tween) {
							this.pause();
						}
						if (!tween._reversed) {
							tween.render((time - tween._startTime) * tween._timeScale, suppressEvents, force);
						} else {
							tween.render(((!tween._dirty) ? tween._totalDuration : tween.totalDuration()) - ((time - tween._startTime) * tween._timeScale), suppressEvents, force);
						}
					}
					tween = next;
				}
			} else {
				tween = this._last;
				while (tween) {
					next = tween._prev; //record it here because the value could change after rendering...
					if (curTime !== this._time || (this._paused && !prevPaused)) { //in case a tween pauses or seeks the timeline when rendering, like inside of an onUpdate/onComplete
						break;
					} else if (tween._active || (tween._startTime <= prevTime && !tween._paused && !tween._gc)) {
						if (pauseTween === tween) {
							pauseTween = tween._prev; //the linked list is organized by _startTime, thus it's possible that a tween could start BEFORE the pause and end after it, in which case it would be positioned before the pause tween in the linked list, but we should render it before we pause() the timeline and cease rendering. This is only a concern when going in reverse.
							while (pauseTween && pauseTween.endTime() > this._time) {
								pauseTween.render( (pauseTween._reversed ? pauseTween.totalDuration() - ((time - pauseTween._startTime) * pauseTween._timeScale) : (time - pauseTween._startTime) * pauseTween._timeScale), suppressEvents, force);
								pauseTween = pauseTween._prev;
							}
							pauseTween = null;
							this.pause();
						}
						if (!tween._reversed) {
							tween.render((time - tween._startTime) * tween._timeScale, suppressEvents, force);
						} else {
							tween.render(((!tween._dirty) ? tween._totalDuration : tween.totalDuration()) - ((time - tween._startTime) * tween._timeScale), suppressEvents, force);
						}
					}
					tween = next;
				}
			}

			if (this._onUpdate) if (!suppressEvents) {
				if (_lazyTweens.length) { //in case rendering caused any tweens to lazy-init, we should render them because typically when a timeline finishes, users expect things to have rendered fully. Imagine an onUpdate on a timeline that reports/checks tweened values.
					_lazyRender();
				}
				this._callback("onUpdate");
			}

			if (callback) if (!this._gc) if (prevStart === this._startTime || prevTimeScale !== this._timeScale) if (this._time === 0 || totalDur >= this.totalDuration()) { //if one of the tweens that was rendered altered this timeline's startTime (like if an onComplete reversed the timeline), it probably isn't complete. If it is, don't worry, because whatever call altered the startTime would complete if it was necessary at the new time. The only exception is the timeScale property. Also check _gc because there's a chance that kill() could be called in an onUpdate
				if (isComplete) {
					if (_lazyTweens.length) { //in case rendering caused any tweens to lazy-init, we should render them because typically when a timeline finishes, users expect things to have rendered fully. Imagine an onComplete on a timeline that reports/checks tweened values.
						_lazyRender();
					}
					if (this._timeline.autoRemoveChildren) {
						this._enabled(false, false);
					}
					this._active = false;
				}
				if (!suppressEvents && this.vars[callback]) {
					this._callback(callback);
				}
			}
		};

		p._hasPausedChild = function() {
			var tween = this._first;
			while (tween) {
				if (tween._paused || ((tween instanceof TimelineLite) && tween._hasPausedChild())) {
					return true;
				}
				tween = tween._next;
			}
			return false;
		};

		p.getChildren = function(nested, tweens, timelines, ignoreBeforeTime) {
			ignoreBeforeTime = ignoreBeforeTime || -9999999999;
			var a = [],
				tween = this._first,
				cnt = 0;
			while (tween) {
				if (tween._startTime < ignoreBeforeTime) {
					//do nothing
				} else if (tween instanceof TweenLite) {
					if (tweens !== false) {
						a[cnt++] = tween;
					}
				} else {
					if (timelines !== false) {
						a[cnt++] = tween;
					}
					if (nested !== false) {
						a = a.concat(tween.getChildren(true, tweens, timelines));
						cnt = a.length;
					}
				}
				tween = tween._next;
			}
			return a;
		};

		p.getTweensOf = function(target, nested) {
			var disabled = this._gc,
				a = [],
				cnt = 0,
				tweens, i;
			if (disabled) {
				this._enabled(true, true); //getTweensOf() filters out disabled tweens, and we have to mark them as _gc = true when the timeline completes in order to allow clean garbage collection, so temporarily re-enable the timeline here.
			}
			tweens = TweenLite.getTweensOf(target);
			i = tweens.length;
			while (--i > -1) {
				if (tweens[i].timeline === this || (nested && this._contains(tweens[i]))) {
					a[cnt++] = tweens[i];
				}
			}
			if (disabled) {
				this._enabled(false, true);
			}
			return a;
		};

		p.recent = function() {
			return this._recent;
		};

		p._contains = function(tween) {
			var tl = tween.timeline;
			while (tl) {
				if (tl === this) {
					return true;
				}
				tl = tl.timeline;
			}
			return false;
		};

		p.shiftChildren = function(amount, adjustLabels, ignoreBeforeTime) {
			ignoreBeforeTime = ignoreBeforeTime || 0;
			var tween = this._first,
				labels = this._labels,
				p;
			while (tween) {
				if (tween._startTime >= ignoreBeforeTime) {
					tween._startTime += amount;
				}
				tween = tween._next;
			}
			if (adjustLabels) {
				for (p in labels) {
					if (labels[p] >= ignoreBeforeTime) {
						labels[p] += amount;
					}
				}
			}
			return this._uncache(true);
		};

		p._kill = function(vars, target) {
			if (!vars && !target) {
				return this._enabled(false, false);
			}
			var tweens = (!target) ? this.getChildren(true, true, false) : this.getTweensOf(target),
				i = tweens.length,
				changed = false;
			while (--i > -1) {
				if (tweens[i]._kill(vars, target)) {
					changed = true;
				}
			}
			return changed;
		};

		p.clear = function(labels) {
			var tweens = this.getChildren(false, true, true),
				i = tweens.length;
			this._time = this._totalTime = 0;
			while (--i > -1) {
				tweens[i]._enabled(false, false);
			}
			if (labels !== false) {
				this._labels = {};
			}
			return this._uncache(true);
		};

		p.invalidate = function() {
			var tween = this._first;
			while (tween) {
				tween.invalidate();
				tween = tween._next;
			}
			return Animation.prototype.invalidate.call(this);;
		};

		p._enabled = function(enabled, ignoreTimeline) {
			if (enabled === this._gc) {
				var tween = this._first;
				while (tween) {
					tween._enabled(enabled, true);
					tween = tween._next;
				}
			}
			return SimpleTimeline.prototype._enabled.call(this, enabled, ignoreTimeline);
		};

		p.totalTime = function(time, suppressEvents, uncapped) {
			this._forcingPlayhead = true;
			var val = Animation.prototype.totalTime.apply(this, arguments);
			this._forcingPlayhead = false;
			return val;
		};

		p.duration = function(value) {
			if (!arguments.length) {
				if (this._dirty) {
					this.totalDuration(); //just triggers recalculation
				}
				return this._duration;
			}
			if (this.duration() !== 0 && value !== 0) {
				this.timeScale(this._duration / value);
			}
			return this;
		};

		p.totalDuration = function(value) {
			if (!arguments.length) {
				if (this._dirty) {
					var max = 0,
						tween = this._last,
						prevStart = 999999999999,
						prev, end;
					while (tween) {
						prev = tween._prev; //record it here in case the tween changes position in the sequence...
						if (tween._dirty) {
							tween.totalDuration(); //could change the tween._startTime, so make sure the tween's cache is clean before analyzing it.
						}
						if (tween._startTime > prevStart && this._sortChildren && !tween._paused) { //in case one of the tweens shifted out of order, it needs to be re-inserted into the correct position in the sequence
							this.add(tween, tween._startTime - tween._delay);
						} else {
							prevStart = tween._startTime;
						}
						if (tween._startTime < 0 && !tween._paused) { //children aren't allowed to have negative startTimes unless smoothChildTiming is true, so adjust here if one is found.
							max -= tween._startTime;
							if (this._timeline.smoothChildTiming) {
								this._startTime += tween._startTime / this._timeScale;
							}
							this.shiftChildren(-tween._startTime, false, -9999999999);
							prevStart = 0;
						}
						end = tween._startTime + (tween._totalDuration / tween._timeScale);
						if (end > max) {
							max = end;
						}
						tween = prev;
					}
					this._duration = this._totalDuration = max;
					this._dirty = false;
				}
				return this._totalDuration;
			}
			return (value && this.totalDuration()) ? this.timeScale(this._totalDuration / value) : this;
		};

		p.paused = function(value) {
			if (!value) { //if there's a pause directly at the spot from where we're unpausing, skip it.
				var tween = this._first,
					time = this._time;
				while (tween) {
					if (tween._startTime === time && tween.data === "isPause") {
						tween._rawPrevTime = 0; //remember, _rawPrevTime is how zero-duration tweens/callbacks sense directionality and determine whether or not to fire. If _rawPrevTime is the same as _startTime on the next render, it won't fire.
					}
					tween = tween._next;
				}
			}
			return Animation.prototype.paused.apply(this, arguments);
		};

		p.usesFrames = function() {
			var tl = this._timeline;
			while (tl._timeline) {
				tl = tl._timeline;
			}
			return (tl === Animation._rootFramesTimeline);
		};

		p.rawTime = function() {
			return this._paused ? this._totalTime : (this._timeline.rawTime() - this._startTime) * this._timeScale;
		};

		return TimelineLite;

	}, true);








	
	
	
	
	
/*
 * ----------------------------------------------------------------
 * TimelineMax
 * ----------------------------------------------------------------
 */
	_gsScope._gsDefine("TimelineMax", ["TimelineLite","TweenLite","easing.Ease"], function(TimelineLite, TweenLite, Ease) {

		var TimelineMax = function(vars) {
				TimelineLite.call(this, vars);
				this._repeat = this.vars.repeat || 0;
				this._repeatDelay = this.vars.repeatDelay || 0;
				this._cycle = 0;
				this._yoyo = (this.vars.yoyo === true);
				this._dirty = true;
			},
			_tinyNum = 0.0000000001,
			TweenLiteInternals = TweenLite._internals,
			_lazyTweens = TweenLiteInternals.lazyTweens,
			_lazyRender = TweenLiteInternals.lazyRender,
			_easeNone = new Ease(null, null, 1, 0),
			p = TimelineMax.prototype = new TimelineLite();

		p.constructor = TimelineMax;
		p.kill()._gc = false;
		TimelineMax.version = "1.18.2";

		p.invalidate = function() {
			this._yoyo = (this.vars.yoyo === true);
			this._repeat = this.vars.repeat || 0;
			this._repeatDelay = this.vars.repeatDelay || 0;
			this._uncache(true);
			return TimelineLite.prototype.invalidate.call(this);
		};

		p.addCallback = function(callback, position, params, scope) {
			return this.add( TweenLite.delayedCall(0, callback, params, scope), position);
		};

		p.removeCallback = function(callback, position) {
			if (callback) {
				if (position == null) {
					this._kill(null, callback);
				} else {
					var a = this.getTweensOf(callback, false),
						i = a.length,
						time = this._parseTimeOrLabel(position);
					while (--i > -1) {
						if (a[i]._startTime === time) {
							a[i]._enabled(false, false);
						}
					}
				}
			}
			return this;
		};

		p.removePause = function(position) {
			return this.removeCallback(TimelineLite._internals.pauseCallback, position);
		};

		p.tweenTo = function(position, vars) {
			vars = vars || {};
			var copy = {ease:_easeNone, useFrames:this.usesFrames(), immediateRender:false},
				duration, p, t;
			for (p in vars) {
				copy[p] = vars[p];
			}
			copy.time = this._parseTimeOrLabel(position);
			duration = (Math.abs(Number(copy.time) - this._time) / this._timeScale) || 0.001;
			t = new TweenLite(this, duration, copy);
			copy.onStart = function() {
				t.target.paused(true);
				if (t.vars.time !== t.target.time() && duration === t.duration()) { //don't make the duration zero - if it's supposed to be zero, don't worry because it's already initting the tween and will complete immediately, effectively making the duration zero anyway. If we make duration zero, the tween won't run at all.
					t.duration( Math.abs( t.vars.time - t.target.time()) / t.target._timeScale );
				}
				if (vars.onStart) { //in case the user had an onStart in the vars - we don't want to overwrite it.
					t._callback("onStart");
				}
			};
			return t;
		};

		p.tweenFromTo = function(fromPosition, toPosition, vars) {
			vars = vars || {};
			fromPosition = this._parseTimeOrLabel(fromPosition);
			vars.startAt = {onComplete:this.seek, onCompleteParams:[fromPosition], callbackScope:this};
			vars.immediateRender = (vars.immediateRender !== false);
			var t = this.tweenTo(toPosition, vars);
			return t.duration((Math.abs( t.vars.time - fromPosition) / this._timeScale) || 0.001);
		};

		p.render = function(time, suppressEvents, force) {
			if (this._gc) {
				this._enabled(true, false);
			}
			var totalDur = (!this._dirty) ? this._totalDuration : this.totalDuration(),
				dur = this._duration,
				prevTime = this._time,
				prevTotalTime = this._totalTime,
				prevStart = this._startTime,
				prevTimeScale = this._timeScale,
				prevRawPrevTime = this._rawPrevTime,
				prevPaused = this._paused,
				prevCycle = this._cycle,
				tween, isComplete, next, callback, internalForce, cycleDuration, pauseTween, curTime;
			if (time >= totalDur - 0.0000001) { //to work around occasional floating point math artifacts.
				if (!this._locked) {
					this._totalTime = totalDur;
					this._cycle = this._repeat;
				}
				if (!this._reversed) if (!this._hasPausedChild()) {
					isComplete = true;
					callback = "onComplete";
					internalForce = !!this._timeline.autoRemoveChildren; //otherwise, if the animation is unpaused/activated after it's already finished, it doesn't get removed from the parent timeline.
					if (this._duration === 0) if ((time <= 0 && time >= -0.0000001) || prevRawPrevTime < 0 || prevRawPrevTime === _tinyNum) if (prevRawPrevTime !== time && this._first) {
						internalForce = true;
						if (prevRawPrevTime > _tinyNum) {
							callback = "onReverseComplete";
						}
					}
				}
				this._rawPrevTime = (this._duration || !suppressEvents || time || this._rawPrevTime === time) ? time : _tinyNum; //when the playhead arrives at EXACTLY time 0 (right on top) of a zero-duration timeline or tween, we need to discern if events are suppressed so that when the playhead moves again (next time), it'll trigger the callback. If events are NOT suppressed, obviously the callback would be triggered in this render. Basically, the callback should fire either when the playhead ARRIVES or LEAVES this exact spot, not both. Imagine doing a timeline.seek(0) and there's a callback that sits at 0. Since events are suppressed on that seek() by default, nothing will fire, but when the playhead moves off of that position, the callback should fire. This behavior is what people intuitively expect. We set the _rawPrevTime to be a precise tiny number to indicate this scenario rather than using another property/variable which would increase memory usage. This technique is less readable, but more efficient.
				if (this._yoyo && (this._cycle & 1) !== 0) {
					this._time = time = 0;
				} else {
					this._time = dur;
					time = dur + 0.0001; //to avoid occasional floating point rounding errors - sometimes child tweens/timelines were not being fully completed (their progress might be 0.999999999999998 instead of 1 because when _time - tween._startTime is performed, floating point errors would return a value that was SLIGHTLY off). Try (999999999999.7 - 999999999999) * 1 = 0.699951171875 instead of 0.7. We cannot do less then 0.0001 because the same issue can occur when the duration is extremely large like 999999999999 in which case adding 0.00000001, for example, causes it to act like nothing was added.
				}

			} else if (time < 0.0000001) { //to work around occasional floating point math artifacts, round super small values to 0.
				if (!this._locked) {
					this._totalTime = this._cycle = 0;
				}
				this._time = 0;
				if (prevTime !== 0 || (dur === 0 && prevRawPrevTime !== _tinyNum && (prevRawPrevTime > 0 || (time < 0 && prevRawPrevTime >= 0)) && !this._locked)) { //edge case for checking time < 0 && prevRawPrevTime >= 0: a zero-duration fromTo() tween inside a zero-duration timeline (yeah, very rare)
					callback = "onReverseComplete";
					isComplete = this._reversed;
				}
				if (time < 0) {
					this._active = false;
					if (this._timeline.autoRemoveChildren && this._reversed) {
						internalForce = isComplete = true;
						callback = "onReverseComplete";
					} else if (prevRawPrevTime >= 0 && this._first) { //when going back beyond the start, force a render so that zero-duration tweens that sit at the very beginning render their start values properly. Otherwise, if the parent timeline's playhead lands exactly at this timeline's startTime, and then moves backwards, the zero-duration tweens at the beginning would still be at their end state.
						internalForce = true;
					}
					this._rawPrevTime = time;
				} else {
					this._rawPrevTime = (dur || !suppressEvents || time || this._rawPrevTime === time) ? time : _tinyNum; //when the playhead arrives at EXACTLY time 0 (right on top) of a zero-duration timeline or tween, we need to discern if events are suppressed so that when the playhead moves again (next time), it'll trigger the callback. If events are NOT suppressed, obviously the callback would be triggered in this render. Basically, the callback should fire either when the playhead ARRIVES or LEAVES this exact spot, not both. Imagine doing a timeline.seek(0) and there's a callback that sits at 0. Since events are suppressed on that seek() by default, nothing will fire, but when the playhead moves off of that position, the callback should fire. This behavior is what people intuitively expect. We set the _rawPrevTime to be a precise tiny number to indicate this scenario rather than using another property/variable which would increase memory usage. This technique is less readable, but more efficient.
					if (time === 0 && isComplete) { //if there's a zero-duration tween at the very beginning of a timeline and the playhead lands EXACTLY at time 0, that tween will correctly render its end values, but we need to keep the timeline alive for one more render so that the beginning values render properly as the parent's playhead keeps moving beyond the begining. Imagine obj.x starts at 0 and then we do tl.set(obj, {x:100}).to(obj, 1, {x:200}) and then later we tl.reverse()...the goal is to have obj.x revert to 0. If the playhead happens to land on exactly 0, without this chunk of code, it'd complete the timeline and remove it from the rendering queue (not good).
						tween = this._first;
						while (tween && tween._startTime === 0) {
							if (!tween._duration) {
								isComplete = false;
							}
							tween = tween._next;
						}
					}
					time = 0; //to avoid occasional floating point rounding errors (could cause problems especially with zero-duration tweens at the very beginning of the timeline)
					if (!this._initted) {
						internalForce = true;
					}
				}

			} else {
				if (dur === 0 && prevRawPrevTime < 0) { //without this, zero-duration repeating timelines (like with a simple callback nested at the very beginning and a repeatDelay) wouldn't render the first time through.
					internalForce = true;
				}
				this._time = this._rawPrevTime = time;
				if (!this._locked) {
					this._totalTime = time;
					if (this._repeat !== 0) {
						cycleDuration = dur + this._repeatDelay;
						this._cycle = (this._totalTime / cycleDuration) >> 0; //originally _totalTime % cycleDuration but floating point errors caused problems, so I normalized it. (4 % 0.8 should be 0 but it gets reported as 0.79999999!)
						if (this._cycle !== 0) if (this._cycle === this._totalTime / cycleDuration) {
							this._cycle--; //otherwise when rendered exactly at the end time, it will act as though it is repeating (at the beginning)
						}
						this._time = this._totalTime - (this._cycle * cycleDuration);
						if (this._yoyo) if ((this._cycle & 1) !== 0) {
							this._time = dur - this._time;
						}
						if (this._time > dur) {
							this._time = dur;
							time = dur + 0.0001; //to avoid occasional floating point rounding error
						} else if (this._time < 0) {
							this._time = time = 0;
						} else {
							time = this._time;
						}
					}
				}

				if (this._hasPause && !this._forcingPlayhead && !suppressEvents) {
					time = this._time;
					if (time >= prevTime) {
						tween = this._first;
						while (tween && tween._startTime <= time && !pauseTween) {
							if (!tween._duration) if (tween.data === "isPause" && !tween.ratio && !(tween._startTime === 0 && this._rawPrevTime === 0)) {
								pauseTween = tween;
							}
							tween = tween._next;
						}
					} else {
						tween = this._last;
						while (tween && tween._startTime >= time && !pauseTween) {
							if (!tween._duration) if (tween.data === "isPause" && tween._rawPrevTime > 0) {
								pauseTween = tween;
							}
							tween = tween._prev;
						}
					}
					if (pauseTween) {
						this._time = time = pauseTween._startTime;
						this._totalTime = time + (this._cycle * (this._totalDuration + this._repeatDelay));
					}
				}

			}

			if (this._cycle !== prevCycle) if (!this._locked) {
				/*
				make sure children at the end/beginning of the timeline are rendered properly. If, for example,
				a 3-second long timeline rendered at 2.9 seconds previously, and now renders at 3.2 seconds (which
				would get transated to 2.8 seconds if the timeline yoyos or 0.2 seconds if it just repeats), there
				could be a callback or a short tween that's at 2.95 or 3 seconds in which wouldn't render. So
				we need to push the timeline to the end (and/or beginning depending on its yoyo value). Also we must
				ensure that zero-duration tweens at the very beginning or end of the TimelineMax work.
				*/
				var backwards = (this._yoyo && (prevCycle & 1) !== 0),
					wrap = (backwards === (this._yoyo && (this._cycle & 1) !== 0)),
					recTotalTime = this._totalTime,
					recCycle = this._cycle,
					recRawPrevTime = this._rawPrevTime,
					recTime = this._time;

				this._totalTime = prevCycle * dur;
				if (this._cycle < prevCycle) {
					backwards = !backwards;
				} else {
					this._totalTime += dur;
				}
				this._time = prevTime; //temporarily revert _time so that render() renders the children in the correct order. Without this, tweens won't rewind correctly. We could arhictect things in a "cleaner" way by splitting out the rendering queue into a separate method but for performance reasons, we kept it all inside this method.

				this._rawPrevTime = (dur === 0) ? prevRawPrevTime - 0.0001 : prevRawPrevTime;
				this._cycle = prevCycle;
				this._locked = true; //prevents changes to totalTime and skips repeat/yoyo behavior when we recursively call render()
				prevTime = (backwards) ? 0 : dur;
				this.render(prevTime, suppressEvents, (dur === 0));
				if (!suppressEvents) if (!this._gc) {
					if (this.vars.onRepeat) {
						this._callback("onRepeat");
					}
				}
				if (prevTime !== this._time) { //in case there's a callback like onComplete in a nested tween/timeline that changes the playhead position, like via seek(), we should just abort.
					return;
				}
				if (wrap) {
					prevTime = (backwards) ? dur + 0.0001 : -0.0001;
					this.render(prevTime, true, false);
				}
				this._locked = false;
				if (this._paused && !prevPaused) { //if the render() triggered callback that paused this timeline, we should abort (very rare, but possible)
					return;
				}
				this._time = recTime;
				this._totalTime = recTotalTime;
				this._cycle = recCycle;
				this._rawPrevTime = recRawPrevTime;
			}

			if ((this._time === prevTime || !this._first) && !force && !internalForce && !pauseTween) {
				if (prevTotalTime !== this._totalTime) if (this._onUpdate) if (!suppressEvents) { //so that onUpdate fires even during the repeatDelay - as long as the totalTime changed, we should trigger onUpdate.
					this._callback("onUpdate");
				}
				return;
			} else if (!this._initted) {
				this._initted = true;
			}

			if (!this._active) if (!this._paused && this._totalTime !== prevTotalTime && time > 0) {
				this._active = true;  //so that if the user renders the timeline (as opposed to the parent timeline rendering it), it is forced to re-render and align it with the proper time/frame on the next rendering cycle. Maybe the timeline already finished but the user manually re-renders it as halfway done, for example.
			}

			if (prevTotalTime === 0) if (this.vars.onStart) if (this._totalTime !== 0) if (!suppressEvents) {
				this._callback("onStart");
			}

			curTime = this._time;
			if (curTime >= prevTime) {
				tween = this._first;
				while (tween) {
					next = tween._next; //record it here because the value could change after rendering...
					if (curTime !== this._time || (this._paused && !prevPaused)) { //in case a tween pauses or seeks the timeline when rendering, like inside of an onUpdate/onComplete
						break;
					} else if (tween._active || (tween._startTime <= this._time && !tween._paused && !tween._gc)) {
						if (pauseTween === tween) {
							this.pause();
						}
						if (!tween._reversed) {
							tween.render((time - tween._startTime) * tween._timeScale, suppressEvents, force);
						} else {
							tween.render(((!tween._dirty) ? tween._totalDuration : tween.totalDuration()) - ((time - tween._startTime) * tween._timeScale), suppressEvents, force);
						}
					}
					tween = next;
				}
			} else {
				tween = this._last;
				while (tween) {
					next = tween._prev; //record it here because the value could change after rendering...
					if (curTime !== this._time || (this._paused && !prevPaused)) { //in case a tween pauses or seeks the timeline when rendering, like inside of an onUpdate/onComplete
						break;
					} else if (tween._active || (tween._startTime <= prevTime && !tween._paused && !tween._gc)) {
						if (pauseTween === tween) {
							pauseTween = tween._prev; //the linked list is organized by _startTime, thus it's possible that a tween could start BEFORE the pause and end after it, in which case it would be positioned before the pause tween in the linked list, but we should render it before we pause() the timeline and cease rendering. This is only a concern when going in reverse.
							while (pauseTween && pauseTween.endTime() > this._time) {
								pauseTween.render( (pauseTween._reversed ? pauseTween.totalDuration() - ((time - pauseTween._startTime) * pauseTween._timeScale) : (time - pauseTween._startTime) * pauseTween._timeScale), suppressEvents, force);
								pauseTween = pauseTween._prev;
							}
							pauseTween = null;
							this.pause();
						}
						if (!tween._reversed) {
							tween.render((time - tween._startTime) * tween._timeScale, suppressEvents, force);
						} else {
							tween.render(((!tween._dirty) ? tween._totalDuration : tween.totalDuration()) - ((time - tween._startTime) * tween._timeScale), suppressEvents, force);
						}
					}
					tween = next;
				}
			}

			if (this._onUpdate) if (!suppressEvents) {
				if (_lazyTweens.length) { //in case rendering caused any tweens to lazy-init, we should render them because typically when a timeline finishes, users expect things to have rendered fully. Imagine an onUpdate on a timeline that reports/checks tweened values.
					_lazyRender();
				}
				this._callback("onUpdate");
			}
			if (callback) if (!this._locked) if (!this._gc) if (prevStart === this._startTime || prevTimeScale !== this._timeScale) if (this._time === 0 || totalDur >= this.totalDuration()) { //if one of the tweens that was rendered altered this timeline's startTime (like if an onComplete reversed the timeline), it probably isn't complete. If it is, don't worry, because whatever call altered the startTime would complete if it was necessary at the new time. The only exception is the timeScale property. Also check _gc because there's a chance that kill() could be called in an onUpdate
				if (isComplete) {
					if (_lazyTweens.length) { //in case rendering caused any tweens to lazy-init, we should render them because typically when a timeline finishes, users expect things to have rendered fully. Imagine an onComplete on a timeline that reports/checks tweened values.
						_lazyRender();
					}
					if (this._timeline.autoRemoveChildren) {
						this._enabled(false, false);
					}
					this._active = false;
				}
				if (!suppressEvents && this.vars[callback]) {
					this._callback(callback);
				}
			}
		};

		p.getActive = function(nested, tweens, timelines) {
			if (nested == null) {
				nested = true;
			}
			if (tweens == null) {
				tweens = true;
			}
			if (timelines == null) {
				timelines = false;
			}
			var a = [],
				all = this.getChildren(nested, tweens, timelines),
				cnt = 0,
				l = all.length,
				i, tween;
			for (i = 0; i < l; i++) {
				tween = all[i];
				if (tween.isActive()) {
					a[cnt++] = tween;
				}
			}
			return a;
		};


		p.getLabelAfter = function(time) {
			if (!time) if (time !== 0) { //faster than isNan()
				time = this._time;
			}
			var labels = this.getLabelsArray(),
				l = labels.length,
				i;
			for (i = 0; i < l; i++) {
				if (labels[i].time > time) {
					return labels[i].name;
				}
			}
			return null;
		};

		p.getLabelBefore = function(time) {
			if (time == null) {
				time = this._time;
			}
			var labels = this.getLabelsArray(),
				i = labels.length;
			while (--i > -1) {
				if (labels[i].time < time) {
					return labels[i].name;
				}
			}
			return null;
		};

		p.getLabelsArray = function() {
			var a = [],
				cnt = 0,
				p;
			for (p in this._labels) {
				a[cnt++] = {time:this._labels[p], name:p};
			}
			a.sort(function(a,b) {
				return a.time - b.time;
			});
			return a;
		};


//---- GETTERS / SETTERS -------------------------------------------------------------------------------------------------------

		p.progress = function(value, suppressEvents) {
			return (!arguments.length) ? this._time / this.duration() : this.totalTime( this.duration() * ((this._yoyo && (this._cycle & 1) !== 0) ? 1 - value : value) + (this._cycle * (this._duration + this._repeatDelay)), suppressEvents);
		};

		p.totalProgress = function(value, suppressEvents) {
			return (!arguments.length) ? this._totalTime / this.totalDuration() : this.totalTime( this.totalDuration() * value, suppressEvents);
		};

		p.totalDuration = function(value) {
			if (!arguments.length) {
				if (this._dirty) {
					TimelineLite.prototype.totalDuration.call(this); //just forces refresh
					//Instead of Infinity, we use 999999999999 so that we can accommodate reverses.
					this._totalDuration = (this._repeat === -1) ? 999999999999 : this._duration * (this._repeat + 1) + (this._repeatDelay * this._repeat);
				}
				return this._totalDuration;
			}
			return (this._repeat === -1 || !value) ? this : this.timeScale( this.totalDuration() / value );
		};

		p.time = function(value, suppressEvents) {
			if (!arguments.length) {
				return this._time;
			}
			if (this._dirty) {
				this.totalDuration();
			}
			if (value > this._duration) {
				value = this._duration;
			}
			if (this._yoyo && (this._cycle & 1) !== 0) {
				value = (this._duration - value) + (this._cycle * (this._duration + this._repeatDelay));
			} else if (this._repeat !== 0) {
				value += this._cycle * (this._duration + this._repeatDelay);
			}
			return this.totalTime(value, suppressEvents);
		};

		p.repeat = function(value) {
			if (!arguments.length) {
				return this._repeat;
			}
			this._repeat = value;
			return this._uncache(true);
		};

		p.repeatDelay = function(value) {
			if (!arguments.length) {
				return this._repeatDelay;
			}
			this._repeatDelay = value;
			return this._uncache(true);
		};

		p.yoyo = function(value) {
			if (!arguments.length) {
				return this._yoyo;
			}
			this._yoyo = value;
			return this;
		};

		p.currentLabel = function(value) {
			if (!arguments.length) {
				return this.getLabelBefore(this._time + 0.00000001);
			}
			return this.seek(value, true);
		};

		return TimelineMax;

	}, true);
	




	
	
	
	
	
	
	
/*
 * ----------------------------------------------------------------
 * BezierPlugin
 * ----------------------------------------------------------------
 */
	(function() {

		var _RAD2DEG = 180 / Math.PI,
			_r1 = [],
			_r2 = [],
			_r3 = [],
			_corProps = {},
			_globals = _gsScope._gsDefine.globals,
			Segment = function(a, b, c, d) {
				this.a = a;
				this.b = b;
				this.c = c;
				this.d = d;
				this.da = d - a;
				this.ca = c - a;
				this.ba = b - a;
			},
			_correlate = ",x,y,z,left,top,right,bottom,marginTop,marginLeft,marginRight,marginBottom,paddingLeft,paddingTop,paddingRight,paddingBottom,backgroundPosition,backgroundPosition_y,",
			cubicToQuadratic = function(a, b, c, d) {
				var q1 = {a:a},
					q2 = {},
					q3 = {},
					q4 = {c:d},
					mab = (a + b) / 2,
					mbc = (b + c) / 2,
					mcd = (c + d) / 2,
					mabc = (mab + mbc) / 2,
					mbcd = (mbc + mcd) / 2,
					m8 = (mbcd - mabc) / 8;
				q1.b = mab + (a - mab) / 4;
				q2.b = mabc + m8;
				q1.c = q2.a = (q1.b + q2.b) / 2;
				q2.c = q3.a = (mabc + mbcd) / 2;
				q3.b = mbcd - m8;
				q4.b = mcd + (d - mcd) / 4;
				q3.c = q4.a = (q3.b + q4.b) / 2;
				return [q1, q2, q3, q4];
			},
			_calculateControlPoints = function(a, curviness, quad, basic, correlate) {
				var l = a.length - 1,
					ii = 0,
					cp1 = a[0].a,
					i, p1, p2, p3, seg, m1, m2, mm, cp2, qb, r1, r2, tl;
				for (i = 0; i < l; i++) {
					seg = a[ii];
					p1 = seg.a;
					p2 = seg.d;
					p3 = a[ii+1].d;

					if (correlate) {
						r1 = _r1[i];
						r2 = _r2[i];
						tl = ((r2 + r1) * curviness * 0.25) / (basic ? 0.5 : _r3[i] || 0.5);
						m1 = p2 - (p2 - p1) * (basic ? curviness * 0.5 : (r1 !== 0 ? tl / r1 : 0));
						m2 = p2 + (p3 - p2) * (basic ? curviness * 0.5 : (r2 !== 0 ? tl / r2 : 0));
						mm = p2 - (m1 + (((m2 - m1) * ((r1 * 3 / (r1 + r2)) + 0.5) / 4) || 0));
					} else {
						m1 = p2 - (p2 - p1) * curviness * 0.5;
						m2 = p2 + (p3 - p2) * curviness * 0.5;
						mm = p2 - (m1 + m2) / 2;
					}
					m1 += mm;
					m2 += mm;

					seg.c = cp2 = m1;
					if (i !== 0) {
						seg.b = cp1;
					} else {
						seg.b = cp1 = seg.a + (seg.c - seg.a) * 0.6; //instead of placing b on a exactly, we move it inline with c so that if the user specifies an ease like Back.easeIn or Elastic.easeIn which goes BEYOND the beginning, it will do so smoothly.
					}

					seg.da = p2 - p1;
					seg.ca = cp2 - p1;
					seg.ba = cp1 - p1;

					if (quad) {
						qb = cubicToQuadratic(p1, cp1, cp2, p2);
						a.splice(ii, 1, qb[0], qb[1], qb[2], qb[3]);
						ii += 4;
					} else {
						ii++;
					}

					cp1 = m2;
				}
				seg = a[ii];
				seg.b = cp1;
				seg.c = cp1 + (seg.d - cp1) * 0.4; //instead of placing c on d exactly, we move it inline with b so that if the user specifies an ease like Back.easeOut or Elastic.easeOut which goes BEYOND the end, it will do so smoothly.
				seg.da = seg.d - seg.a;
				seg.ca = seg.c - seg.a;
				seg.ba = cp1 - seg.a;
				if (quad) {
					qb = cubicToQuadratic(seg.a, cp1, seg.c, seg.d);
					a.splice(ii, 1, qb[0], qb[1], qb[2], qb[3]);
				}
			},
			_parseAnchors = function(values, p, correlate, prepend) {
				var a = [],
					l, i, p1, p2, p3, tmp;
				if (prepend) {
					values = [prepend].concat(values);
					i = values.length;
					while (--i > -1) {
						if (typeof( (tmp = values[i][p]) ) === "string") if (tmp.charAt(1) === "=") {
							values[i][p] = prepend[p] + Number(tmp.charAt(0) + tmp.substr(2)); //accommodate relative values. Do it inline instead of breaking it out into a function for speed reasons
						}
					}
				}
				l = values.length - 2;
				if (l < 0) {
					a[0] = new Segment(values[0][p], 0, 0, values[(l < -1) ? 0 : 1][p]);
					return a;
				}
				for (i = 0; i < l; i++) {
					p1 = values[i][p];
					p2 = values[i+1][p];
					a[i] = new Segment(p1, 0, 0, p2);
					if (correlate) {
						p3 = values[i+2][p];
						_r1[i] = (_r1[i] || 0) + (p2 - p1) * (p2 - p1);
						_r2[i] = (_r2[i] || 0) + (p3 - p2) * (p3 - p2);
					}
				}
				a[i] = new Segment(values[i][p], 0, 0, values[i+1][p]);
				return a;
			},
			bezierThrough = function(values, curviness, quadratic, basic, correlate, prepend) {
				var obj = {},
					props = [],
					first = prepend || values[0],
					i, p, a, j, r, l, seamless, last;
				correlate = (typeof(correlate) === "string") ? ","+correlate+"," : _correlate;
				if (curviness == null) {
					curviness = 1;
				}
				for (p in values[0]) {
					props.push(p);
				}
				//check to see if the last and first values are identical (well, within 0.05). If so, make seamless by appending the second element to the very end of the values array and the 2nd-to-last element to the very beginning (we'll remove those segments later)
				if (values.length > 1) {
					last = values[values.length - 1];
					seamless = true;
					i = props.length;
					while (--i > -1) {
						p = props[i];
						if (Math.abs(first[p] - last[p]) > 0.05) { //build in a tolerance of +/-0.05 to accommodate rounding errors. For example, if you set an object's position to 4.945, Flash will make it 4.9
							seamless = false;
							break;
						}
					}
					if (seamless) {
						values = values.concat(); //duplicate the array to avoid contaminating the original which the user may be reusing for other tweens
						if (prepend) {
							values.unshift(prepend);
						}
						values.push(values[1]);
						prepend = values[values.length - 3];
					}
				}
				_r1.length = _r2.length = _r3.length = 0;
				i = props.length;
				while (--i > -1) {
					p = props[i];
					_corProps[p] = (correlate.indexOf(","+p+",") !== -1);
					obj[p] = _parseAnchors(values, p, _corProps[p], prepend);
				}
				i = _r1.length;
				while (--i > -1) {
					_r1[i] = Math.sqrt(_r1[i]);
					_r2[i] = Math.sqrt(_r2[i]);
				}
				if (!basic) {
					i = props.length;
					while (--i > -1) {
						if (_corProps[p]) {
							a = obj[props[i]];
							l = a.length - 1;
							for (j = 0; j < l; j++) {
								r = a[j+1].da / _r2[j] + a[j].da / _r1[j];
								_r3[j] = (_r3[j] || 0) + r * r;
							}
						}
					}
					i = _r3.length;
					while (--i > -1) {
						_r3[i] = Math.sqrt(_r3[i]);
					}
				}
				i = props.length;
				j = quadratic ? 4 : 1;
				while (--i > -1) {
					p = props[i];
					a = obj[p];
					_calculateControlPoints(a, curviness, quadratic, basic, _corProps[p]); //this method requires that _parseAnchors() and _setSegmentRatios() ran first so that _r1, _r2, and _r3 values are populated for all properties
					if (seamless) {
						a.splice(0, j);
						a.splice(a.length - j, j);
					}
				}
				return obj;
			},
			_parseBezierData = function(values, type, prepend) {
				type = type || "soft";
				var obj = {},
					inc = (type === "cubic") ? 3 : 2,
					soft = (type === "soft"),
					props = [],
					a, b, c, d, cur, i, j, l, p, cnt, tmp;
				if (soft && prepend) {
					values = [prepend].concat(values);
				}
				if (values == null || values.length < inc + 1) { throw "invalid Bezier data"; }
				for (p in values[0]) {
					props.push(p);
				}
				i = props.length;
				while (--i > -1) {
					p = props[i];
					obj[p] = cur = [];
					cnt = 0;
					l = values.length;
					for (j = 0; j < l; j++) {
						a = (prepend == null) ? values[j][p] : (typeof( (tmp = values[j][p]) ) === "string" && tmp.charAt(1) === "=") ? prepend[p] + Number(tmp.charAt(0) + tmp.substr(2)) : Number(tmp);
						if (soft) if (j > 1) if (j < l - 1) {
							cur[cnt++] = (a + cur[cnt-2]) / 2;
						}
						cur[cnt++] = a;
					}
					l = cnt - inc + 1;
					cnt = 0;
					for (j = 0; j < l; j += inc) {
						a = cur[j];
						b = cur[j+1];
						c = cur[j+2];
						d = (inc === 2) ? 0 : cur[j+3];
						cur[cnt++] = tmp = (inc === 3) ? new Segment(a, b, c, d) : new Segment(a, (2 * b + a) / 3, (2 * b + c) / 3, c);
					}
					cur.length = cnt;
				}
				return obj;
			},
			_addCubicLengths = function(a, steps, resolution) {
				var inc = 1 / resolution,
					j = a.length,
					d, d1, s, da, ca, ba, p, i, inv, bez, index;
				while (--j > -1) {
					bez = a[j];
					s = bez.a;
					da = bez.d - s;
					ca = bez.c - s;
					ba = bez.b - s;
					d = d1 = 0;
					for (i = 1; i <= resolution; i++) {
						p = inc * i;
						inv = 1 - p;
						d = d1 - (d1 = (p * p * da + 3 * inv * (p * ca + inv * ba)) * p);
						index = j * resolution + i - 1;
						steps[index] = (steps[index] || 0) + d * d;
					}
				}
			},
			_parseLengthData = function(obj, resolution) {
				resolution = resolution >> 0 || 6;
				var a = [],
					lengths = [],
					d = 0,
					total = 0,
					threshold = resolution - 1,
					segments = [],
					curLS = [], //current length segments array
					p, i, l, index;
				for (p in obj) {
					_addCubicLengths(obj[p], a, resolution);
				}
				l = a.length;
				for (i = 0; i < l; i++) {
					d += Math.sqrt(a[i]);
					index = i % resolution;
					curLS[index] = d;
					if (index === threshold) {
						total += d;
						index = (i / resolution) >> 0;
						segments[index] = curLS;
						lengths[index] = total;
						d = 0;
						curLS = [];
					}
				}
				return {length:total, lengths:lengths, segments:segments};
			},



			BezierPlugin = _gsScope._gsDefine.plugin({
					propName: "bezier",
					priority: -1,
					version: "1.3.4",
					API: 2,
					global:true,

					//gets called when the tween renders for the first time. This is where initial values should be recorded and any setup routines should run.
					init: function(target, vars, tween) {
						this._target = target;
						if (vars instanceof Array) {
							vars = {values:vars};
						}
						this._func = {};
						this._round = {};
						this._props = [];
						this._timeRes = (vars.timeResolution == null) ? 6 : parseInt(vars.timeResolution, 10);
						var values = vars.values || [],
							first = {},
							second = values[0],
							autoRotate = vars.autoRotate || tween.vars.orientToBezier,
							p, isFunc, i, j, prepend;

						this._autoRotate = autoRotate ? (autoRotate instanceof Array) ? autoRotate : [["x","y","rotation",((autoRotate === true) ? 0 : Number(autoRotate) || 0)]] : null;
						for (p in second) {
							this._props.push(p);
						}

						i = this._props.length;
						while (--i > -1) {
							p = this._props[i];

							this._overwriteProps.push(p);
							isFunc = this._func[p] = (typeof(target[p]) === "function");
							first[p] = (!isFunc) ? parseFloat(target[p]) : target[ ((p.indexOf("set") || typeof(target["get" + p.substr(3)]) !== "function") ? p : "get" + p.substr(3)) ]();
							if (!prepend) if (first[p] !== values[0][p]) {
								prepend = first;
							}
						}
						this._beziers = (vars.type !== "cubic" && vars.type !== "quadratic" && vars.type !== "soft") ? bezierThrough(values, isNaN(vars.curviness) ? 1 : vars.curviness, false, (vars.type === "thruBasic"), vars.correlate, prepend) : _parseBezierData(values, vars.type, first);
						this._segCount = this._beziers[p].length;

						if (this._timeRes) {
							var ld = _parseLengthData(this._beziers, this._timeRes);
							this._length = ld.length;
							this._lengths = ld.lengths;
							this._segments = ld.segments;
							this._l1 = this._li = this._s1 = this._si = 0;
							this._l2 = this._lengths[0];
							this._curSeg = this._segments[0];
							this._s2 = this._curSeg[0];
							this._prec = 1 / this._curSeg.length;
						}

						if ((autoRotate = this._autoRotate)) {
							this._initialRotations = [];
							if (!(autoRotate[0] instanceof Array)) {
								this._autoRotate = autoRotate = [autoRotate];
							}
							i = autoRotate.length;
							while (--i > -1) {
								for (j = 0; j < 3; j++) {
									p = autoRotate[i][j];
									this._func[p] = (typeof(target[p]) === "function") ? target[ ((p.indexOf("set") || typeof(target["get" + p.substr(3)]) !== "function") ? p : "get" + p.substr(3)) ] : false;
								}
								p = autoRotate[i][2];
								this._initialRotations[i] = this._func[p] ? this._func[p].call(this._target) : this._target[p];
							}
						}
						this._startRatio = tween.vars.runBackwards ? 1 : 0; //we determine the starting ratio when the tween inits which is always 0 unless the tween has runBackwards:true (indicating it's a from() tween) in which case it's 1.
						return true;
					},

					//called each time the values should be updated, and the ratio gets passed as the only parameter (typically it's a value between 0 and 1, but it can exceed those when using an ease like Elastic.easeOut or Back.easeOut, etc.)
					set: function(v) {
						var segments = this._segCount,
							func = this._func,
							target = this._target,
							notStart = (v !== this._startRatio),
							curIndex, inv, i, p, b, t, val, l, lengths, curSeg;
						if (!this._timeRes) {
							curIndex = (v < 0) ? 0 : (v >= 1) ? segments - 1 : (segments * v) >> 0;
							t = (v - (curIndex * (1 / segments))) * segments;
						} else {
							lengths = this._lengths;
							curSeg = this._curSeg;
							v *= this._length;
							i = this._li;
							//find the appropriate segment (if the currently cached one isn't correct)
							if (v > this._l2 && i < segments - 1) {
								l = segments - 1;
								while (i < l && (this._l2 = lengths[++i]) <= v) {	}
								this._l1 = lengths[i-1];
								this._li = i;
								this._curSeg = curSeg = this._segments[i];
								this._s2 = curSeg[(this._s1 = this._si = 0)];
							} else if (v < this._l1 && i > 0) {
								while (i > 0 && (this._l1 = lengths[--i]) >= v) { }
								if (i === 0 && v < this._l1) {
									this._l1 = 0;
								} else {
									i++;
								}
								this._l2 = lengths[i];
								this._li = i;
								this._curSeg = curSeg = this._segments[i];
								this._s1 = curSeg[(this._si = curSeg.length - 1) - 1] || 0;
								this._s2 = curSeg[this._si];
							}
							curIndex = i;
							//now find the appropriate sub-segment (we split it into the number of pieces that was defined by "precision" and measured each one)
							v -= this._l1;
							i = this._si;
							if (v > this._s2 && i < curSeg.length - 1) {
								l = curSeg.length - 1;
								while (i < l && (this._s2 = curSeg[++i]) <= v) {	}
								this._s1 = curSeg[i-1];
								this._si = i;
							} else if (v < this._s1 && i > 0) {
								while (i > 0 && (this._s1 = curSeg[--i]) >= v) {	}
								if (i === 0 && v < this._s1) {
									this._s1 = 0;
								} else {
									i++;
								}
								this._s2 = curSeg[i];
								this._si = i;
							}
							t = (i + (v - this._s1) / (this._s2 - this._s1)) * this._prec;
						}
						inv = 1 - t;

						i = this._props.length;
						while (--i > -1) {
							p = this._props[i];
							b = this._beziers[p][curIndex];
							val = (t * t * b.da + 3 * inv * (t * b.ca + inv * b.ba)) * t + b.a;
							if (this._round[p]) {
								val = Math.round(val);
							}
							if (func[p]) {
								target[p](val);
							} else {
								target[p] = val;
							}
						}

						if (this._autoRotate) {
							var ar = this._autoRotate,
								b2, x1, y1, x2, y2, add, conv;
							i = ar.length;
							while (--i > -1) {
								p = ar[i][2];
								add = ar[i][3] || 0;
								conv = (ar[i][4] === true) ? 1 : _RAD2DEG;
								b = this._beziers[ar[i][0]];
								b2 = this._beziers[ar[i][1]];

								if (b && b2) { //in case one of the properties got overwritten.
									b = b[curIndex];
									b2 = b2[curIndex];

									x1 = b.a + (b.b - b.a) * t;
									x2 = b.b + (b.c - b.b) * t;
									x1 += (x2 - x1) * t;
									x2 += ((b.c + (b.d - b.c) * t) - x2) * t;

									y1 = b2.a + (b2.b - b2.a) * t;
									y2 = b2.b + (b2.c - b2.b) * t;
									y1 += (y2 - y1) * t;
									y2 += ((b2.c + (b2.d - b2.c) * t) - y2) * t;

									val = notStart ? Math.atan2(y2 - y1, x2 - x1) * conv + add : this._initialRotations[i];

									if (func[p]) {
										target[p](val);
									} else {
										target[p] = val;
									}
								}
							}
						}
					}
			}),
			p = BezierPlugin.prototype;


		BezierPlugin.bezierThrough = bezierThrough;
		BezierPlugin.cubicToQuadratic = cubicToQuadratic;
		BezierPlugin._autoCSS = true; //indicates that this plugin can be inserted into the "css" object using the autoCSS feature of TweenLite
		BezierPlugin.quadraticToCubic = function(a, b, c) {
			return new Segment(a, (2 * b + a) / 3, (2 * b + c) / 3, c);
		};

		BezierPlugin._cssRegister = function() {
			var CSSPlugin = _globals.CSSPlugin;
			if (!CSSPlugin) {
				return;
			}
			var _internals = CSSPlugin._internals,
				_parseToProxy = _internals._parseToProxy,
				_setPluginRatio = _internals._setPluginRatio,
				CSSPropTween = _internals.CSSPropTween;
			_internals._registerComplexSpecialProp("bezier", {parser:function(t, e, prop, cssp, pt, plugin) {
				if (e instanceof Array) {
					e = {values:e};
				}
				plugin = new BezierPlugin();
				var values = e.values,
					l = values.length - 1,
					pluginValues = [],
					v = {},
					i, p, data;
				if (l < 0) {
					return pt;
				}
				for (i = 0; i <= l; i++) {
					data = _parseToProxy(t, values[i], cssp, pt, plugin, (l !== i));
					pluginValues[i] = data.end;
				}
				for (p in e) {
					v[p] = e[p]; //duplicate the vars object because we need to alter some things which would cause problems if the user plans to reuse the same vars object for another tween.
				}
				v.values = pluginValues;
				pt = new CSSPropTween(t, "bezier", 0, 0, data.pt, 2);
				pt.data = data;
				pt.plugin = plugin;
				pt.setRatio = _setPluginRatio;
				if (v.autoRotate === 0) {
					v.autoRotate = true;
				}
				if (v.autoRotate && !(v.autoRotate instanceof Array)) {
					i = (v.autoRotate === true) ? 0 : Number(v.autoRotate);
					v.autoRotate = (data.end.left != null) ? [["left","top","rotation",i,false]] : (data.end.x != null) ? [["x","y","rotation",i,false]] : false;
				}
				if (v.autoRotate) {
					if (!cssp._transform) {
						cssp._enableTransforms(false);
					}
					data.autoRotate = cssp._target._gsTransform;
				}
				plugin._onInitTween(data.proxy, v, cssp._tween);
				return pt;
			}});
		};

		p._roundProps = function(lookup, value) {
			var op = this._overwriteProps,
				i = op.length;
			while (--i > -1) {
				if (lookup[op[i]] || lookup.bezier || lookup.bezierThrough) {
					this._round[op[i]] = value;
				}
			}
		};

		p._kill = function(lookup) {
			var a = this._props,
				p, i;
			for (p in this._beziers) {
				if (p in lookup) {
					delete this._beziers[p];
					delete this._func[p];
					i = a.length;
					while (--i > -1) {
						if (a[i] === p) {
							a.splice(i, 1);
						}
					}
				}
			}
			return this._super._kill.call(this, lookup);
		};

	}());






	
	
	
	
	
	
	
	
/*
 * ----------------------------------------------------------------
 * CSSPlugin
 * ----------------------------------------------------------------
 */
	_gsScope._gsDefine("plugins.CSSPlugin", ["plugins.TweenPlugin","TweenLite"], function(TweenPlugin, TweenLite) {

		/** @constructor **/
		var CSSPlugin = function() {
				TweenPlugin.call(this, "css");
				this._overwriteProps.length = 0;
				this.setRatio = CSSPlugin.prototype.setRatio; //speed optimization (avoid prototype lookup on this "hot" method)
			},
			_globals = _gsScope._gsDefine.globals,
			_hasPriority, //turns true whenever a CSSPropTween instance is created that has a priority other than 0. This helps us discern whether or not we should spend the time organizing the linked list or not after a CSSPlugin's _onInitTween() method is called.
			_suffixMap, //we set this in _onInitTween() each time as a way to have a persistent variable we can use in other methods like _parse() without having to pass it around as a parameter and we keep _parse() decoupled from a particular CSSPlugin instance
			_cs, //computed style (we store this in a shared variable to conserve memory and make minification tighter
			_overwriteProps, //alias to the currently instantiating CSSPlugin's _overwriteProps array. We use this closure in order to avoid having to pass a reference around from method to method and aid in minification.
			_specialProps = {},
			p = CSSPlugin.prototype = new TweenPlugin("css");

		p.constructor = CSSPlugin;
		CSSPlugin.version = "1.18.2";
		CSSPlugin.API = 2;
		CSSPlugin.defaultTransformPerspective = 0;
		CSSPlugin.defaultSkewType = "compensated";
		CSSPlugin.defaultSmoothOrigin = true;
		p = "px"; //we'll reuse the "p" variable to keep file size down
		CSSPlugin.suffixMap = {top:p, right:p, bottom:p, left:p, width:p, height:p, fontSize:p, padding:p, margin:p, perspective:p, lineHeight:""};


		var _numExp = /(?:\d|\-\d|\.\d|\-\.\d)+/g,
			_relNumExp = /(?:\d|\-\d|\.\d|\-\.\d|\+=\d|\-=\d|\+=.\d|\-=\.\d)+/g,
			_valuesExp = /(?:\+=|\-=|\-|\b)[\d\-\.]+[a-zA-Z0-9]*(?:%|\b)/gi, //finds all the values that begin with numbers or += or -= and then a number. Includes suffixes. We use this to split complex values apart like "1px 5px 20px rgb(255,102,51)"
			_NaNExp = /(?![+-]?\d*\.?\d+|[+-]|e[+-]\d+)[^0-9]/g, //also allows scientific notation and doesn't kill the leading -/+ in -= and +=
			_suffixExp = /(?:\d|\-|\+|=|#|\.)*/g,
			_opacityExp = /opacity *= *([^)]*)/i,
			_opacityValExp = /opacity:([^;]*)/i,
			_alphaFilterExp = /alpha\(opacity *=.+?\)/i,
			_rgbhslExp = /^(rgb|hsl)/,
			_capsExp = /([A-Z])/g,
			_camelExp = /-([a-z])/gi,
			_urlExp = /(^(?:url\(\"|url\())|(?:(\"\))$|\)$)/gi, //for pulling out urls from url(...) or url("...") strings (some browsers wrap urls in quotes, some don't when reporting things like backgroundImage)
			_camelFunc = function(s, g) { return g.toUpperCase(); },
			_horizExp = /(?:Left|Right|Width)/i,
			_ieGetMatrixExp = /(M11|M12|M21|M22)=[\d\-\.e]+/gi,
			_ieSetMatrixExp = /progid\:DXImageTransform\.Microsoft\.Matrix\(.+?\)/i,
			_commasOutsideParenExp = /,(?=[^\)]*(?:\(|$))/gi, //finds any commas that are not within parenthesis
			_DEG2RAD = Math.PI / 180,
			_RAD2DEG = 180 / Math.PI,
			_forcePT = {},
			_doc = document,
			_createElement = function(type) {
				return _doc.createElementNS ? _doc.createElementNS("http://www.w3.org/1999/xhtml", type) : _doc.createElement(type);
			},
			_tempDiv = _createElement("div"),
			_tempImg = _createElement("img"),
			_internals = CSSPlugin._internals = {_specialProps:_specialProps}, //provides a hook to a few internal methods that we need to access from inside other plugins
			_agent = navigator.userAgent,
			_autoRound,
			_reqSafariFix, //we won't apply the Safari transform fix until we actually come across a tween that affects a transform property (to maintain best performance).

			_isSafari,
			_isFirefox, //Firefox has a bug that causes 3D transformed elements to randomly disappear unless a repaint is forced after each update on each element.
			_isSafariLT6, //Safari (and Android 4 which uses a flavor of Safari) has a bug that prevents changes to "top" and "left" properties from rendering properly if changed on the same frame as a transform UNLESS we set the element's WebkitBackfaceVisibility to hidden (weird, I know). Doing this for Android 3 and earlier seems to actually cause other problems, though (fun!)
			_ieVers,
			_supportsOpacity = (function() { //we set _isSafari, _ieVers, _isFirefox, and _supportsOpacity all in one function here to reduce file size slightly, especially in the minified version.
				var i = _agent.indexOf("Android"),
					a = _createElement("a");
				_isSafari = (_agent.indexOf("Safari") !== -1 && _agent.indexOf("Chrome") === -1 && (i === -1 || Number(_agent.substr(i+8, 1)) > 3));
				_isSafariLT6 = (_isSafari && (Number(_agent.substr(_agent.indexOf("Version/")+8, 1)) < 6));
				_isFirefox = (_agent.indexOf("Firefox") !== -1);
				if ((/MSIE ([0-9]{1,}[\.0-9]{0,})/).exec(_agent) || (/Trident\/.*rv:([0-9]{1,}[\.0-9]{0,})/).exec(_agent)) {
					_ieVers = parseFloat( RegExp.$1 );
				}
				if (!a) {
					return false;
				}
				a.style.cssText = "top:1px;opacity:.55;";
				return /^0.55/.test(a.style.opacity);
			}()),
			_getIEOpacity = function(v) {
				return (_opacityExp.test( ((typeof(v) === "string") ? v : (v.currentStyle ? v.currentStyle.filter : v.style.filter) || "") ) ? ( parseFloat( RegExp.$1 ) / 100 ) : 1);
			},
			_log = function(s) {//for logging messages, but in a way that won't throw errors in old versions of IE.
				if (window.console) {
					console.log(s);
				}
			},

			_prefixCSS = "", //the non-camelCase vendor prefix like "-o-", "-moz-", "-ms-", or "-webkit-"
			_prefix = "", //camelCase vendor prefix like "O", "ms", "Webkit", or "Moz".

			// @private feed in a camelCase property name like "transform" and it will check to see if it is valid as-is or if it needs a vendor prefix. It returns the corrected camelCase property name (i.e. "WebkitTransform" or "MozTransform" or "transform" or null if no such property is found, like if the browser is IE8 or before, "transform" won't be found at all)
			_checkPropPrefix = function(p, e) {
				e = e || _tempDiv;
				var s = e.style,
					a, i;
				if (s[p] !== undefined) {
					return p;
				}
				p = p.charAt(0).toUpperCase() + p.substr(1);
				a = ["O","Moz","ms","Ms","Webkit"];
				i = 5;
				while (--i > -1 && s[a[i]+p] === undefined) { }
				if (i >= 0) {
					_prefix = (i === 3) ? "ms" : a[i];
					_prefixCSS = "-" + _prefix.toLowerCase() + "-";
					return _prefix + p;
				}
				return null;
			},

			_getComputedStyle = _doc.defaultView ? _doc.defaultView.getComputedStyle : function() {},

			/**
			 * @private Returns the css style for a particular property of an element. For example, to get whatever the current "left" css value for an element with an ID of "myElement", you could do:
			 * var currentLeft = CSSPlugin.getStyle( document.getElementById("myElement"), "left");
			 *
			 * @param {!Object} t Target element whose style property you want to query
			 * @param {!string} p Property name (like "left" or "top" or "marginTop", etc.)
			 * @param {Object=} cs Computed style object. This just provides a way to speed processing if you're going to get several properties on the same element in quick succession - you can reuse the result of the getComputedStyle() call.
			 * @param {boolean=} calc If true, the value will not be read directly from the element's "style" property (if it exists there), but instead the getComputedStyle() result will be used. This can be useful when you want to ensure that the browser itself is interpreting the value.
			 * @param {string=} dflt Default value that should be returned in the place of null, "none", "auto" or "auto auto".
			 * @return {?string} The current property value
			 */
			_getStyle = CSSPlugin.getStyle = function(t, p, cs, calc, dflt) {
				var rv;
				if (!_supportsOpacity) if (p === "opacity") { //several versions of IE don't use the standard "opacity" property - they use things like filter:alpha(opacity=50), so we parse that here.
					return _getIEOpacity(t);
				}
				if (!calc && t.style[p]) {
					rv = t.style[p];
				} else if ((cs = cs || _getComputedStyle(t))) {
					rv = cs[p] || cs.getPropertyValue(p) || cs.getPropertyValue(p.replace(_capsExp, "-$1").toLowerCase());
				} else if (t.currentStyle) {
					rv = t.currentStyle[p];
				}
				return (dflt != null && (!rv || rv === "none" || rv === "auto" || rv === "auto auto")) ? dflt : rv;
			},

			/**
			 * @private Pass the target element, the property name, the numeric value, and the suffix (like "%", "em", "px", etc.) and it will spit back the equivalent pixel number.
			 * @param {!Object} t Target element
			 * @param {!string} p Property name (like "left", "top", "marginLeft", etc.)
			 * @param {!number} v Value
			 * @param {string=} sfx Suffix (like "px" or "%" or "em")
			 * @param {boolean=} recurse If true, the call is a recursive one. In some browsers (like IE7/8), occasionally the value isn't accurately reported initially, but if we run the function again it will take effect.
			 * @return {number} value in pixels
			 */
			_convertToPixels = _internals.convertToPixels = function(t, p, v, sfx, recurse) {
				if (sfx === "px" || !sfx) { return v; }
				if (sfx === "auto" || !v) { return 0; }
				var horiz = _horizExp.test(p),
					node = t,
					style = _tempDiv.style,
					neg = (v < 0),
					pix, cache, time;
				if (neg) {
					v = -v;
				}
				if (sfx === "%" && p.indexOf("border") !== -1) {
					pix = (v / 100) * (horiz ? t.clientWidth : t.clientHeight);
				} else {
					style.cssText = "border:0 solid red;position:" + _getStyle(t, "position") + ";line-height:0;";
					if (sfx === "%" || !node.appendChild || sfx.charAt(0) === "v" || sfx === "rem") {
						node = t.parentNode || _doc.body;
						cache = node._gsCache;
						time = TweenLite.ticker.frame;
						if (cache && horiz && cache.time === time) { //performance optimization: we record the width of elements along with the ticker frame so that we can quickly get it again on the same tick (seems relatively safe to assume it wouldn't change on the same tick)
							return cache.width * v / 100;
						}
						style[(horiz ? "width" : "height")] = v + sfx;
					} else {
						style[(horiz ? "borderLeftWidth" : "borderTopWidth")] = v + sfx;
					}
					node.appendChild(_tempDiv);
					pix = parseFloat(_tempDiv[(horiz ? "offsetWidth" : "offsetHeight")]);
					node.removeChild(_tempDiv);
					if (horiz && sfx === "%" && CSSPlugin.cacheWidths !== false) {
						cache = node._gsCache = node._gsCache || {};
						cache.time = time;
						cache.width = pix / v * 100;
					}
					if (pix === 0 && !recurse) {
						pix = _convertToPixels(t, p, v, sfx, true);
					}
				}
				return neg ? -pix : pix;
			},
			_calculateOffset = _internals.calculateOffset = function(t, p, cs) { //for figuring out "top" or "left" in px when it's "auto". We need to factor in margin with the offsetLeft/offsetTop
				if (_getStyle(t, "position", cs) !== "absolute") { return 0; }
				var dim = ((p === "left") ? "Left" : "Top"),
					v = _getStyle(t, "margin" + dim, cs);
				return t["offset" + dim] - (_convertToPixels(t, p, parseFloat(v), v.replace(_suffixExp, "")) || 0);
			},

			// @private returns at object containing ALL of the style properties in camelCase and their associated values.
			_getAllStyles = function(t, cs) {
				var s = {},
					i, tr, p;
				if ((cs = cs || _getComputedStyle(t, null))) {
					if ((i = cs.length)) {
						while (--i > -1) {
							p = cs[i];
							if (p.indexOf("-transform") === -1 || _transformPropCSS === p) { //Some webkit browsers duplicate transform values, one non-prefixed and one prefixed ("transform" and "WebkitTransform"), so we must weed out the extra one here.
								s[p.replace(_camelExp, _camelFunc)] = cs.getPropertyValue(p);
							}
						}
					} else { //some browsers behave differently - cs.length is always 0, so we must do a for...in loop.
						for (i in cs) {
							if (i.indexOf("Transform") === -1 || _transformProp === i) { //Some webkit browsers duplicate transform values, one non-prefixed and one prefixed ("transform" and "WebkitTransform"), so we must weed out the extra one here.
								s[i] = cs[i];
							}
						}
					}
				} else if ((cs = t.currentStyle || t.style)) {
					for (i in cs) {
						if (typeof(i) === "string" && s[i] === undefined) {
							s[i.replace(_camelExp, _camelFunc)] = cs[i];
						}
					}
				}
				if (!_supportsOpacity) {
					s.opacity = _getIEOpacity(t);
				}
				tr = _getTransform(t, cs, false);
				s.rotation = tr.rotation;
				s.skewX = tr.skewX;
				s.scaleX = tr.scaleX;
				s.scaleY = tr.scaleY;
				s.x = tr.x;
				s.y = tr.y;
				if (_supports3D) {
					s.z = tr.z;
					s.rotationX = tr.rotationX;
					s.rotationY = tr.rotationY;
					s.scaleZ = tr.scaleZ;
				}
				if (s.filters) {
					delete s.filters;
				}
				return s;
			},

			// @private analyzes two style objects (as returned by _getAllStyles()) and only looks for differences between them that contain tweenable values (like a number or color). It returns an object with a "difs" property which refers to an object containing only those isolated properties and values for tweening, and a "firstMPT" property which refers to the first MiniPropTween instance in a linked list that recorded all the starting values of the different properties so that we can revert to them at the end or beginning of the tween - we don't want the cascading to get messed up. The forceLookup parameter is an optional generic object with properties that should be forced into the results - this is necessary for className tweens that are overwriting others because imagine a scenario where a rollover/rollout adds/removes a class and the user swipes the mouse over the target SUPER fast, thus nothing actually changed yet and the subsequent comparison of the properties would indicate they match (especially when px rounding is taken into consideration), thus no tweening is necessary even though it SHOULD tween and remove those properties after the tween (otherwise the inline styles will contaminate things). See the className SpecialProp code for details.
			_cssDif = function(t, s1, s2, vars, forceLookup) {
				var difs = {},
					style = t.style,
					val, p, mpt;
				for (p in s2) {
					if (p !== "cssText") if (p !== "length") if (isNaN(p)) if (s1[p] !== (val = s2[p]) || (forceLookup && forceLookup[p])) if (p.indexOf("Origin") === -1) if (typeof(val) === "number" || typeof(val) === "string") {
						difs[p] = (val === "auto" && (p === "left" || p === "top")) ? _calculateOffset(t, p) : ((val === "" || val === "auto" || val === "none") && typeof(s1[p]) === "string" && s1[p].replace(_NaNExp, "") !== "") ? 0 : val; //if the ending value is defaulting ("" or "auto"), we check the starting value and if it can be parsed into a number (a string which could have a suffix too, like 700px), then we swap in 0 for "" or "auto" so that things actually tween.
						if (style[p] !== undefined) { //for className tweens, we must remember which properties already existed inline - the ones that didn't should be removed when the tween isn't in progress because they were only introduced to facilitate the transition between classes.
							mpt = new MiniPropTween(style, p, style[p], mpt);
						}
					}
				}
				if (vars) {
					for (p in vars) { //copy properties (except className)
						if (p !== "className") {
							difs[p] = vars[p];
						}
					}
				}
				return {difs:difs, firstMPT:mpt};
			},
			_dimensions = {width:["Left","Right"], height:["Top","Bottom"]},
			_margins = ["marginLeft","marginRight","marginTop","marginBottom"],

			/**
			 * @private Gets the width or height of an element
			 * @param {!Object} t Target element
			 * @param {!string} p Property name ("width" or "height")
			 * @param {Object=} cs Computed style object (if one exists). Just a speed optimization.
			 * @return {number} Dimension (in pixels)
			 */
			_getDimension = function(t, p, cs) {
				var v = parseFloat((p === "width") ? t.offsetWidth : t.offsetHeight),
					a = _dimensions[p],
					i = a.length;
				cs = cs || _getComputedStyle(t, null);
				while (--i > -1) {
					v -= parseFloat( _getStyle(t, "padding" + a[i], cs, true) ) || 0;
					v -= parseFloat( _getStyle(t, "border" + a[i] + "Width", cs, true) ) || 0;
				}
				return v;
			},

			// @private Parses position-related complex strings like "top left" or "50px 10px" or "70% 20%", etc. which are used for things like transformOrigin or backgroundPosition. Optionally decorates a supplied object (recObj) with the following properties: "ox" (offsetX), "oy" (offsetY), "oxp" (if true, "ox" is a percentage not a pixel value), and "oxy" (if true, "oy" is a percentage not a pixel value)
			_parsePosition = function(v, recObj) {
				if (v === "contain" || v === "auto" || v === "auto auto") {
					return v + " ";
				}
				if (v == null || v === "") { //note: Firefox uses "auto auto" as default whereas Chrome uses "auto".
					v = "0 0";
				}
				var a = v.split(" "),
					x = (v.indexOf("left") !== -1) ? "0%" : (v.indexOf("right") !== -1) ? "100%" : a[0],
					y = (v.indexOf("top") !== -1) ? "0%" : (v.indexOf("bottom") !== -1) ? "100%" : a[1];
				if (y == null) {
					y = (x === "center") ? "50%" : "0";
				} else if (y === "center") {
					y = "50%";
				}
				if (x === "center" || (isNaN(parseFloat(x)) && (x + "").indexOf("=") === -1)) { //remember, the user could flip-flop the values and say "bottom center" or "center bottom", etc. "center" is ambiguous because it could be used to describe horizontal or vertical, hence the isNaN(). If there's an "=" sign in the value, it's relative.
					x = "50%";
				}
				v = x + " " + y + ((a.length > 2) ? " " + a[2] : "");
				if (recObj) {
					recObj.oxp = (x.indexOf("%") !== -1);
					recObj.oyp = (y.indexOf("%") !== -1);
					recObj.oxr = (x.charAt(1) === "=");
					recObj.oyr = (y.charAt(1) === "=");
					recObj.ox = parseFloat(x.replace(_NaNExp, ""));
					recObj.oy = parseFloat(y.replace(_NaNExp, ""));
					recObj.v = v;
				}
				return recObj || v;
			},

			/**
			 * @private Takes an ending value (typically a string, but can be a number) and a starting value and returns the change between the two, looking for relative value indicators like += and -= and it also ignores suffixes (but make sure the ending value starts with a number or +=/-= and that the starting value is a NUMBER!)
			 * @param {(number|string)} e End value which is typically a string, but could be a number
			 * @param {(number|string)} b Beginning value which is typically a string but could be a number
			 * @return {number} Amount of change between the beginning and ending values (relative values that have a "+=" or "-=" are recognized)
			 */
			_parseChange = function(e, b) {
				return (typeof(e) === "string" && e.charAt(1) === "=") ? parseInt(e.charAt(0) + "1", 10) * parseFloat(e.substr(2)) : parseFloat(e) - parseFloat(b);
			},

			/**
			 * @private Takes a value and a default number, checks if the value is relative, null, or numeric and spits back a normalized number accordingly. Primarily used in the _parseTransform() function.
			 * @param {Object} v Value to be parsed
			 * @param {!number} d Default value (which is also used for relative calculations if "+=" or "-=" is found in the first parameter)
			 * @return {number} Parsed value
			 */
			_parseVal = function(v, d) {
				return (v == null) ? d : (typeof(v) === "string" && v.charAt(1) === "=") ? parseInt(v.charAt(0) + "1", 10) * parseFloat(v.substr(2)) + d : parseFloat(v);
			},

			/**
			 * @private Translates strings like "40deg" or "40" or 40rad" or "+=40deg" or "270_short" or "-90_cw" or "+=45_ccw" to a numeric radian angle. Of course a starting/default value must be fed in too so that relative values can be calculated properly.
			 * @param {Object} v Value to be parsed
			 * @param {!number} d Default value (which is also used for relative calculations if "+=" or "-=" is found in the first parameter)
			 * @param {string=} p property name for directionalEnd (optional - only used when the parsed value is directional ("_short", "_cw", or "_ccw" suffix). We need a way to store the uncompensated value so that at the end of the tween, we set it to exactly what was requested with no directional compensation). Property name would be "rotation", "rotationX", or "rotationY"
			 * @param {Object=} directionalEnd An object that will store the raw end values for directional angles ("_short", "_cw", or "_ccw" suffix). We need a way to store the uncompensated value so that at the end of the tween, we set it to exactly what was requested with no directional compensation.
			 * @return {number} parsed angle in radians
			 */
			_parseAngle = function(v, d, p, directionalEnd) {
				var min = 0.000001,
					cap, split, dif, result, isRelative;
				if (v == null) {
					result = d;
				} else if (typeof(v) === "number") {
					result = v;
				} else {
					cap = 360;
					split = v.split("_");
					isRelative = (v.charAt(1) === "=");
					dif = (isRelative ? parseInt(v.charAt(0) + "1", 10) * parseFloat(split[0].substr(2)) : parseFloat(split[0])) * ((v.indexOf("rad") === -1) ? 1 : _RAD2DEG) - (isRelative ? 0 : d);
					if (split.length) {
						if (directionalEnd) {
							directionalEnd[p] = d + dif;
						}
						if (v.indexOf("short") !== -1) {
							dif = dif % cap;
							if (dif !== dif % (cap / 2)) {
								dif = (dif < 0) ? dif + cap : dif - cap;
							}
						}
						if (v.indexOf("_cw") !== -1 && dif < 0) {
							dif = ((dif + cap * 9999999999) % cap) - ((dif / cap) | 0) * cap;
						} else if (v.indexOf("ccw") !== -1 && dif > 0) {
							dif = ((dif - cap * 9999999999) % cap) - ((dif / cap) | 0) * cap;
						}
					}
					result = d + dif;
				}
				if (result < min && result > -min) {
					result = 0;
				}
				return result;
			},

			_colorLookup = {aqua:[0,255,255],
				lime:[0,255,0],
				silver:[192,192,192],
				black:[0,0,0],
				maroon:[128,0,0],
				teal:[0,128,128],
				blue:[0,0,255],
				navy:[0,0,128],
				white:[255,255,255],
				fuchsia:[255,0,255],
				olive:[128,128,0],
				yellow:[255,255,0],
				orange:[255,165,0],
				gray:[128,128,128],
				purple:[128,0,128],
				green:[0,128,0],
				red:[255,0,0],
				pink:[255,192,203],
				cyan:[0,255,255],
				transparent:[255,255,255,0]},

			_hue = function(h, m1, m2) {
				h = (h < 0) ? h + 1 : (h > 1) ? h - 1 : h;
				return ((((h * 6 < 1) ? m1 + (m2 - m1) * h * 6 : (h < 0.5) ? m2 : (h * 3 < 2) ? m1 + (m2 - m1) * (2 / 3 - h) * 6 : m1) * 255) + 0.5) | 0;
			},

			/**
			 * @private Parses a color (like #9F0, #FF9900, rgb(255,51,153) or hsl(108, 50%, 10%)) into an array with 3 elements for red, green, and blue or if toHSL parameter is true, it will populate the array with hue, saturation, and lightness values. If a relative value is found in an hsl() or hsla() string, it will preserve those relative prefixes and all the values in the array will be strings instead of numbers (in all other cases it will be populated with numbers).
			 * @param {(string|number)} v The value the should be parsed which could be a string like #9F0 or rgb(255,102,51) or rgba(255,0,0,0.5) or it could be a number like 0xFF00CC or even a named color like red, blue, purple, etc.
			 * @param {(boolean)} toHSL If true, an hsl() or hsla() value will be returned instead of rgb() or rgba()
			 * @return {Array.<number>} An array containing red, green, and blue (and optionally alpha) in that order, or if the toHSL parameter was true, the array will contain hue, saturation and lightness (and optionally alpha) in that order. Always numbers unless there's a relative prefix found in an hsl() or hsla() string and toHSL is true.
			 */
			_parseColor = CSSPlugin.parseColor = function(v, toHSL) {
				var a, r, g, b, h, s, l, max, min, d, wasHSL;
				if (!v) {
					a = _colorLookup.black;
				} else if (typeof(v) === "number") {
					a = [v >> 16, (v >> 8) & 255, v & 255];
				} else {
					if (v.charAt(v.length - 1) === ",") { //sometimes a trailing comma is included and we should chop it off (typically from a comma-delimited list of values like a textShadow:"2px 2px 2px blue, 5px 5px 5px rgb(255,0,0)" - in this example "blue," has a trailing comma. We could strip it out inside parseComplex() but we'd need to do it to the beginning and ending values plus it wouldn't provide protection from other potential scenarios like if the user passes in a similar value.
						v = v.substr(0, v.length - 1);
					}
					if (_colorLookup[v]) {
						a = _colorLookup[v];
					} else if (v.charAt(0) === "#") {
						if (v.length === 4) { //for shorthand like #9F0
							r = v.charAt(1);
							g = v.charAt(2);
							b = v.charAt(3);
							v = "#" + r + r + g + g + b + b;
						}
						v = parseInt(v.substr(1), 16);
						a = [v >> 16, (v >> 8) & 255, v & 255];
					} else if (v.substr(0, 3) === "hsl") {
						a = wasHSL = v.match(_numExp);
						if (!toHSL) {
							h = (Number(a[0]) % 360) / 360;
							s = Number(a[1]) / 100;
							l = Number(a[2]) / 100;
							g = (l <= 0.5) ? l * (s + 1) : l + s - l * s;
							r = l * 2 - g;
							if (a.length > 3) {
								a[3] = Number(v[3]);
							}
							a[0] = _hue(h + 1 / 3, r, g);
							a[1] = _hue(h, r, g);
							a[2] = _hue(h - 1 / 3, r, g);
						} else if (v.indexOf("=") !== -1) { //if relative values are found, just return the raw strings with the relative prefixes in place.
							return v.match(_relNumExp);
						}
					} else {
						a = v.match(_numExp) || _colorLookup.transparent;
					}
					a[0] = Number(a[0]);
					a[1] = Number(a[1]);
					a[2] = Number(a[2]);
					if (a.length > 3) {
						a[3] = Number(a[3]);
					}
				}
				if (toHSL && !wasHSL) {
					r = a[0] / 255;
					g = a[1] / 255;
					b = a[2] / 255;
					max = Math.max(r, g, b);
					min = Math.min(r, g, b);
					l = (max + min) / 2;
					if (max === min) {
						h = s = 0;
					} else {
						d = max - min;
						s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
						h = (max === r) ? (g - b) / d + (g < b ? 6 : 0) : (max === g) ? (b - r) / d + 2 : (r - g) / d + 4;
						h *= 60;
					}
					a[0] = (h + 0.5) | 0;
					a[1] = (s * 100 + 0.5) | 0;
					a[2] = (l * 100 + 0.5) | 0;
				}
				return a;
			},
			_formatColors = function(s, toHSL) {
				var colors = s.match(_colorExp) || [],
					charIndex = 0,
					parsed = colors.length ? "" : s,
					i, color, temp;
				for (i = 0; i < colors.length; i++) {
					color = colors[i];
					temp = s.substr(charIndex, s.indexOf(color, charIndex)-charIndex);
					charIndex += temp.length + color.length;
					color = _parseColor(color, toHSL);
					if (color.length === 3) {
						color.push(1);
					}
					parsed += temp + (toHSL ? "hsla(" + color[0] + "," + color[1] + "%," + color[2] + "%," + color[3] : "rgba(" + color.join(",")) + ")";
				}
				return parsed;
			},
			_colorExp = "(?:\\b(?:(?:rgb|rgba|hsl|hsla)\\(.+?\\))|\\B#(?:[0-9a-f]{3}){1,2}\\b"; //we'll dynamically build this Regular Expression to conserve file size. After building it, it will be able to find rgb(), rgba(), # (hexadecimal), and named color values like red, blue, purple, etc.

		for (p in _colorLookup) {
			_colorExp += "|" + p + "\\b";
		}
		_colorExp = new RegExp(_colorExp+")", "gi");

		CSSPlugin.colorStringFilter = function(a) {
			var combined = a[0] + a[1],
				toHSL;
			_colorExp.lastIndex = 0;
			if (_colorExp.test(combined)) {
				toHSL = (combined.indexOf("hsl(") !== -1 || combined.indexOf("hsla(") !== -1);
				a[0] = _formatColors(a[0], toHSL);
				a[1] = _formatColors(a[1], toHSL);
			}
		};

		if (!TweenLite.defaultStringFilter) {
			TweenLite.defaultStringFilter = CSSPlugin.colorStringFilter;
		}

		/**
		 * @private Returns a formatter function that handles taking a string (or number in some cases) and returning a consistently formatted one in terms of delimiters, quantity of values, etc. For example, we may get boxShadow values defined as "0px red" or "0px 0px 10px rgb(255,0,0)" or "0px 0px 20px 20px #F00" and we need to ensure that what we get back is described with 4 numbers and a color. This allows us to feed it into the _parseComplex() method and split the values up appropriately. The neat thing about this _getFormatter() function is that the dflt defines a pattern as well as a default, so for example, _getFormatter("0px 0px 0px 0px #777", true) not only sets the default as 0px for all distances and #777 for the color, but also sets the pattern such that 4 numbers and a color will always get returned.
		 * @param {!string} dflt The default value and pattern to follow. So "0px 0px 0px 0px #777" will ensure that 4 numbers and a color will always get returned.
		 * @param {boolean=} clr If true, the values should be searched for color-related data. For example, boxShadow values typically contain a color whereas borderRadius don't.
		 * @param {boolean=} collapsible If true, the value is a top/left/right/bottom style one that acts like margin or padding, where if only one value is received, it's used for all 4; if 2 are received, the first is duplicated for 3rd (bottom) and the 2nd is duplicated for the 4th spot (left), etc.
		 * @return {Function} formatter function
		 */
		var _getFormatter = function(dflt, clr, collapsible, multi) {
				if (dflt == null) {
					return function(v) {return v;};
				}
				var dColor = clr ? (dflt.match(_colorExp) || [""])[0] : "",
					dVals = dflt.split(dColor).join("").match(_valuesExp) || [],
					pfx = dflt.substr(0, dflt.indexOf(dVals[0])),
					sfx = (dflt.charAt(dflt.length - 1) === ")") ? ")" : "",
					delim = (dflt.indexOf(" ") !== -1) ? " " : ",",
					numVals = dVals.length,
					dSfx = (numVals > 0) ? dVals[0].replace(_numExp, "") : "",
					formatter;
				if (!numVals) {
					return function(v) {return v;};
				}
				if (clr) {
					formatter = function(v) {
						var color, vals, i, a;
						if (typeof(v) === "number") {
							v += dSfx;
						} else if (multi && _commasOutsideParenExp.test(v)) {
							a = v.replace(_commasOutsideParenExp, "|").split("|");
							for (i = 0; i < a.length; i++) {
								a[i] = formatter(a[i]);
							}
							return a.join(",");
						}
						color = (v.match(_colorExp) || [dColor])[0];
						vals = v.split(color).join("").match(_valuesExp) || [];
						i = vals.length;
						if (numVals > i--) {
							while (++i < numVals) {
								vals[i] = collapsible ? vals[(((i - 1) / 2) | 0)] : dVals[i];
							}
						}
						return pfx + vals.join(delim) + delim + color + sfx + (v.indexOf("inset") !== -1 ? " inset" : "");
					};
					return formatter;

				}
				formatter = function(v) {
					var vals, a, i;
					if (typeof(v) === "number") {
						v += dSfx;
					} else if (multi && _commasOutsideParenExp.test(v)) {
						a = v.replace(_commasOutsideParenExp, "|").split("|");
						for (i = 0; i < a.length; i++) {
							a[i] = formatter(a[i]);
						}
						return a.join(",");
					}
					vals = v.match(_valuesExp) || [];
					i = vals.length;
					if (numVals > i--) {
						while (++i < numVals) {
							vals[i] = collapsible ? vals[(((i - 1) / 2) | 0)] : dVals[i];
						}
					}
					return pfx + vals.join(delim) + sfx;
				};
				return formatter;
			},

			/**
			 * @private returns a formatter function that's used for edge-related values like marginTop, marginLeft, paddingBottom, paddingRight, etc. Just pass a comma-delimited list of property names related to the edges.
			 * @param {!string} props a comma-delimited list of property names in order from top to left, like "marginTop,marginRight,marginBottom,marginLeft"
			 * @return {Function} a formatter function
			 */
			_getEdgeParser = function(props) {
				props = props.split(",");
				return function(t, e, p, cssp, pt, plugin, vars) {
					var a = (e + "").split(" "),
						i;
					vars = {};
					for (i = 0; i < 4; i++) {
						vars[props[i]] = a[i] = a[i] || a[(((i - 1) / 2) >> 0)];
					}
					return cssp.parse(t, vars, pt, plugin);
				};
			},

			// @private used when other plugins must tween values first, like BezierPlugin or ThrowPropsPlugin, etc. That plugin's setRatio() gets called first so that the values are updated, and then we loop through the MiniPropTweens  which handle copying the values into their appropriate slots so that they can then be applied correctly in the main CSSPlugin setRatio() method. Remember, we typically create a proxy object that has a bunch of uniquely-named properties that we feed to the sub-plugin and it does its magic normally, and then we must interpret those values and apply them to the css because often numbers must get combined/concatenated, suffixes added, etc. to work with css, like boxShadow could have 4 values plus a color.
			_setPluginRatio = _internals._setPluginRatio = function(v) {
				this.plugin.setRatio(v);
				var d = this.data,
					proxy = d.proxy,
					mpt = d.firstMPT,
					min = 0.000001,
					val, pt, i, str, p;
				while (mpt) {
					val = proxy[mpt.v];
					if (mpt.r) {
						val = Math.round(val);
					} else if (val < min && val > -min) {
						val = 0;
					}
					mpt.t[mpt.p] = val;
					mpt = mpt._next;
				}
				if (d.autoRotate) {
					d.autoRotate.rotation = proxy.rotation;
				}
				//at the end, we must set the CSSPropTween's "e" (end) value dynamically here because that's what is used in the final setRatio() method. Same for "b" at the beginning.
				if (v === 1 || v === 0) {
					mpt = d.firstMPT;
					p = (v === 1) ? "e" : "b";
					while (mpt) {
						pt = mpt.t;
						if (!pt.type) {
							pt[p] = pt.s + pt.xs0;
						} else if (pt.type === 1) {
							str = pt.xs0 + pt.s + pt.xs1;
							for (i = 1; i < pt.l; i++) {
								str += pt["xn"+i] + pt["xs"+(i+1)];
							}
							pt[p] = str;
						}
						mpt = mpt._next;
					}
				}
			},

			/**
			 * @private @constructor Used by a few SpecialProps to hold important values for proxies. For example, _parseToProxy() creates a MiniPropTween instance for each property that must get tweened on the proxy, and we record the original property name as well as the unique one we create for the proxy, plus whether or not the value needs to be rounded plus the original value.
			 * @param {!Object} t target object whose property we're tweening (often a CSSPropTween)
			 * @param {!string} p property name
			 * @param {(number|string|object)} v value
			 * @param {MiniPropTween=} next next MiniPropTween in the linked list
			 * @param {boolean=} r if true, the tweened value should be rounded to the nearest integer
			 */
			MiniPropTween = function(t, p, v, next, r) {
				this.t = t;
				this.p = p;
				this.v = v;
				this.r = r;
				if (next) {
					next._prev = this;
					this._next = next;
				}
			},

			/**
			 * @private Most other plugins (like BezierPlugin and ThrowPropsPlugin and others) can only tween numeric values, but CSSPlugin must accommodate special values that have a bunch of extra data (like a suffix or strings between numeric values, etc.). For example, boxShadow has values like "10px 10px 20px 30px rgb(255,0,0)" which would utterly confuse other plugins. This method allows us to split that data apart and grab only the numeric data and attach it to uniquely-named properties of a generic proxy object ({}) so that we can feed that to virtually any plugin to have the numbers tweened. However, we must also keep track of which properties from the proxy go with which CSSPropTween values and instances. So we create a linked list of MiniPropTweens. Each one records a target (the original CSSPropTween), property (like "s" or "xn1" or "xn2") that we're tweening and the unique property name that was used for the proxy (like "boxShadow_xn1" and "boxShadow_xn2") and whether or not they need to be rounded. That way, in the _setPluginRatio() method we can simply copy the values over from the proxy to the CSSPropTween instance(s). Then, when the main CSSPlugin setRatio() method runs and applies the CSSPropTween values accordingly, they're updated nicely. So the external plugin tweens the numbers, _setPluginRatio() copies them over, and setRatio() acts normally, applying css-specific values to the element.
			 * This method returns an object that has the following properties:
			 *  - proxy: a generic object containing the starting values for all the properties that will be tweened by the external plugin.  This is what we feed to the external _onInitTween() as the target
			 *  - end: a generic object containing the ending values for all the properties that will be tweened by the external plugin. This is what we feed to the external plugin's _onInitTween() as the destination values
			 *  - firstMPT: the first MiniPropTween in the linked list
			 *  - pt: the first CSSPropTween in the linked list that was created when parsing. If shallow is true, this linked list will NOT attach to the one passed into the _parseToProxy() as the "pt" (4th) parameter.
			 * @param {!Object} t target object to be tweened
			 * @param {!(Object|string)} vars the object containing the information about the tweening values (typically the end/destination values) that should be parsed
			 * @param {!CSSPlugin} cssp The CSSPlugin instance
			 * @param {CSSPropTween=} pt the next CSSPropTween in the linked list
			 * @param {TweenPlugin=} plugin the external TweenPlugin instance that will be handling tweening the numeric values
			 * @param {boolean=} shallow if true, the resulting linked list from the parse will NOT be attached to the CSSPropTween that was passed in as the "pt" (4th) parameter.
			 * @return An object containing the following properties: proxy, end, firstMPT, and pt (see above for descriptions)
			 */
			_parseToProxy = _internals._parseToProxy = function(t, vars, cssp, pt, plugin, shallow) {
				var bpt = pt,
					start = {},
					end = {},
					transform = cssp._transform,
					oldForce = _forcePT,
					i, p, xp, mpt, firstPT;
				cssp._transform = null;
				_forcePT = vars;
				pt = firstPT = cssp.parse(t, vars, pt, plugin);
				_forcePT = oldForce;
				//break off from the linked list so the new ones are isolated.
				if (shallow) {
					cssp._transform = transform;
					if (bpt) {
						bpt._prev = null;
						if (bpt._prev) {
							bpt._prev._next = null;
						}
					}
				}
				while (pt && pt !== bpt) {
					if (pt.type <= 1) {
						p = pt.p;
						end[p] = pt.s + pt.c;
						start[p] = pt.s;
						if (!shallow) {
							mpt = new MiniPropTween(pt, "s", p, mpt, pt.r);
							pt.c = 0;
						}
						if (pt.type === 1) {
							i = pt.l;
							while (--i > 0) {
								xp = "xn" + i;
								p = pt.p + "_" + xp;
								end[p] = pt.data[xp];
								start[p] = pt[xp];
								if (!shallow) {
									mpt = new MiniPropTween(pt, xp, p, mpt, pt.rxp[xp]);
								}
							}
						}
					}
					pt = pt._next;
				}
				return {proxy:start, end:end, firstMPT:mpt, pt:firstPT};
			},



			/**
			 * @constructor Each property that is tweened has at least one CSSPropTween associated with it. These instances store important information like the target, property, starting value, amount of change, etc. They can also optionally have a number of "extra" strings and numeric values named xs1, xn1, xs2, xn2, xs3, xn3, etc. where "s" indicates string and "n" indicates number. These can be pieced together in a complex-value tween (type:1) that has alternating types of data like a string, number, string, number, etc. For example, boxShadow could be "5px 5px 8px rgb(102, 102, 51)". In that value, there are 6 numbers that may need to tween and then pieced back together into a string again with spaces, suffixes, etc. xs0 is special in that it stores the suffix for standard (type:0) tweens, -OR- the first string (prefix) in a complex-value (type:1) CSSPropTween -OR- it can be the non-tweening value in a type:-1 CSSPropTween. We do this to conserve memory.
			 * CSSPropTweens have the following optional properties as well (not defined through the constructor):
			 *  - l: Length in terms of the number of extra properties that the CSSPropTween has (default: 0). For example, for a boxShadow we may need to tween 5 numbers in which case l would be 5; Keep in mind that the start/end values for the first number that's tweened are always stored in the s and c properties to conserve memory. All additional values thereafter are stored in xn1, xn2, etc.
			 *  - xfirst: The first instance of any sub-CSSPropTweens that are tweening properties of this instance. For example, we may split up a boxShadow tween so that there's a main CSSPropTween of type:1 that has various xs* and xn* values associated with the h-shadow, v-shadow, blur, color, etc. Then we spawn a CSSPropTween for each of those that has a higher priority and runs BEFORE the main CSSPropTween so that the values are all set by the time it needs to re-assemble them. The xfirst gives us an easy way to identify the first one in that chain which typically ends at the main one (because they're all prepende to the linked list)
			 *  - plugin: The TweenPlugin instance that will handle the tweening of any complex values. For example, sometimes we don't want to use normal subtweens (like xfirst refers to) to tween the values - we might want ThrowPropsPlugin or BezierPlugin some other plugin to do the actual tweening, so we create a plugin instance and store a reference here. We need this reference so that if we get a request to round values or disable a tween, we can pass along that request.
			 *  - data: Arbitrary data that needs to be stored with the CSSPropTween. Typically if we're going to have a plugin handle the tweening of a complex-value tween, we create a generic object that stores the END values that we're tweening to and the CSSPropTween's xs1, xs2, etc. have the starting values. We store that object as data. That way, we can simply pass that object to the plugin and use the CSSPropTween as the target.
			 *  - setRatio: Only used for type:2 tweens that require custom functionality. In this case, we call the CSSPropTween's setRatio() method and pass the ratio each time the tween updates. This isn't quite as efficient as doing things directly in the CSSPlugin's setRatio() method, but it's very convenient and flexible.
			 * @param {!Object} t Target object whose property will be tweened. Often a DOM element, but not always. It could be anything.
			 * @param {string} p Property to tween (name). For example, to tween element.width, p would be "width".
			 * @param {number} s Starting numeric value
			 * @param {number} c Change in numeric value over the course of the entire tween. For example, if element.width starts at 5 and should end at 100, c would be 95.
			 * @param {CSSPropTween=} next The next CSSPropTween in the linked list. If one is defined, we will define its _prev as the new instance, and the new instance's _next will be pointed at it.
			 * @param {number=} type The type of CSSPropTween where -1 = a non-tweening value, 0 = a standard simple tween, 1 = a complex value (like one that has multiple numbers in a comma- or space-delimited string like border:"1px solid red"), and 2 = one that uses a custom setRatio function that does all of the work of applying the values on each update.
			 * @param {string=} n Name of the property that should be used for overwriting purposes which is typically the same as p but not always. For example, we may need to create a subtween for the 2nd part of a "clip:rect(...)" tween in which case "p" might be xs1 but "n" is still "clip"
			 * @param {boolean=} r If true, the value(s) should be rounded
			 * @param {number=} pr Priority in the linked list order. Higher priority CSSPropTweens will be updated before lower priority ones. The default priority is 0.
			 * @param {string=} b Beginning value. We store this to ensure that it is EXACTLY what it was when the tween began without any risk of interpretation issues.
			 * @param {string=} e Ending value. We store this to ensure that it is EXACTLY what the user defined at the end of the tween without any risk of interpretation issues.
			 */
			CSSPropTween = _internals.CSSPropTween = function(t, p, s, c, next, type, n, r, pr, b, e) {
				this.t = t; //target
				this.p = p; //property
				this.s = s; //starting value
				this.c = c; //change value
				this.n = n || p; //name that this CSSPropTween should be associated to (usually the same as p, but not always - n is what overwriting looks at)
				if (!(t instanceof CSSPropTween)) {
					_overwriteProps.push(this.n);
				}
				this.r = r; //round (boolean)
				this.type = type || 0; //0 = normal tween, -1 = non-tweening (in which case xs0 will be applied to the target's property, like tp.t[tp.p] = tp.xs0), 1 = complex-value SpecialProp, 2 = custom setRatio() that does all the work
				if (pr) {
					this.pr = pr;
					_hasPriority = true;
				}
				this.b = (b === undefined) ? s : b;
				this.e = (e === undefined) ? s + c : e;
				if (next) {
					this._next = next;
					next._prev = this;
				}
			},

			_addNonTweeningNumericPT = function(target, prop, start, end, next, overwriteProp) { //cleans up some code redundancies and helps minification. Just a fast way to add a NUMERIC non-tweening CSSPropTween
				var pt = new CSSPropTween(target, prop, start, end - start, next, -1, overwriteProp);
				pt.b = start;
				pt.e = pt.xs0 = end;
				return pt;
			},

			/**
			 * Takes a target, the beginning value and ending value (as strings) and parses them into a CSSPropTween (possibly with child CSSPropTweens) that accommodates multiple numbers, colors, comma-delimited values, etc. For example:
			 * sp.parseComplex(element, "boxShadow", "5px 10px 20px rgb(255,102,51)", "0px 0px 0px red", true, "0px 0px 0px rgb(0,0,0,0)", pt);
			 * It will walk through the beginning and ending values (which should be in the same format with the same number and type of values) and figure out which parts are numbers, what strings separate the numeric/tweenable values, and then create the CSSPropTweens accordingly. If a plugin is defined, no child CSSPropTweens will be created. Instead, the ending values will be stored in the "data" property of the returned CSSPropTween like: {s:-5, xn1:-10, xn2:-20, xn3:255, xn4:0, xn5:0} so that it can be fed to any other plugin and it'll be plain numeric tweens but the recomposition of the complex value will be handled inside CSSPlugin's setRatio().
			 * If a setRatio is defined, the type of the CSSPropTween will be set to 2 and recomposition of the values will be the responsibility of that method.
			 *
			 * @param {!Object} t Target whose property will be tweened
			 * @param {!string} p Property that will be tweened (its name, like "left" or "backgroundColor" or "boxShadow")
			 * @param {string} b Beginning value
			 * @param {string} e Ending value
			 * @param {boolean} clrs If true, the value could contain a color value like "rgb(255,0,0)" or "#F00" or "red". The default is false, so no colors will be recognized (a performance optimization)
			 * @param {(string|number|Object)} dflt The default beginning value that should be used if no valid beginning value is defined or if the number of values inside the complex beginning and ending values don't match
			 * @param {?CSSPropTween} pt CSSPropTween instance that is the current head of the linked list (we'll prepend to this).
			 * @param {number=} pr Priority in the linked list order. Higher priority properties will be updated before lower priority ones. The default priority is 0.
			 * @param {TweenPlugin=} plugin If a plugin should handle the tweening of extra properties, pass the plugin instance here. If one is defined, then NO subtweens will be created for any extra properties (the properties will be created - just not additional CSSPropTween instances to tween them) because the plugin is expected to do so. However, the end values WILL be populated in the "data" property, like {s:100, xn1:50, xn2:300}
			 * @param {function(number)=} setRatio If values should be set in a custom function instead of being pieced together in a type:1 (complex-value) CSSPropTween, define that custom function here.
			 * @return {CSSPropTween} The first CSSPropTween in the linked list which includes the new one(s) added by the parseComplex() call.
			 */
			_parseComplex = CSSPlugin.parseComplex = function(t, p, b, e, clrs, dflt, pt, pr, plugin, setRatio) {
				//DEBUG: _log("parseComplex: "+p+", b: "+b+", e: "+e);
				b = b || dflt || "";
				pt = new CSSPropTween(t, p, 0, 0, pt, (setRatio ? 2 : 1), null, false, pr, b, e);
				e += ""; //ensures it's a string
				var ba = b.split(", ").join(",").split(" "), //beginning array
					ea = e.split(", ").join(",").split(" "), //ending array
					l = ba.length,
					autoRound = (_autoRound !== false),
					i, xi, ni, bv, ev, bnums, enums, bn, hasAlpha, temp, cv, str, useHSL;
				if (e.indexOf(",") !== -1 || b.indexOf(",") !== -1) {
					ba = ba.join(" ").replace(_commasOutsideParenExp, ", ").split(" ");
					ea = ea.join(" ").replace(_commasOutsideParenExp, ", ").split(" ");
					l = ba.length;
				}
				if (l !== ea.length) {
					//DEBUG: _log("mismatched formatting detected on " + p + " (" + b + " vs " + e + ")");
					ba = (dflt || "").split(" ");
					l = ba.length;
				}
				pt.plugin = plugin;
				pt.setRatio = setRatio;
				_colorExp.lastIndex = 0;
				for (i = 0; i < l; i++) {
					bv = ba[i];
					ev = ea[i];
					bn = parseFloat(bv);
					//if the value begins with a number (most common). It's fine if it has a suffix like px
					if (bn || bn === 0) {
						pt.appendXtra("", bn, _parseChange(ev, bn), ev.replace(_relNumExp, ""), (autoRound && ev.indexOf("px") !== -1), true);

					//if the value is a color
					} else if (clrs && _colorExp.test(bv)) {
						str = ev.charAt(ev.length - 1) === "," ? ")," : ")"; //if there's a comma at the end, retain it.
						useHSL = (ev.indexOf("hsl") !== -1 && _supportsOpacity);
						bv = _parseColor(bv, useHSL);
						ev = _parseColor(ev, useHSL);
						hasAlpha = (bv.length + ev.length > 6);
						if (hasAlpha && !_supportsOpacity && ev[3] === 0) { //older versions of IE don't support rgba(), so if the destination alpha is 0, just use "transparent" for the end color
							pt["xs" + pt.l] += pt.l ? " transparent" : "transparent";
							pt.e = pt.e.split(ea[i]).join("transparent");
						} else {
							if (!_supportsOpacity) { //old versions of IE don't support rgba().
								hasAlpha = false;
							}
							if (useHSL) {
								pt.appendXtra((hasAlpha ? "hsla(" : "hsl("), bv[0], _parseChange(ev[0], bv[0]), ",", false, true)
									.appendXtra("", bv[1], _parseChange(ev[1], bv[1]), "%,", false)
									.appendXtra("", bv[2], _parseChange(ev[2], bv[2]), (hasAlpha ? "%," : "%" + str), false);
							} else {
								pt.appendXtra((hasAlpha ? "rgba(" : "rgb("), bv[0], ev[0] - bv[0], ",", true, true)
									.appendXtra("", bv[1], ev[1] - bv[1], ",", true)
									.appendXtra("", bv[2], ev[2] - bv[2], (hasAlpha ? "," : str), true);
							}

							if (hasAlpha) {
								bv = (bv.length < 4) ? 1 : bv[3];
								pt.appendXtra("", bv, ((ev.length < 4) ? 1 : ev[3]) - bv, str, false);
							}
						}
						_colorExp.lastIndex = 0; //otherwise the test() on the RegExp could move the lastIndex and taint future results.

					} else {
						bnums = bv.match(_numExp); //gets each group of numbers in the beginning value string and drops them into an array

						//if no number is found, treat it as a non-tweening value and just append the string to the current xs.
						if (!bnums) {
							pt["xs" + pt.l] += pt.l ? " " + ev : ev;

						//loop through all the numbers that are found and construct the extra values on the pt.
						} else {
							enums = ev.match(_relNumExp); //get each group of numbers in the end value string and drop them into an array. We allow relative values too, like +=50 or -=.5
							if (!enums || enums.length !== bnums.length) {
								//DEBUG: _log("mismatched formatting detected on " + p + " (" + b + " vs " + e + ")");
								return pt;
							}
							ni = 0;
							for (xi = 0; xi < bnums.length; xi++) {
								cv = bnums[xi];
								temp = bv.indexOf(cv, ni);
								pt.appendXtra(bv.substr(ni, temp - ni), Number(cv), _parseChange(enums[xi], cv), "", (autoRound && bv.substr(temp + cv.length, 2) === "px"), (xi === 0));
								ni = temp + cv.length;
							}
							pt["xs" + pt.l] += bv.substr(ni);
						}
					}
				}
				//if there are relative values ("+=" or "-=" prefix), we need to adjust the ending value to eliminate the prefixes and combine the values properly.
				if (e.indexOf("=") !== -1) if (pt.data) {
					str = pt.xs0 + pt.data.s;
					for (i = 1; i < pt.l; i++) {
						str += pt["xs" + i] + pt.data["xn" + i];
					}
					pt.e = str + pt["xs" + i];
				}
				if (!pt.l) {
					pt.type = -1;
					pt.xs0 = pt.e;
				}
				return pt.xfirst || pt;
			},
			i = 9;


		p = CSSPropTween.prototype;
		p.l = p.pr = 0; //length (number of extra properties like xn1, xn2, xn3, etc.
		while (--i > 0) {
			p["xn" + i] = 0;
			p["xs" + i] = "";
		}
		p.xs0 = "";
		p._next = p._prev = p.xfirst = p.data = p.plugin = p.setRatio = p.rxp = null;


		/**
		 * Appends and extra tweening value to a CSSPropTween and automatically manages any prefix and suffix strings. The first extra value is stored in the s and c of the main CSSPropTween instance, but thereafter any extras are stored in the xn1, xn2, xn3, etc. The prefixes and suffixes are stored in the xs0, xs1, xs2, etc. properties. For example, if I walk through a clip value like "rect(10px, 5px, 0px, 20px)", the values would be stored like this:
		 * xs0:"rect(", s:10, xs1:"px, ", xn1:5, xs2:"px, ", xn2:0, xs3:"px, ", xn3:20, xn4:"px)"
		 * And they'd all get joined together when the CSSPlugin renders (in the setRatio() method).
		 * @param {string=} pfx Prefix (if any)
		 * @param {!number} s Starting value
		 * @param {!number} c Change in numeric value over the course of the entire tween. For example, if the start is 5 and the end is 100, the change would be 95.
		 * @param {string=} sfx Suffix (if any)
		 * @param {boolean=} r Round (if true).
		 * @param {boolean=} pad If true, this extra value should be separated by the previous one by a space. If there is no previous extra and pad is true, it will automatically drop the space.
		 * @return {CSSPropTween} returns itself so that multiple methods can be chained together.
		 */
		p.appendXtra = function(pfx, s, c, sfx, r, pad) {
			var pt = this,
				l = pt.l;
			pt["xs" + l] += (pad && l) ? " " + pfx : pfx || "";
			if (!c) if (l !== 0 && !pt.plugin) { //typically we'll combine non-changing values right into the xs to optimize performance, but we don't combine them when there's a plugin that will be tweening the values because it may depend on the values being split apart, like for a bezier, if a value doesn't change between the first and second iteration but then it does on the 3rd, we'll run into trouble because there's no xn slot for that value!
				pt["xs" + l] += s + (sfx || "");
				return pt;
			}
			pt.l++;
			pt.type = pt.setRatio ? 2 : 1;
			pt["xs" + pt.l] = sfx || "";
			if (l > 0) {
				pt.data["xn" + l] = s + c;
				pt.rxp["xn" + l] = r; //round extra property (we need to tap into this in the _parseToProxy() method)
				pt["xn" + l] = s;
				if (!pt.plugin) {
					pt.xfirst = new CSSPropTween(pt, "xn" + l, s, c, pt.xfirst || pt, 0, pt.n, r, pt.pr);
					pt.xfirst.xs0 = 0; //just to ensure that the property stays numeric which helps modern browsers speed up processing. Remember, in the setRatio() method, we do pt.t[pt.p] = val + pt.xs0 so if pt.xs0 is "" (the default), it'll cast the end value as a string. When a property is a number sometimes and a string sometimes, it prevents the compiler from locking in the data type, slowing things down slightly.
				}
				return pt;
			}
			pt.data = {s:s + c};
			pt.rxp = {};
			pt.s = s;
			pt.c = c;
			pt.r = r;
			return pt;
		};

		/**
		 * @constructor A SpecialProp is basically a css property that needs to be treated in a non-standard way, like if it may contain a complex value like boxShadow:"5px 10px 15px rgb(255, 102, 51)" or if it is associated with another plugin like ThrowPropsPlugin or BezierPlugin. Every SpecialProp is associated with a particular property name like "boxShadow" or "throwProps" or "bezier" and it will intercept those values in the vars object that's passed to the CSSPlugin and handle them accordingly.
		 * @param {!string} p Property name (like "boxShadow" or "throwProps")
		 * @param {Object=} options An object containing any of the following configuration options:
		 *                      - defaultValue: the default value
		 *                      - parser: A function that should be called when the associated property name is found in the vars. This function should return a CSSPropTween instance and it should ensure that it is properly inserted into the linked list. It will receive 4 paramters: 1) The target, 2) The value defined in the vars, 3) The CSSPlugin instance (whose _firstPT should be used for the linked list), and 4) A computed style object if one was calculated (this is a speed optimization that allows retrieval of starting values quicker)
		 *                      - formatter: a function that formats any value received for this special property (for example, boxShadow could take "5px 5px red" and format it to "5px 5px 0px 0px red" so that both the beginning and ending values have a common order and quantity of values.)
		 *                      - prefix: if true, we'll determine whether or not this property requires a vendor prefix (like Webkit or Moz or ms or O)
		 *                      - color: set this to true if the value for this SpecialProp may contain color-related values like rgb(), rgba(), etc.
		 *                      - priority: priority in the linked list order. Higher priority SpecialProps will be updated before lower priority ones. The default priority is 0.
		 *                      - multi: if true, the formatter should accommodate a comma-delimited list of values, like boxShadow could have multiple boxShadows listed out.
		 *                      - collapsible: if true, the formatter should treat the value like it's a top/right/bottom/left value that could be collapsed, like "5px" would apply to all, "5px, 10px" would use 5px for top/bottom and 10px for right/left, etc.
		 *                      - keyword: a special keyword that can [optionally] be found inside the value (like "inset" for boxShadow). This allows us to validate beginning/ending values to make sure they match (if the keyword is found in one, it'll be added to the other for consistency by default).
		 */
		var SpecialProp = function(p, options) {
				options = options || {};
				this.p = options.prefix ? _checkPropPrefix(p) || p : p;
				_specialProps[p] = _specialProps[this.p] = this;
				this.format = options.formatter || _getFormatter(options.defaultValue, options.color, options.collapsible, options.multi);
				if (options.parser) {
					this.parse = options.parser;
				}
				this.clrs = options.color;
				this.multi = options.multi;
				this.keyword = options.keyword;
				this.dflt = options.defaultValue;
				this.pr = options.priority || 0;
			},

			//shortcut for creating a new SpecialProp that can accept multiple properties as a comma-delimited list (helps minification). dflt can be an array for multiple values (we don't do a comma-delimited list because the default value may contain commas, like rect(0px,0px,0px,0px)). We attach this method to the SpecialProp class/object instead of using a private _createSpecialProp() method so that we can tap into it externally if necessary, like from another plugin.
			_registerComplexSpecialProp = _internals._registerComplexSpecialProp = function(p, options, defaults) {
				if (typeof(options) !== "object") {
					options = {parser:defaults}; //to make backwards compatible with older versions of BezierPlugin and ThrowPropsPlugin
				}
				var a = p.split(","),
					d = options.defaultValue,
					i, temp;
				defaults = defaults || [d];
				for (i = 0; i < a.length; i++) {
					options.prefix = (i === 0 && options.prefix);
					options.defaultValue = defaults[i] || d;
					temp = new SpecialProp(a[i], options);
				}
			},

			//creates a placeholder special prop for a plugin so that the property gets caught the first time a tween of it is attempted, and at that time it makes the plugin register itself, thus taking over for all future tweens of that property. This allows us to not mandate that things load in a particular order and it also allows us to log() an error that informs the user when they attempt to tween an external plugin-related property without loading its .js file.
			_registerPluginProp = function(p) {
				if (!_specialProps[p]) {
					var pluginName = p.charAt(0).toUpperCase() + p.substr(1) + "Plugin";
					_registerComplexSpecialProp(p, {parser:function(t, e, p, cssp, pt, plugin, vars) {
						var pluginClass = _globals.com.greensock.plugins[pluginName];
						if (!pluginClass) {
							_log("Error: " + pluginName + " js file not loaded.");
							return pt;
						}
						pluginClass._cssRegister();
						return _specialProps[p].parse(t, e, p, cssp, pt, plugin, vars);
					}});
				}
			};


		p = SpecialProp.prototype;

		/**
		 * Alias for _parseComplex() that automatically plugs in certain values for this SpecialProp, like its property name, whether or not colors should be sensed, the default value, and priority. It also looks for any keyword that the SpecialProp defines (like "inset" for boxShadow) and ensures that the beginning and ending values have the same number of values for SpecialProps where multi is true (like boxShadow and textShadow can have a comma-delimited list)
		 * @param {!Object} t target element
		 * @param {(string|number|object)} b beginning value
		 * @param {(string|number|object)} e ending (destination) value
		 * @param {CSSPropTween=} pt next CSSPropTween in the linked list
		 * @param {TweenPlugin=} plugin If another plugin will be tweening the complex value, that TweenPlugin instance goes here.
		 * @param {function=} setRatio If a custom setRatio() method should be used to handle this complex value, that goes here.
		 * @return {CSSPropTween=} First CSSPropTween in the linked list
		 */
		p.parseComplex = function(t, b, e, pt, plugin, setRatio) {
			var kwd = this.keyword,
				i, ba, ea, l, bi, ei;
			//if this SpecialProp's value can contain a comma-delimited list of values (like boxShadow or textShadow), we must parse them in a special way, and look for a keyword (like "inset" for boxShadow) and ensure that the beginning and ending BOTH have it if the end defines it as such. We also must ensure that there are an equal number of values specified (we can't tween 1 boxShadow to 3 for example)
			if (this.multi) if (_commasOutsideParenExp.test(e) || _commasOutsideParenExp.test(b)) {
				ba = b.replace(_commasOutsideParenExp, "|").split("|");
				ea = e.replace(_commasOutsideParenExp, "|").split("|");
			} else if (kwd) {
				ba = [b];
				ea = [e];
			}
			if (ea) {
				l = (ea.length > ba.length) ? ea.length : ba.length;
				for (i = 0; i < l; i++) {
					b = ba[i] = ba[i] || this.dflt;
					e = ea[i] = ea[i] || this.dflt;
					if (kwd) {
						bi = b.indexOf(kwd);
						ei = e.indexOf(kwd);
						if (bi !== ei) {
							if (ei === -1) { //if the keyword isn't in the end value, remove it from the beginning one.
								ba[i] = ba[i].split(kwd).join("");
							} else if (bi === -1) { //if the keyword isn't in the beginning, add it.
								ba[i] += " " + kwd;
							}
						}
					}
				}
				b = ba.join(", ");
				e = ea.join(", ");
			}
			return _parseComplex(t, this.p, b, e, this.clrs, this.dflt, pt, this.pr, plugin, setRatio);
		};

		/**
		 * Accepts a target and end value and spits back a CSSPropTween that has been inserted into the CSSPlugin's linked list and conforms with all the conventions we use internally, like type:-1, 0, 1, or 2, setting up any extra property tweens, priority, etc. For example, if we have a boxShadow SpecialProp and call:
		 * this._firstPT = sp.parse(element, "5px 10px 20px rgb(2550,102,51)", "boxShadow", this);
		 * It should figure out the starting value of the element's boxShadow, compare it to the provided end value and create all the necessary CSSPropTweens of the appropriate types to tween the boxShadow. The CSSPropTween that gets spit back should already be inserted into the linked list (the 4th parameter is the current head, so prepend to that).
		 * @param {!Object} t Target object whose property is being tweened
		 * @param {Object} e End value as provided in the vars object (typically a string, but not always - like a throwProps would be an object).
		 * @param {!string} p Property name
		 * @param {!CSSPlugin} cssp The CSSPlugin instance that should be associated with this tween.
		 * @param {?CSSPropTween} pt The CSSPropTween that is the current head of the linked list (we'll prepend to it)
		 * @param {TweenPlugin=} plugin If a plugin will be used to tween the parsed value, this is the plugin instance.
		 * @param {Object=} vars Original vars object that contains the data for parsing.
		 * @return {CSSPropTween} The first CSSPropTween in the linked list which includes the new one(s) added by the parse() call.
		 */
		p.parse = function(t, e, p, cssp, pt, plugin, vars) {
			return this.parseComplex(t.style, this.format(_getStyle(t, this.p, _cs, false, this.dflt)), this.format(e), pt, plugin);
		};

		/**
		 * Registers a special property that should be intercepted from any "css" objects defined in tweens. This allows you to handle them however you want without CSSPlugin doing it for you. The 2nd parameter should be a function that accepts 3 parameters:
		 *  1) Target object whose property should be tweened (typically a DOM element)
		 *  2) The end/destination value (could be a string, number, object, or whatever you want)
		 *  3) The tween instance (you probably don't need to worry about this, but it can be useful for looking up information like the duration)
		 *
		 * Then, your function should return a function which will be called each time the tween gets rendered, passing a numeric "ratio" parameter to your function that indicates the change factor (usually between 0 and 1). For example:
		 *
		 * CSSPlugin.registerSpecialProp("myCustomProp", function(target, value, tween) {
		 *      var start = target.style.width;
		 *      return function(ratio) {
		 *              target.style.width = (start + value * ratio) + "px";
		 *              console.log("set width to " + target.style.width);
		 *          }
		 * }, 0);
		 *
		 * Then, when I do this tween, it will trigger my special property:
		 *
		 * TweenLite.to(element, 1, {css:{myCustomProp:100}});
		 *
		 * In the example, of course, we're just changing the width, but you can do anything you want.
		 *
		 * @param {!string} name Property name (or comma-delimited list of property names) that should be intercepted and handled by your function. For example, if I define "myCustomProp", then it would handle that portion of the following tween: TweenLite.to(element, 1, {css:{myCustomProp:100}})
		 * @param {!function(Object, Object, Object, string):function(number)} onInitTween The function that will be called when a tween of this special property is performed. The function will receive 4 parameters: 1) Target object that should be tweened, 2) Value that was passed to the tween, 3) The tween instance itself (rarely used), and 4) The property name that's being tweened. Your function should return a function that should be called on every update of the tween. That function will receive a single parameter that is a "change factor" value (typically between 0 and 1) indicating the amount of change as a ratio. You can use this to determine how to set the values appropriately in your function.
		 * @param {number=} priority Priority that helps the engine determine the order in which to set the properties (default: 0). Higher priority properties will be updated before lower priority ones.
		 */
		CSSPlugin.registerSpecialProp = function(name, onInitTween, priority) {
			_registerComplexSpecialProp(name, {parser:function(t, e, p, cssp, pt, plugin, vars) {
				var rv = new CSSPropTween(t, p, 0, 0, pt, 2, p, false, priority);
				rv.plugin = plugin;
				rv.setRatio = onInitTween(t, e, cssp._tween, p);
				return rv;
			}, priority:priority});
		};






		//transform-related methods and properties
		CSSPlugin.useSVGTransformAttr = _isSafari || _isFirefox; //Safari and Firefox both have some rendering bugs when applying CSS transforms to SVG elements, so default to using the "transform" attribute instead (users can override this).
		var _transformProps = ("scaleX,scaleY,scaleZ,x,y,z,skewX,skewY,rotation,rotationX,rotationY,perspective,xPercent,yPercent").split(","),
			_transformProp = _checkPropPrefix("transform"), //the Javascript (camelCase) transform property, like msTransform, WebkitTransform, MozTransform, or OTransform.
			_transformPropCSS = _prefixCSS + "transform",
			_transformOriginProp = _checkPropPrefix("transformOrigin"),
			_supports3D = (_checkPropPrefix("perspective") !== null),
			Transform = _internals.Transform = function() {
				this.perspective = parseFloat(CSSPlugin.defaultTransformPerspective) || 0;
				this.force3D = (CSSPlugin.defaultForce3D === false || !_supports3D) ? false : CSSPlugin.defaultForce3D || "auto";
			},
			_SVGElement = window.SVGElement,
			_useSVGTransformAttr,
			//Some browsers (like Firefox and IE) don't honor transform-origin properly in SVG elements, so we need to manually adjust the matrix accordingly. We feature detect here rather than always doing the conversion for certain browsers because they may fix the problem at some point in the future.

			_createSVG = function(type, container, attributes) {
				var element = _doc.createElementNS("http://www.w3.org/2000/svg", type),
					reg = /([a-z])([A-Z])/g,
					p;
				for (p in attributes) {
					element.setAttributeNS(null, p.replace(reg, "$1-$2").toLowerCase(), attributes[p]);
				}
				container.appendChild(element);
				return element;
			},
			_docElement = _doc.documentElement,
			_forceSVGTransformAttr = (function() {
				//IE and Android stock don't support CSS transforms on SVG elements, so we must write them to the "transform" attribute. We populate this variable in the _parseTransform() method, and only if/when we come across an SVG element
				var force = _ieVers || (/Android/i.test(_agent) && !window.chrome),
					svg, rect, width;
				if (_doc.createElementNS && !force) { //IE8 and earlier doesn't support SVG anyway
					svg = _createSVG("svg", _docElement);
					rect = _createSVG("rect", svg, {width:100, height:50, x:100});
					width = rect.getBoundingClientRect().width;
					rect.style[_transformOriginProp] = "50% 50%";
					rect.style[_transformProp] = "scaleX(0.5)";
					force = (width === rect.getBoundingClientRect().width && !(_isFirefox && _supports3D)); //note: Firefox fails the test even though it does support CSS transforms in 3D. Since we can't push 3D stuff into the transform attribute, we force Firefox to pass the test here (as long as it does truly support 3D).
					_docElement.removeChild(svg);
				}
				return force;
			})(),
			_parseSVGOrigin = function(e, local, decoratee, absolute, smoothOrigin) {
				var tm = e._gsTransform,
					m = _getMatrix(e, true),
					v, x, y, xOrigin, yOrigin, a, b, c, d, tx, ty, determinant, xOriginOld, yOriginOld;
				if (tm) {
					xOriginOld = tm.xOrigin; //record the original values before we alter them.
					yOriginOld = tm.yOrigin;
				}
				if (!absolute || (v = absolute.split(" ")).length < 2) {
					b = e.getBBox();
					local = _parsePosition(local).split(" ");
					v = [(local[0].indexOf("%") !== -1 ? parseFloat(local[0]) / 100 * b.width : parseFloat(local[0])) + b.x,
						 (local[1].indexOf("%") !== -1 ? parseFloat(local[1]) / 100 * b.height : parseFloat(local[1])) + b.y];
				}
				decoratee.xOrigin = xOrigin = parseFloat(v[0]);
				decoratee.yOrigin = yOrigin = parseFloat(v[1]);
				if (absolute && m !== _identity2DMatrix) { //if svgOrigin is being set, we must invert the matrix and determine where the absolute point is, factoring in the current transforms. Otherwise, the svgOrigin would be based on the element's non-transformed position on the canvas.
					a = m[0];
					b = m[1];
					c = m[2];
					d = m[3];
					tx = m[4];
					ty = m[5];
					determinant = (a * d - b * c);
					x = xOrigin * (d / determinant) + yOrigin * (-c / determinant) + ((c * ty - d * tx) / determinant);
					y = xOrigin * (-b / determinant) + yOrigin * (a / determinant) - ((a * ty - b * tx) / determinant);
					xOrigin = decoratee.xOrigin = v[0] = x;
					yOrigin = decoratee.yOrigin = v[1] = y;
				}
				if (tm) { //avoid jump when transformOrigin is changed - adjust the x/y values accordingly
					if (smoothOrigin || (smoothOrigin !== false && CSSPlugin.defaultSmoothOrigin !== false)) {
						x = xOrigin - xOriginOld;
						y = yOrigin - yOriginOld;
						//originally, we simply adjusted the x and y values, but that would cause problems if, for example, you created a rotational tween part-way through an x/y tween. Managing the offset in a separate variable gives us ultimate flexibility.
						//tm.x -= x - (x * m[0] + y * m[2]);
						//tm.y -= y - (x * m[1] + y * m[3]);
						tm.xOffset += (x * m[0] + y * m[2]) - x;
						tm.yOffset += (x * m[1] + y * m[3]) - y;
					} else {
						tm.xOffset = tm.yOffset = 0;
					}
				}
				e.setAttribute("data-svg-origin", v.join(" "));
			},
			_isSVG = function(e) {
				return !!(_SVGElement && typeof(e.getBBox) === "function" && e.getCTM && (!e.parentNode || (e.parentNode.getBBox && e.parentNode.getCTM)));
			},
			_identity2DMatrix = [1,0,0,1,0,0],
			_getMatrix = function(e, force2D) {
				var tm = e._gsTransform || new Transform(),
					rnd = 100000,
					isDefault, s, m, n, dec;
				if (_transformProp) {
					s = _getStyle(e, _transformPropCSS, null, true);
				} else if (e.currentStyle) {
					//for older versions of IE, we need to interpret the filter portion that is in the format: progid:DXImageTransform.Microsoft.Matrix(M11=6.123233995736766e-17, M12=-1, M21=1, M22=6.123233995736766e-17, sizingMethod='auto expand') Notice that we need to swap b and c compared to a normal matrix.
					s = e.currentStyle.filter.match(_ieGetMatrixExp);
					s = (s && s.length === 4) ? [s[0].substr(4), Number(s[2].substr(4)), Number(s[1].substr(4)), s[3].substr(4), (tm.x || 0), (tm.y || 0)].join(",") : "";
				}
				isDefault = (!s || s === "none" || s === "matrix(1, 0, 0, 1, 0, 0)");
				if (tm.svg || (e.getBBox && _isSVG(e))) {
					if (isDefault && (e.style[_transformProp] + "").indexOf("matrix") !== -1) { //some browsers (like Chrome 40) don't correctly report transforms that are applied inline on an SVG element (they don't get included in the computed style), so we double-check here and accept matrix values
						s = e.style[_transformProp];
						isDefault = 0;
					}
					m = e.getAttribute("transform");
					if (isDefault && m) {
						if (m.indexOf("matrix") !== -1) { //just in case there's a "transform" value specified as an attribute instead of CSS style. Accept either a matrix() or simple translate() value though.
							s = m;
							isDefault = 0;
						} else if (m.indexOf("translate") !== -1) {
							s = "matrix(1,0,0,1," + m.match(/(?:\-|\b)[\d\-\.e]+\b/gi).join(",") + ")";
							isDefault = 0;
						}
					}
				}
				if (isDefault) {
					return _identity2DMatrix;
				}
				//split the matrix values out into an array (m for matrix)
				m = (s || "").match(/(?:\-|\b)[\d\-\.e]+\b/gi) || [];
				i = m.length;
				while (--i > -1) {
					n = Number(m[i]);
					m[i] = (dec = n - (n |= 0)) ? ((dec * rnd + (dec < 0 ? -0.5 : 0.5)) | 0) / rnd + n : n; //convert strings to Numbers and round to 5 decimal places to avoid issues with tiny numbers. Roughly 20x faster than Number.toFixed(). We also must make sure to round before dividing so that values like 0.9999999999 become 1 to avoid glitches in browser rendering and interpretation of flipped/rotated 3D matrices. And don't just multiply the number by rnd, floor it, and then divide by rnd because the bitwise operations max out at a 32-bit signed integer, thus it could get clipped at a relatively low value (like 22,000.00000 for example).
				}
				return (force2D && m.length > 6) ? [m[0], m[1], m[4], m[5], m[12], m[13]] : m;
			},

			/**
			 * Parses the transform values for an element, returning an object with x, y, z, scaleX, scaleY, scaleZ, rotation, rotationX, rotationY, skewX, and skewY properties. Note: by default (for performance reasons), all skewing is combined into skewX and rotation but skewY still has a place in the transform object so that we can record how much of the skew is attributed to skewX vs skewY. Remember, a skewY of 10 looks the same as a rotation of 10 and skewX of -10.
			 * @param {!Object} t target element
			 * @param {Object=} cs computed style object (optional)
			 * @param {boolean=} rec if true, the transform values will be recorded to the target element's _gsTransform object, like target._gsTransform = {x:0, y:0, z:0, scaleX:1...}
			 * @param {boolean=} parse if true, we'll ignore any _gsTransform values that already exist on the element, and force a reparsing of the css (calculated style)
			 * @return {object} object containing all of the transform properties/values like {x:0, y:0, z:0, scaleX:1...}
			 */
			_getTransform = _internals.getTransform = function(t, cs, rec, parse) {
				if (t._gsTransform && rec && !parse) {
					return t._gsTransform; //if the element already has a _gsTransform, use that. Note: some browsers don't accurately return the calculated style for the transform (particularly for SVG), so it's almost always safest to just use the values we've already applied rather than re-parsing things.
				}
				var tm = rec ? t._gsTransform || new Transform() : new Transform(),
					invX = (tm.scaleX < 0), //in order to interpret things properly, we need to know if the user applied a negative scaleX previously so that we can adjust the rotation and skewX accordingly. Otherwise, if we always interpret a flipped matrix as affecting scaleY and the user only wants to tween the scaleX on multiple sequential tweens, it would keep the negative scaleY without that being the user's intent.
					min = 0.00002,
					rnd = 100000,
					zOrigin = _supports3D ? parseFloat(_getStyle(t, _transformOriginProp, cs, false, "0 0 0").split(" ")[2]) || tm.zOrigin  || 0 : 0,
					defaultTransformPerspective = parseFloat(CSSPlugin.defaultTransformPerspective) || 0,
					m, i, scaleX, scaleY, rotation, skewX;

				tm.svg = !!(t.getBBox && _isSVG(t));
				if (tm.svg) {
					_parseSVGOrigin(t, _getStyle(t, _transformOriginProp, _cs, false, "50% 50%") + "", tm, t.getAttribute("data-svg-origin"));
					_useSVGTransformAttr = CSSPlugin.useSVGTransformAttr || _forceSVGTransformAttr;
				}
				m = _getMatrix(t);
				if (m !== _identity2DMatrix) {

					if (m.length === 16) {
						//we'll only look at these position-related 6 variables first because if x/y/z all match, it's relatively safe to assume we don't need to re-parse everything which risks losing important rotational information (like rotationX:180 plus rotationY:180 would look the same as rotation:180 - there's no way to know for sure which direction was taken based solely on the matrix3d() values)
						var a11 = m[0], a21 = m[1], a31 = m[2], a41 = m[3],
							a12 = m[4], a22 = m[5], a32 = m[6], a42 = m[7],
							a13 = m[8], a23 = m[9], a33 = m[10],
							a14 = m[12], a24 = m[13], a34 = m[14],
							a43 = m[11],
							angle = Math.atan2(a32, a33),
							t1, t2, t3, t4, cos, sin;

						//we manually compensate for non-zero z component of transformOrigin to work around bugs in Safari
						if (tm.zOrigin) {
							a34 = -tm.zOrigin;
							a14 = a13*a34-m[12];
							a24 = a23*a34-m[13];
							a34 = a33*a34+tm.zOrigin-m[14];
						}
						tm.rotationX = angle * _RAD2DEG;
						//rotationX
						if (angle) {
							cos = Math.cos(-angle);
							sin = Math.sin(-angle);
							t1 = a12*cos+a13*sin;
							t2 = a22*cos+a23*sin;
							t3 = a32*cos+a33*sin;
							a13 = a12*-sin+a13*cos;
							a23 = a22*-sin+a23*cos;
							a33 = a32*-sin+a33*cos;
							a43 = a42*-sin+a43*cos;
							a12 = t1;
							a22 = t2;
							a32 = t3;
						}
						//rotationY
						angle = Math.atan2(-a31, a33);
						tm.rotationY = angle * _RAD2DEG;
						if (angle) {
							cos = Math.cos(-angle);
							sin = Math.sin(-angle);
							t1 = a11*cos-a13*sin;
							t2 = a21*cos-a23*sin;
							t3 = a31*cos-a33*sin;
							a23 = a21*sin+a23*cos;
							a33 = a31*sin+a33*cos;
							a43 = a41*sin+a43*cos;
							a11 = t1;
							a21 = t2;
							a31 = t3;
						}
						//rotationZ
						angle = Math.atan2(a21, a11);
						tm.rotation = angle * _RAD2DEG;
						if (angle) {
							cos = Math.cos(-angle);
							sin = Math.sin(-angle);
							a11 = a11*cos+a12*sin;
							t2 = a21*cos+a22*sin;
							a22 = a21*-sin+a22*cos;
							a32 = a31*-sin+a32*cos;
							a21 = t2;
						}

						if (tm.rotationX && Math.abs(tm.rotationX) + Math.abs(tm.rotation) > 359.9) { //when rotationY is set, it will often be parsed as 180 degrees different than it should be, and rotationX and rotation both being 180 (it looks the same), so we adjust for that here.
							tm.rotationX = tm.rotation = 0;
							tm.rotationY = 180 - tm.rotationY;
						}

						tm.scaleX = ((Math.sqrt(a11 * a11 + a21 * a21) * rnd + 0.5) | 0) / rnd;
						tm.scaleY = ((Math.sqrt(a22 * a22 + a23 * a23) * rnd + 0.5) | 0) / rnd;
						tm.scaleZ = ((Math.sqrt(a32 * a32 + a33 * a33) * rnd + 0.5) | 0) / rnd;
						tm.skewX = 0;
						tm.perspective = a43 ? 1 / ((a43 < 0) ? -a43 : a43) : 0;
						tm.x = a14;
						tm.y = a24;
						tm.z = a34;
						if (tm.svg) {
							tm.x -= tm.xOrigin - (tm.xOrigin * a11 - tm.yOrigin * a12);
							tm.y -= tm.yOrigin - (tm.yOrigin * a21 - tm.xOrigin * a22);
						}

					} else if ((!_supports3D || parse || !m.length || tm.x !== m[4] || tm.y !== m[5] || (!tm.rotationX && !tm.rotationY)) && !(tm.x !== undefined && _getStyle(t, "display", cs) === "none")) { //sometimes a 6-element matrix is returned even when we performed 3D transforms, like if rotationX and rotationY are 180. In cases like this, we still need to honor the 3D transforms. If we just rely on the 2D info, it could affect how the data is interpreted, like scaleY might get set to -1 or rotation could get offset by 180 degrees. For example, do a TweenLite.to(element, 1, {css:{rotationX:180, rotationY:180}}) and then later, TweenLite.to(element, 1, {css:{rotationX:0}}) and without this conditional logic in place, it'd jump to a state of being unrotated when the 2nd tween starts. Then again, we need to honor the fact that the user COULD alter the transforms outside of CSSPlugin, like by manually applying new css, so we try to sense that by looking at x and y because if those changed, we know the changes were made outside CSSPlugin and we force a reinterpretation of the matrix values. Also, in Webkit browsers, if the element's "display" is "none", its calculated style value will always return empty, so if we've already recorded the values in the _gsTransform object, we'll just rely on those.
						var k = (m.length >= 6),
							a = k ? m[0] : 1,
							b = m[1] || 0,
							c = m[2] || 0,
							d = k ? m[3] : 1;
						tm.x = m[4] || 0;
						tm.y = m[5] || 0;
						scaleX = Math.sqrt(a * a + b * b);
						scaleY = Math.sqrt(d * d + c * c);
						rotation = (a || b) ? Math.atan2(b, a) * _RAD2DEG : tm.rotation || 0; //note: if scaleX is 0, we cannot accurately measure rotation. Same for skewX with a scaleY of 0. Therefore, we default to the previously recorded value (or zero if that doesn't exist).
						skewX = (c || d) ? Math.atan2(c, d) * _RAD2DEG + rotation : tm.skewX || 0;
						if (Math.abs(skewX) > 90 && Math.abs(skewX) < 270) {
							if (invX) {
								scaleX *= -1;
								skewX += (rotation <= 0) ? 180 : -180;
								rotation += (rotation <= 0) ? 180 : -180;
							} else {
								scaleY *= -1;
								skewX += (skewX <= 0) ? 180 : -180;
							}
						}
						tm.scaleX = scaleX;
						tm.scaleY = scaleY;
						tm.rotation = rotation;
						tm.skewX = skewX;
						if (_supports3D) {
							tm.rotationX = tm.rotationY = tm.z = 0;
							tm.perspective = defaultTransformPerspective;
							tm.scaleZ = 1;
						}
						if (tm.svg) {
							tm.x -= tm.xOrigin - (tm.xOrigin * a + tm.yOrigin * c);
							tm.y -= tm.yOrigin - (tm.xOrigin * b + tm.yOrigin * d);
						}
					}
					tm.zOrigin = zOrigin;
					//some browsers have a hard time with very small values like 2.4492935982947064e-16 (notice the "e-" towards the end) and would render the object slightly off. So we round to 0 in these cases. The conditional logic here is faster than calling Math.abs(). Also, browsers tend to render a SLIGHTLY rotated object in a fuzzy way, so we need to snap to exactly 0 when appropriate.
					for (i in tm) {
						if (tm[i] < min) if (tm[i] > -min) {
							tm[i] = 0;
						}
					}
				}
				//DEBUG: _log("parsed rotation of " + t.getAttribute("id")+": "+(tm.rotationX)+", "+(tm.rotationY)+", "+(tm.rotation)+", scale: "+tm.scaleX+", "+tm.scaleY+", "+tm.scaleZ+", position: "+tm.x+", "+tm.y+", "+tm.z+", perspective: "+tm.perspective+ ", origin: "+ tm.xOrigin+ ","+ tm.yOrigin);
				if (rec) {
					t._gsTransform = tm; //record to the object's _gsTransform which we use so that tweens can control individual properties independently (we need all the properties to accurately recompose the matrix in the setRatio() method)
					if (tm.svg) { //if we're supposed to apply transforms to the SVG element's "transform" attribute, make sure there aren't any CSS transforms applied or they'll override the attribute ones. Also clear the transform attribute if we're using CSS, just to be clean.
						if (_useSVGTransformAttr && t.style[_transformProp]) {
							TweenLite.delayedCall(0.001, function(){ //if we apply this right away (before anything has rendered), we risk there being no transforms for a brief moment and it also interferes with adjusting the transformOrigin in a tween with immediateRender:true (it'd try reading the matrix and it wouldn't have the appropriate data in place because we just removed it).
								_removeProp(t.style, _transformProp);
							});
						} else if (!_useSVGTransformAttr && t.getAttribute("transform")) {
							TweenLite.delayedCall(0.001, function(){
								t.removeAttribute("transform");
							});
						}
					}
				}
				return tm;
			},

			//for setting 2D transforms in IE6, IE7, and IE8 (must use a "filter" to emulate the behavior of modern day browser transforms)
			_setIETransformRatio = function(v) {
				var t = this.data, //refers to the element's _gsTransform object
					ang = -t.rotation * _DEG2RAD,
					skew = ang + t.skewX * _DEG2RAD,
					rnd = 100000,
					a = ((Math.cos(ang) * t.scaleX * rnd) | 0) / rnd,
					b = ((Math.sin(ang) * t.scaleX * rnd) | 0) / rnd,
					c = ((Math.sin(skew) * -t.scaleY * rnd) | 0) / rnd,
					d = ((Math.cos(skew) * t.scaleY * rnd) | 0) / rnd,
					style = this.t.style,
					cs = this.t.currentStyle,
					filters, val;
				if (!cs) {
					return;
				}
				val = b; //just for swapping the variables an inverting them (reused "val" to avoid creating another variable in memory). IE's filter matrix uses a non-standard matrix configuration (angle goes the opposite way, and b and c are reversed and inverted)
				b = -c;
				c = -val;
				filters = cs.filter;
				style.filter = ""; //remove filters so that we can accurately measure offsetWidth/offsetHeight
				var w = this.t.offsetWidth,
					h = this.t.offsetHeight,
					clip = (cs.position !== "absolute"),
					m = "progid:DXImageTransform.Microsoft.Matrix(M11=" + a + ", M12=" + b + ", M21=" + c + ", M22=" + d,
					ox = t.x + (w * t.xPercent / 100),
					oy = t.y + (h * t.yPercent / 100),
					dx, dy;

				//if transformOrigin is being used, adjust the offset x and y
				if (t.ox != null) {
					dx = ((t.oxp) ? w * t.ox * 0.01 : t.ox) - w / 2;
					dy = ((t.oyp) ? h * t.oy * 0.01 : t.oy) - h / 2;
					ox += dx - (dx * a + dy * b);
					oy += dy - (dx * c + dy * d);
				}

				if (!clip) {
					m += ", sizingMethod='auto expand')";
				} else {
					dx = (w / 2);
					dy = (h / 2);
					//translate to ensure that transformations occur around the correct origin (default is center).
					m += ", Dx=" + (dx - (dx * a + dy * b) + ox) + ", Dy=" + (dy - (dx * c + dy * d) + oy) + ")";
				}
				if (filters.indexOf("DXImageTransform.Microsoft.Matrix(") !== -1) {
					style.filter = filters.replace(_ieSetMatrixExp, m);
				} else {
					style.filter = m + " " + filters; //we must always put the transform/matrix FIRST (before alpha(opacity=xx)) to avoid an IE bug that slices part of the object when rotation is applied with alpha.
				}

				//at the end or beginning of the tween, if the matrix is normal (1, 0, 0, 1) and opacity is 100 (or doesn't exist), remove the filter to improve browser performance.
				if (v === 0 || v === 1) if (a === 1) if (b === 0) if (c === 0) if (d === 1) if (!clip || m.indexOf("Dx=0, Dy=0") !== -1) if (!_opacityExp.test(filters) || parseFloat(RegExp.$1) === 100) if (filters.indexOf("gradient(" && filters.indexOf("Alpha")) === -1) {
					style.removeAttribute("filter");
				}

				//we must set the margins AFTER applying the filter in order to avoid some bugs in IE8 that could (in rare scenarios) cause them to be ignored intermittently (vibration).
				if (!clip) {
					var mult = (_ieVers < 8) ? 1 : -1, //in Internet Explorer 7 and before, the box model is broken, causing the browser to treat the width/height of the actual rotated filtered image as the width/height of the box itself, but Microsoft corrected that in IE8. We must use a negative offset in IE8 on the right/bottom
						marg, prop, dif;
					dx = t.ieOffsetX || 0;
					dy = t.ieOffsetY || 0;
					t.ieOffsetX = Math.round((w - ((a < 0 ? -a : a) * w + (b < 0 ? -b : b) * h)) / 2 + ox);
					t.ieOffsetY = Math.round((h - ((d < 0 ? -d : d) * h + (c < 0 ? -c : c) * w)) / 2 + oy);
					for (i = 0; i < 4; i++) {
						prop = _margins[i];
						marg = cs[prop];
						//we need to get the current margin in case it is being tweened separately (we want to respect that tween's changes)
						val = (marg.indexOf("px") !== -1) ? parseFloat(marg) : _convertToPixels(this.t, prop, parseFloat(marg), marg.replace(_suffixExp, "")) || 0;
						if (val !== t[prop]) {
							dif = (i < 2) ? -t.ieOffsetX : -t.ieOffsetY; //if another tween is controlling a margin, we cannot only apply the difference in the ieOffsets, so we essentially zero-out the dx and dy here in that case. We record the margin(s) later so that we can keep comparing them, making this code very flexible.
						} else {
							dif = (i < 2) ? dx - t.ieOffsetX : dy - t.ieOffsetY;
						}
						style[prop] = (t[prop] = Math.round( val - dif * ((i === 0 || i === 2) ? 1 : mult) )) + "px";
					}
				}
			},

			/* translates a super small decimal to a string WITHOUT scientific notation
			_safeDecimal = function(n) {
				var s = (n < 0 ? -n : n) + "",
					a = s.split("e-");
				return (n < 0 ? "-0." : "0.") + new Array(parseInt(a[1], 10) || 0).join("0") + a[0].split(".").join("");
			},
			*/

			_setTransformRatio = _internals.set3DTransformRatio = _internals.setTransformRatio = function(v) {
				var t = this.data, //refers to the element's _gsTransform object
					style = this.t.style,
					angle = t.rotation,
					rotationX = t.rotationX,
					rotationY = t.rotationY,
					sx = t.scaleX,
					sy = t.scaleY,
					sz = t.scaleZ,
					x = t.x,
					y = t.y,
					z = t.z,
					isSVG = t.svg,
					perspective = t.perspective,
					force3D = t.force3D,
					a11, a12, a13, a21, a22, a23, a31, a32, a33, a41, a42, a43,
					zOrigin, min, cos, sin, t1, t2, transform, comma, zero, skew, rnd;
				//check to see if we should render as 2D (and SVGs must use 2D when _useSVGTransformAttr is true)
				if (((((v === 1 || v === 0) && force3D === "auto" && (this.tween._totalTime === this.tween._totalDuration || !this.tween._totalTime)) || !force3D) && !z && !perspective && !rotationY && !rotationX && sz === 1) || (_useSVGTransformAttr && isSVG) || !_supports3D) { //on the final render (which could be 0 for a from tween), if there are no 3D aspects, render in 2D to free up memory and improve performance especially on mobile devices. Check the tween's totalTime/totalDuration too in order to make sure it doesn't happen between repeats if it's a repeating tween.

					//2D
					if (angle || t.skewX || isSVG) {
						angle *= _DEG2RAD;
						skew = t.skewX * _DEG2RAD;
						rnd = 100000;
						a11 = Math.cos(angle) * sx;
						a21 = Math.sin(angle) * sx;
						a12 = Math.sin(angle - skew) * -sy;
						a22 = Math.cos(angle - skew) * sy;
						if (skew && t.skewType === "simple") { //by default, we compensate skewing on the other axis to make it look more natural, but you can set the skewType to "simple" to use the uncompensated skewing that CSS does
							t1 = Math.tan(skew);
							t1 = Math.sqrt(1 + t1 * t1);
							a12 *= t1;
							a22 *= t1;
							if (t.skewY) {
								a11 *= t1;
								a21 *= t1;
							}
						}
						if (isSVG) {
							x += t.xOrigin - (t.xOrigin * a11 + t.yOrigin * a12) + t.xOffset;
							y += t.yOrigin - (t.xOrigin * a21 + t.yOrigin * a22) + t.yOffset;
							if (_useSVGTransformAttr && (t.xPercent || t.yPercent)) { //The SVG spec doesn't support percentage-based translation in the "transform" attribute, so we merge it into the matrix to simulate it.
								min = this.t.getBBox();
								x += t.xPercent * 0.01 * min.width;
								y += t.yPercent * 0.01 * min.height;
							}
							min = 0.000001;
							if (x < min) if (x > -min) {
								x = 0;
							}
							if (y < min) if (y > -min) {
								y = 0;
							}
						}
						transform = (((a11 * rnd) | 0) / rnd) + "," + (((a21 * rnd) | 0) / rnd) + "," + (((a12 * rnd) | 0) / rnd) + "," + (((a22 * rnd) | 0) / rnd) + "," + x + "," + y + ")";
						if (isSVG && _useSVGTransformAttr) {
							this.t.setAttribute("transform", "matrix(" + transform);
						} else {
							//some browsers have a hard time with very small values like 2.4492935982947064e-16 (notice the "e-" towards the end) and would render the object slightly off. So we round to 5 decimal places.
							style[_transformProp] = ((t.xPercent || t.yPercent) ? "translate(" + t.xPercent + "%," + t.yPercent + "%) matrix(" : "matrix(") + transform;
						}
					} else {
						style[_transformProp] = ((t.xPercent || t.yPercent) ? "translate(" + t.xPercent + "%," + t.yPercent + "%) matrix(" : "matrix(") + sx + ",0,0," + sy + "," + x + "," + y + ")";
					}
					return;

				}
				if (_isFirefox) { //Firefox has a bug (at least in v25) that causes it to render the transparent part of 32-bit PNG images as black when displayed inside an iframe and the 3D scale is very small and doesn't change sufficiently enough between renders (like if you use a Power4.easeInOut to scale from 0 to 1 where the beginning values only change a tiny amount to begin the tween before accelerating). In this case, we force the scale to be 0.00002 instead which is visually the same but works around the Firefox issue.
					min = 0.0001;
					if (sx < min && sx > -min) {
						sx = sz = 0.00002;
					}
					if (sy < min && sy > -min) {
						sy = sz = 0.00002;
					}
					if (perspective && !t.z && !t.rotationX && !t.rotationY) { //Firefox has a bug that causes elements to have an odd super-thin, broken/dotted black border on elements that have a perspective set but aren't utilizing 3D space (no rotationX, rotationY, or z).
						perspective = 0;
					}
				}
				if (angle || t.skewX) {
					angle *= _DEG2RAD;
					cos = a11 = Math.cos(angle);
					sin = a21 = Math.sin(angle);
					if (t.skewX) {
						angle -= t.skewX * _DEG2RAD;
						cos = Math.cos(angle);
						sin = Math.sin(angle);
						if (t.skewType === "simple") { //by default, we compensate skewing on the other axis to make it look more natural, but you can set the skewType to "simple" to use the uncompensated skewing that CSS does
							t1 = Math.tan(t.skewX * _DEG2RAD);
							t1 = Math.sqrt(1 + t1 * t1);
							cos *= t1;
							sin *= t1;
							if (t.skewY) {
								a11 *= t1;
								a21 *= t1;
							}
						}
					}
					a12 = -sin;
					a22 = cos;

				} else if (!rotationY && !rotationX && sz === 1 && !perspective && !isSVG) { //if we're only translating and/or 2D scaling, this is faster...
					style[_transformProp] = ((t.xPercent || t.yPercent) ? "translate(" + t.xPercent + "%," + t.yPercent + "%) translate3d(" : "translate3d(") + x + "px," + y + "px," + z +"px)" + ((sx !== 1 || sy !== 1) ? " scale(" + sx + "," + sy + ")" : "");
					return;
				} else {
					a11 = a22 = 1;
					a12 = a21 = 0;
				}
				// KEY  INDEX   AFFECTS
				// a11  0       rotation, rotationY, scaleX
				// a21  1       rotation, rotationY, scaleX
				// a31  2       rotationY, scaleX
				// a41  3       rotationY, scaleX
				// a12  4       rotation, skewX, rotationX, scaleY
				// a22  5       rotation, skewX, rotationX, scaleY
				// a32  6       rotationX, scaleY
				// a42  7       rotationX, scaleY
				// a13  8       rotationY, rotationX, scaleZ
				// a23  9       rotationY, rotationX, scaleZ
				// a33  10      rotationY, rotationX, scaleZ
				// a43  11      rotationY, rotationX, perspective, scaleZ
				// a14  12      x, zOrigin, svgOrigin
				// a24  13      y, zOrigin, svgOrigin
				// a34  14      z, zOrigin
				// a44  15
				// rotation: Math.atan2(a21, a11)
				// rotationY: Math.atan2(a13, a33) (or Math.atan2(a13, a11))
				// rotationX: Math.atan2(a32, a33)
				a33 = 1;
				a13 = a23 = a31 = a32 = a41 = a42 = 0;
				a43 = (perspective) ? -1 / perspective : 0;
				zOrigin = t.zOrigin;
				min = 0.000001; //threshold below which browsers use scientific notation which won't work.
				comma = ",";
				zero = "0";
				angle = rotationY * _DEG2RAD;
				if (angle) {
					cos = Math.cos(angle);
					sin = Math.sin(angle);
					a31 = -sin;
					a41 = a43*-sin;
					a13 = a11*sin;
					a23 = a21*sin;
					a33 = cos;
					a43 *= cos;
					a11 *= cos;
					a21 *= cos;
				}
				angle = rotationX * _DEG2RAD;
				if (angle) {
					cos = Math.cos(angle);
					sin = Math.sin(angle);
					t1 = a12*cos+a13*sin;
					t2 = a22*cos+a23*sin;
					a32 = a33*sin;
					a42 = a43*sin;
					a13 = a12*-sin+a13*cos;
					a23 = a22*-sin+a23*cos;
					a33 = a33*cos;
					a43 = a43*cos;
					a12 = t1;
					a22 = t2;
				}
				if (sz !== 1) {
					a13*=sz;
					a23*=sz;
					a33*=sz;
					a43*=sz;
				}
				if (sy !== 1) {
					a12*=sy;
					a22*=sy;
					a32*=sy;
					a42*=sy;
				}
				if (sx !== 1) {
					a11*=sx;
					a21*=sx;
					a31*=sx;
					a41*=sx;
				}

				if (zOrigin || isSVG) {
					if (zOrigin) {
						x += a13*-zOrigin;
						y += a23*-zOrigin;
						z += a33*-zOrigin+zOrigin;
					}
					if (isSVG) { //due to bugs in some browsers, we need to manage the transform-origin of SVG manually
						x += t.xOrigin - (t.xOrigin * a11 + t.yOrigin * a12) + t.xOffset;
						y += t.yOrigin - (t.xOrigin * a21 + t.yOrigin * a22) + t.yOffset;
					}
					if (x < min && x > -min) {
						x = zero;
					}
					if (y < min && y > -min) {
						y = zero;
					}
					if (z < min && z > -min) {
						z = 0; //don't use string because we calculate perspective later and need the number.
					}
				}

				//optimized way of concatenating all the values into a string. If we do it all in one shot, it's slower because of the way browsers have to create temp strings and the way it affects memory. If we do it piece-by-piece with +=, it's a bit slower too. We found that doing it in these sized chunks works best overall:
				transform = ((t.xPercent || t.yPercent) ? "translate(" + t.xPercent + "%," + t.yPercent + "%) matrix3d(" : "matrix3d(");
				transform += ((a11 < min && a11 > -min) ? zero : a11) + comma + ((a21 < min && a21 > -min) ? zero : a21) + comma + ((a31 < min && a31 > -min) ? zero : a31);
				transform += comma + ((a41 < min && a41 > -min) ? zero : a41) + comma + ((a12 < min && a12 > -min) ? zero : a12) + comma + ((a22 < min && a22 > -min) ? zero : a22);
				if (rotationX || rotationY || sz !== 1) { //performance optimization (often there's no rotationX or rotationY, so we can skip these calculations)
					transform += comma + ((a32 < min && a32 > -min) ? zero : a32) + comma + ((a42 < min && a42 > -min) ? zero : a42) + comma + ((a13 < min && a13 > -min) ? zero : a13);
					transform += comma + ((a23 < min && a23 > -min) ? zero : a23) + comma + ((a33 < min && a33 > -min) ? zero : a33) + comma + ((a43 < min && a43 > -min) ? zero : a43) + comma;
				} else {
					transform += ",0,0,0,0,1,0,";
				}
				transform += x + comma + y + comma + z + comma + (perspective ? (1 + (-z / perspective)) : 1) + ")";

				style[_transformProp] = transform;
			};

		p = Transform.prototype;
		p.x = p.y = p.z = p.skewX = p.skewY = p.rotation = p.rotationX = p.rotationY = p.zOrigin = p.xPercent = p.yPercent = p.xOffset = p.yOffset = 0;
		p.scaleX = p.scaleY = p.scaleZ = 1;

		_registerComplexSpecialProp("transform,scale,scaleX,scaleY,scaleZ,x,y,z,rotation,rotationX,rotationY,rotationZ,skewX,skewY,shortRotation,shortRotationX,shortRotationY,shortRotationZ,transformOrigin,svgOrigin,transformPerspective,directionalRotation,parseTransform,force3D,skewType,xPercent,yPercent,smoothOrigin", {parser:function(t, e, p, cssp, pt, plugin, vars) {
			if (cssp._lastParsedTransform === vars) { return pt; } //only need to parse the transform once, and only if the browser supports it.
			cssp._lastParsedTransform = vars;
			var originalGSTransform = t._gsTransform,
				style = t.style,
				min = 0.000001,
				i = _transformProps.length,
				v = vars,
				endRotations = {},
				transformOriginString = "transformOrigin",
				m1, m2, skewY, copy, orig, has3D, hasChange, dr, x, y;
			if (vars.display) { //if the user is setting display during this tween, it may not be instantiated yet but we must force it here in order to get accurate readings. If display is "none", some browsers refuse to report the transform properties correctly.
				copy = _getStyle(t, "display");
				style.display = "block";
				m1 = _getTransform(t, _cs, true, vars.parseTransform);
				style.display = copy;
			} else {
				m1 = _getTransform(t, _cs, true, vars.parseTransform);
			}
			cssp._transform = m1;
			if (typeof(v.transform) === "string" && _transformProp) { //for values like transform:"rotate(60deg) scale(0.5, 0.8)"
				copy = _tempDiv.style; //don't use the original target because it might be SVG in which case some browsers don't report computed style correctly.
				copy[_transformProp] = v.transform;
				copy.display = "block"; //if display is "none", the browser often refuses to report the transform properties correctly.
				copy.position = "absolute";
				_doc.body.appendChild(_tempDiv);
				m2 = _getTransform(_tempDiv, null, false);
				_doc.body.removeChild(_tempDiv);
				if (!m2.perspective) {
					m2.perspective = m1.perspective; //tweening to no perspective gives very unintuitive results - just keep the same perspective in that case.
				}
				if (v.xPercent != null) {
					m2.xPercent = _parseVal(v.xPercent, m1.xPercent);
				}
				if (v.yPercent != null) {
					m2.yPercent = _parseVal(v.yPercent, m1.yPercent);
				}
			} else if (typeof(v) === "object") { //for values like scaleX, scaleY, rotation, x, y, skewX, and skewY or transform:{...} (object)
				m2 = {scaleX:_parseVal((v.scaleX != null) ? v.scaleX : v.scale, m1.scaleX),
					scaleY:_parseVal((v.scaleY != null) ? v.scaleY : v.scale, m1.scaleY),
					scaleZ:_parseVal(v.scaleZ, m1.scaleZ),
					x:_parseVal(v.x, m1.x),
					y:_parseVal(v.y, m1.y),
					z:_parseVal(v.z, m1.z),
					xPercent:_parseVal(v.xPercent, m1.xPercent),
					yPercent:_parseVal(v.yPercent, m1.yPercent),
					perspective:_parseVal(v.transformPerspective, m1.perspective)};
				dr = v.directionalRotation;
				if (dr != null) {
					if (typeof(dr) === "object") {
						for (copy in dr) {
							v[copy] = dr[copy];
						}
					} else {
						v.rotation = dr;
					}
				}
				if (typeof(v.x) === "string" && v.x.indexOf("%") !== -1) {
					m2.x = 0;
					m2.xPercent = _parseVal(v.x, m1.xPercent);
				}
				if (typeof(v.y) === "string" && v.y.indexOf("%") !== -1) {
					m2.y = 0;
					m2.yPercent = _parseVal(v.y, m1.yPercent);
				}

				m2.rotation = _parseAngle(("rotation" in v) ? v.rotation : ("shortRotation" in v) ? v.shortRotation + "_short" : ("rotationZ" in v) ? v.rotationZ : m1.rotation, m1.rotation, "rotation", endRotations);
				if (_supports3D) {
					m2.rotationX = _parseAngle(("rotationX" in v) ? v.rotationX : ("shortRotationX" in v) ? v.shortRotationX + "_short" : m1.rotationX || 0, m1.rotationX, "rotationX", endRotations);
					m2.rotationY = _parseAngle(("rotationY" in v) ? v.rotationY : ("shortRotationY" in v) ? v.shortRotationY + "_short" : m1.rotationY || 0, m1.rotationY, "rotationY", endRotations);
				}
				m2.skewX = (v.skewX == null) ? m1.skewX : _parseAngle(v.skewX, m1.skewX);

				//note: for performance reasons, we combine all skewing into the skewX and rotation values, ignoring skewY but we must still record it so that we can discern how much of the overall skew is attributed to skewX vs. skewY. Otherwise, if the skewY would always act relative (tween skewY to 10deg, for example, multiple times and if we always combine things into skewX, we can't remember that skewY was 10 from last time). Remember, a skewY of 10 degrees looks the same as a rotation of 10 degrees plus a skewX of -10 degrees.
				m2.skewY = (v.skewY == null) ? m1.skewY : _parseAngle(v.skewY, m1.skewY);
				if ((skewY = m2.skewY - m1.skewY)) {
					m2.skewX += skewY;
					m2.rotation += skewY;
				}
			}
			if (_supports3D && v.force3D != null) {
				m1.force3D = v.force3D;
				hasChange = true;
			}

			m1.skewType = v.skewType || m1.skewType || CSSPlugin.defaultSkewType;

			has3D = (m1.force3D || m1.z || m1.rotationX || m1.rotationY || m2.z || m2.rotationX || m2.rotationY || m2.perspective);
			if (!has3D && v.scale != null) {
				m2.scaleZ = 1; //no need to tween scaleZ.
			}

			while (--i > -1) {
				p = _transformProps[i];
				orig = m2[p] - m1[p];
				if (orig > min || orig < -min || v[p] != null || _forcePT[p] != null) {
					hasChange = true;
					pt = new CSSPropTween(m1, p, m1[p], orig, pt);
					if (p in endRotations) {
						pt.e = endRotations[p]; //directional rotations typically have compensated values during the tween, but we need to make sure they end at exactly what the user requested
					}
					pt.xs0 = 0; //ensures the value stays numeric in setRatio()
					pt.plugin = plugin;
					cssp._overwriteProps.push(pt.n);
				}
			}

			orig = v.transformOrigin;
			if (m1.svg && (orig || v.svgOrigin)) {
				x = m1.xOffset; //when we change the origin, in order to prevent things from jumping we adjust the x/y so we must record those here so that we can create PropTweens for them and flip them at the same time as the origin
				y = m1.yOffset;
				_parseSVGOrigin(t, _parsePosition(orig), m2, v.svgOrigin, v.smoothOrigin);
				pt = _addNonTweeningNumericPT(m1, "xOrigin", (originalGSTransform ? m1 : m2).xOrigin, m2.xOrigin, pt, transformOriginString); //note: if there wasn't a transformOrigin defined yet, just start with the destination one; it's wasteful otherwise, and it causes problems with fromTo() tweens. For example, TweenLite.to("#wheel", 3, {rotation:180, transformOrigin:"50% 50%", delay:1}); TweenLite.fromTo("#wheel", 3, {scale:0.5, transformOrigin:"50% 50%"}, {scale:1, delay:2}); would cause a jump when the from values revert at the beginning of the 2nd tween.
				pt = _addNonTweeningNumericPT(m1, "yOrigin", (originalGSTransform ? m1 : m2).yOrigin, m2.yOrigin, pt, transformOriginString);
				if (x !== m1.xOffset || y !== m1.yOffset) {
					pt = _addNonTweeningNumericPT(m1, "xOffset", (originalGSTransform ? x : m1.xOffset), m1.xOffset, pt, transformOriginString);
					pt = _addNonTweeningNumericPT(m1, "yOffset", (originalGSTransform ? y : m1.yOffset), m1.yOffset, pt, transformOriginString);
				}
				orig = _useSVGTransformAttr ? null : "0px 0px"; //certain browsers (like firefox) completely botch transform-origin, so we must remove it to prevent it from contaminating transforms. We manage it ourselves with xOrigin and yOrigin
			}
			if (orig || (_supports3D && has3D && m1.zOrigin)) { //if anything 3D is happening and there's a transformOrigin with a z component that's non-zero, we must ensure that the transformOrigin's z-component is set to 0 so that we can manually do those calculations to get around Safari bugs. Even if the user didn't specifically define a "transformOrigin" in this particular tween (maybe they did it via css directly).
				if (_transformProp) {
					hasChange = true;
					p = _transformOriginProp;
					orig = (orig || _getStyle(t, p, _cs, false, "50% 50%")) + ""; //cast as string to avoid errors
					pt = new CSSPropTween(style, p, 0, 0, pt, -1, transformOriginString);
					pt.b = style[p];
					pt.plugin = plugin;
					if (_supports3D) {
						copy = m1.zOrigin;
						orig = orig.split(" ");
						m1.zOrigin = ((orig.length > 2 && !(copy !== 0 && orig[2] === "0px")) ? parseFloat(orig[2]) : copy) || 0; //Safari doesn't handle the z part of transformOrigin correctly, so we'll manually handle it in the _set3DTransformRatio() method.
						pt.xs0 = pt.e = orig[0] + " " + (orig[1] || "50%") + " 0px"; //we must define a z value of 0px specifically otherwise iOS 5 Safari will stick with the old one (if one was defined)!
						pt = new CSSPropTween(m1, "zOrigin", 0, 0, pt, -1, pt.n); //we must create a CSSPropTween for the _gsTransform.zOrigin so that it gets reset properly at the beginning if the tween runs backward (as opposed to just setting m1.zOrigin here)
						pt.b = copy;
						pt.xs0 = pt.e = m1.zOrigin;
					} else {
						pt.xs0 = pt.e = orig;
					}

					//for older versions of IE (6-8), we need to manually calculate things inside the setRatio() function. We record origin x and y (ox and oy) and whether or not the values are percentages (oxp and oyp).
				} else {
					_parsePosition(orig + "", m1);
				}
			}
			if (hasChange) {
				cssp._transformType = (!(m1.svg && _useSVGTransformAttr) && (has3D || this._transformType === 3)) ? 3 : 2; //quicker than calling cssp._enableTransforms();
			}
			return pt;
		}, prefix:true});

		_registerComplexSpecialProp("boxShadow", {defaultValue:"0px 0px 0px 0px #999", prefix:true, color:true, multi:true, keyword:"inset"});

		_registerComplexSpecialProp("borderRadius", {defaultValue:"0px", parser:function(t, e, p, cssp, pt, plugin) {
			e = this.format(e);
			var props = ["borderTopLeftRadius","borderTopRightRadius","borderBottomRightRadius","borderBottomLeftRadius"],
				style = t.style,
				ea1, i, es2, bs2, bs, es, bn, en, w, h, esfx, bsfx, rel, hn, vn, em;
			w = parseFloat(t.offsetWidth);
			h = parseFloat(t.offsetHeight);
			ea1 = e.split(" ");
			for (i = 0; i < props.length; i++) { //if we're dealing with percentages, we must convert things separately for the horizontal and vertical axis!
				if (this.p.indexOf("border")) { //older browsers used a prefix
					props[i] = _checkPropPrefix(props[i]);
				}
				bs = bs2 = _getStyle(t, props[i], _cs, false, "0px");
				if (bs.indexOf(" ") !== -1) {
					bs2 = bs.split(" ");
					bs = bs2[0];
					bs2 = bs2[1];
				}
				es = es2 = ea1[i];
				bn = parseFloat(bs);
				bsfx = bs.substr((bn + "").length);
				rel = (es.charAt(1) === "=");
				if (rel) {
					en = parseInt(es.charAt(0)+"1", 10);
					es = es.substr(2);
					en *= parseFloat(es);
					esfx = es.substr((en + "").length - (en < 0 ? 1 : 0)) || "";
				} else {
					en = parseFloat(es);
					esfx = es.substr((en + "").length);
				}
				if (esfx === "") {
					esfx = _suffixMap[p] || bsfx;
				}
				if (esfx !== bsfx) {
					hn = _convertToPixels(t, "borderLeft", bn, bsfx); //horizontal number (we use a bogus "borderLeft" property just because the _convertToPixels() method searches for the keywords "Left", "Right", "Top", and "Bottom" to determine of it's a horizontal or vertical property, and we need "border" in the name so that it knows it should measure relative to the element itself, not its parent.
					vn = _convertToPixels(t, "borderTop", bn, bsfx); //vertical number
					if (esfx === "%") {
						bs = (hn / w * 100) + "%";
						bs2 = (vn / h * 100) + "%";
					} else if (esfx === "em") {
						em = _convertToPixels(t, "borderLeft", 1, "em");
						bs = (hn / em) + "em";
						bs2 = (vn / em) + "em";
					} else {
						bs = hn + "px";
						bs2 = vn + "px";
					}
					if (rel) {
						es = (parseFloat(bs) + en) + esfx;
						es2 = (parseFloat(bs2) + en) + esfx;
					}
				}
				pt = _parseComplex(style, props[i], bs + " " + bs2, es + " " + es2, false, "0px", pt);
			}
			return pt;
		}, prefix:true, formatter:_getFormatter("0px 0px 0px 0px", false, true)});
		_registerComplexSpecialProp("backgroundPosition", {defaultValue:"0 0", parser:function(t, e, p, cssp, pt, plugin) {
			var bp = "background-position",
				cs = (_cs || _getComputedStyle(t, null)),
				bs = this.format( ((cs) ? _ieVers ? cs.getPropertyValue(bp + "-x") + " " + cs.getPropertyValue(bp + "-y") : cs.getPropertyValue(bp) : t.currentStyle.backgroundPositionX + " " + t.currentStyle.backgroundPositionY) || "0 0"), //Internet Explorer doesn't report background-position correctly - we must query background-position-x and background-position-y and combine them (even in IE10). Before IE9, we must do the same with the currentStyle object and use camelCase
				es = this.format(e),
				ba, ea, i, pct, overlap, src;
			if ((bs.indexOf("%") !== -1) !== (es.indexOf("%") !== -1)) {
				src = _getStyle(t, "backgroundImage").replace(_urlExp, "");
				if (src && src !== "none") {
					ba = bs.split(" ");
					ea = es.split(" ");
					_tempImg.setAttribute("src", src); //set the temp IMG's src to the background-image so that we can measure its width/height
					i = 2;
					while (--i > -1) {
						bs = ba[i];
						pct = (bs.indexOf("%") !== -1);
						if (pct !== (ea[i].indexOf("%") !== -1)) {
							overlap = (i === 0) ? t.offsetWidth - _tempImg.width : t.offsetHeight - _tempImg.height;
							ba[i] = pct ? (parseFloat(bs) / 100 * overlap) + "px" : (parseFloat(bs) / overlap * 100) + "%";
						}
					}
					bs = ba.join(" ");
				}
			}
			return this.parseComplex(t.style, bs, es, pt, plugin);
		}, formatter:_parsePosition});
		_registerComplexSpecialProp("backgroundSize", {defaultValue:"0 0", formatter:_parsePosition});
		_registerComplexSpecialProp("perspective", {defaultValue:"0px", prefix:true});
		_registerComplexSpecialProp("perspectiveOrigin", {defaultValue:"50% 50%", prefix:true});
		_registerComplexSpecialProp("transformStyle", {prefix:true});
		_registerComplexSpecialProp("backfaceVisibility", {prefix:true});
		_registerComplexSpecialProp("userSelect", {prefix:true});
		_registerComplexSpecialProp("margin", {parser:_getEdgeParser("marginTop,marginRight,marginBottom,marginLeft")});
		_registerComplexSpecialProp("padding", {parser:_getEdgeParser("paddingTop,paddingRight,paddingBottom,paddingLeft")});
		_registerComplexSpecialProp("clip", {defaultValue:"rect(0px,0px,0px,0px)", parser:function(t, e, p, cssp, pt, plugin){
			var b, cs, delim;
			if (_ieVers < 9) { //IE8 and earlier don't report a "clip" value in the currentStyle - instead, the values are split apart into clipTop, clipRight, clipBottom, and clipLeft. Also, in IE7 and earlier, the values inside rect() are space-delimited, not comma-delimited.
				cs = t.currentStyle;
				delim = _ieVers < 8 ? " " : ",";
				b = "rect(" + cs.clipTop + delim + cs.clipRight + delim + cs.clipBottom + delim + cs.clipLeft + ")";
				e = this.format(e).split(",").join(delim);
			} else {
				b = this.format(_getStyle(t, this.p, _cs, false, this.dflt));
				e = this.format(e);
			}
			return this.parseComplex(t.style, b, e, pt, plugin);
		}});
		_registerComplexSpecialProp("textShadow", {defaultValue:"0px 0px 0px #999", color:true, multi:true});
		_registerComplexSpecialProp("autoRound,strictUnits", {parser:function(t, e, p, cssp, pt) {return pt;}}); //just so that we can ignore these properties (not tween them)
		_registerComplexSpecialProp("border", {defaultValue:"0px solid #000", parser:function(t, e, p, cssp, pt, plugin) {
				return this.parseComplex(t.style, this.format(_getStyle(t, "borderTopWidth", _cs, false, "0px") + " " + _getStyle(t, "borderTopStyle", _cs, false, "solid") + " " + _getStyle(t, "borderTopColor", _cs, false, "#000")), this.format(e), pt, plugin);
			}, color:true, formatter:function(v) {
				var a = v.split(" ");
				return a[0] + " " + (a[1] || "solid") + " " + (v.match(_colorExp) || ["#000"])[0];
			}});
		_registerComplexSpecialProp("borderWidth", {parser:_getEdgeParser("borderTopWidth,borderRightWidth,borderBottomWidth,borderLeftWidth")}); //Firefox doesn't pick up on borderWidth set in style sheets (only inline).
		_registerComplexSpecialProp("float,cssFloat,styleFloat", {parser:function(t, e, p, cssp, pt, plugin) {
			var s = t.style,
				prop = ("cssFloat" in s) ? "cssFloat" : "styleFloat";
			return new CSSPropTween(s, prop, 0, 0, pt, -1, p, false, 0, s[prop], e);
		}});

		//opacity-related
		var _setIEOpacityRatio = function(v) {
				var t = this.t, //refers to the element's style property
					filters = t.filter || _getStyle(this.data, "filter") || "",
					val = (this.s + this.c * v) | 0,
					skip;
				if (val === 100) { //for older versions of IE that need to use a filter to apply opacity, we should remove the filter if opacity hits 1 in order to improve performance, but make sure there isn't a transform (matrix) or gradient in the filters.
					if (filters.indexOf("atrix(") === -1 && filters.indexOf("radient(") === -1 && filters.indexOf("oader(") === -1) {
						t.removeAttribute("filter");
						skip = (!_getStyle(this.data, "filter")); //if a class is applied that has an alpha filter, it will take effect (we don't want that), so re-apply our alpha filter in that case. We must first remove it and then check.
					} else {
						t.filter = filters.replace(_alphaFilterExp, "");
						skip = true;
					}
				}
				if (!skip) {
					if (this.xn1) {
						t.filter = filters = filters || ("alpha(opacity=" + val + ")"); //works around bug in IE7/8 that prevents changes to "visibility" from being applied properly if the filter is changed to a different alpha on the same frame.
					}
					if (filters.indexOf("pacity") === -1) { //only used if browser doesn't support the standard opacity style property (IE 7 and 8). We omit the "O" to avoid case-sensitivity issues
						if (val !== 0 || !this.xn1) { //bugs in IE7/8 won't render the filter properly if opacity is ADDED on the same frame/render as "visibility" changes (this.xn1 is 1 if this tween is an "autoAlpha" tween)
							t.filter = filters + " alpha(opacity=" + val + ")"; //we round the value because otherwise, bugs in IE7/8 can prevent "visibility" changes from being applied properly.
						}
					} else {
						t.filter = filters.replace(_opacityExp, "opacity=" + val);
					}
				}
			};
		_registerComplexSpecialProp("opacity,alpha,autoAlpha", {defaultValue:"1", parser:function(t, e, p, cssp, pt, plugin) {
			var b = parseFloat(_getStyle(t, "opacity", _cs, false, "1")),
				style = t.style,
				isAutoAlpha = (p === "autoAlpha");
			if (typeof(e) === "string" && e.charAt(1) === "=") {
				e = ((e.charAt(0) === "-") ? -1 : 1) * parseFloat(e.substr(2)) + b;
			}
			if (isAutoAlpha && b === 1 && _getStyle(t, "visibility", _cs) === "hidden" && e !== 0) { //if visibility is initially set to "hidden", we should interpret that as intent to make opacity 0 (a convenience)
				b = 0;
			}
			if (_supportsOpacity) {
				pt = new CSSPropTween(style, "opacity", b, e - b, pt);
			} else {
				pt = new CSSPropTween(style, "opacity", b * 100, (e - b) * 100, pt);
				pt.xn1 = isAutoAlpha ? 1 : 0; //we need to record whether or not this is an autoAlpha so that in the setRatio(), we know to duplicate the setting of the alpha in order to work around a bug in IE7 and IE8 that prevents changes to "visibility" from taking effect if the filter is changed to a different alpha(opacity) at the same time. Setting it to the SAME value first, then the new value works around the IE7/8 bug.
				style.zoom = 1; //helps correct an IE issue.
				pt.type = 2;
				pt.b = "alpha(opacity=" + pt.s + ")";
				pt.e = "alpha(opacity=" + (pt.s + pt.c) + ")";
				pt.data = t;
				pt.plugin = plugin;
				pt.setRatio = _setIEOpacityRatio;
			}
			if (isAutoAlpha) { //we have to create the "visibility" PropTween after the opacity one in the linked list so that they run in the order that works properly in IE8 and earlier
				pt = new CSSPropTween(style, "visibility", 0, 0, pt, -1, null, false, 0, ((b !== 0) ? "inherit" : "hidden"), ((e === 0) ? "hidden" : "inherit"));
				pt.xs0 = "inherit";
				cssp._overwriteProps.push(pt.n);
				cssp._overwriteProps.push(p);
			}
			return pt;
		}});


		var _removeProp = function(s, p) {
				if (p) {
					if (s.removeProperty) {
						if (p.substr(0,2) === "ms" || p.substr(0,6) === "webkit") { //Microsoft and some Webkit browsers don't conform to the standard of capitalizing the first prefix character, so we adjust so that when we prefix the caps with a dash, it's correct (otherwise it'd be "ms-transform" instead of "-ms-transform" for IE9, for example)
							p = "-" + p;
						}
						s.removeProperty(p.replace(_capsExp, "-$1").toLowerCase());
					} else { //note: old versions of IE use "removeAttribute()" instead of "removeProperty()"
						s.removeAttribute(p);
					}
				}
			},
			_setClassNameRatio = function(v) {
				this.t._gsClassPT = this;
				if (v === 1 || v === 0) {
					this.t.setAttribute("class", (v === 0) ? this.b : this.e);
					var mpt = this.data, //first MiniPropTween
						s = this.t.style;
					while (mpt) {
						if (!mpt.v) {
							_removeProp(s, mpt.p);
						} else {
							s[mpt.p] = mpt.v;
						}
						mpt = mpt._next;
					}
					if (v === 1 && this.t._gsClassPT === this) {
						this.t._gsClassPT = null;
					}
				} else if (this.t.getAttribute("class") !== this.e) {
					this.t.setAttribute("class", this.e);
				}
			};
		_registerComplexSpecialProp("className", {parser:function(t, e, p, cssp, pt, plugin, vars) {
			var b = t.getAttribute("class") || "", //don't use t.className because it doesn't work consistently on SVG elements; getAttribute("class") and setAttribute("class", value") is more reliable.
				cssText = t.style.cssText,
				difData, bs, cnpt, cnptLookup, mpt;
			pt = cssp._classNamePT = new CSSPropTween(t, p, 0, 0, pt, 2);
			pt.setRatio = _setClassNameRatio;
			pt.pr = -11;
			_hasPriority = true;
			pt.b = b;
			bs = _getAllStyles(t, _cs);
			//if there's a className tween already operating on the target, force it to its end so that the necessary inline styles are removed and the class name is applied before we determine the end state (we don't want inline styles interfering that were there just for class-specific values)
			cnpt = t._gsClassPT;
			if (cnpt) {
				cnptLookup = {};
				mpt = cnpt.data; //first MiniPropTween which stores the inline styles - we need to force these so that the inline styles don't contaminate things. Otherwise, there's a small chance that a tween could start and the inline values match the destination values and they never get cleaned.
				while (mpt) {
					cnptLookup[mpt.p] = 1;
					mpt = mpt._next;
				}
				cnpt.setRatio(1);
			}
			t._gsClassPT = pt;
			pt.e = (e.charAt(1) !== "=") ? e : b.replace(new RegExp("\\s*\\b" + e.substr(2) + "\\b"), "") + ((e.charAt(0) === "+") ? " " + e.substr(2) : "");
			t.setAttribute("class", pt.e);
			difData = _cssDif(t, bs, _getAllStyles(t), vars, cnptLookup);
			t.setAttribute("class", b);
			pt.data = difData.firstMPT;
			t.style.cssText = cssText; //we recorded cssText before we swapped classes and ran _getAllStyles() because in cases when a className tween is overwritten, we remove all the related tweening properties from that class change (otherwise class-specific stuff can't override properties we've directly set on the target's style object due to specificity).
			pt = pt.xfirst = cssp.parse(t, difData.difs, pt, plugin); //we record the CSSPropTween as the xfirst so that we can handle overwriting propertly (if "className" gets overwritten, we must kill all the properties associated with the className part of the tween, so we can loop through from xfirst to the pt itself)
			return pt;
		}});


		var _setClearPropsRatio = function(v) {
			if (v === 1 || v === 0) if (this.data._totalTime === this.data._totalDuration && this.data.data !== "isFromStart") { //this.data refers to the tween. Only clear at the END of the tween (remember, from() tweens make the ratio go from 1 to 0, so we can't just check that and if the tween is the zero-duration one that's created internally to render the starting values in a from() tween, ignore that because otherwise, for example, from(...{height:100, clearProps:"height", delay:1}) would wipe the height at the beginning of the tween and after 1 second, it'd kick back in).
				var s = this.t.style,
					transformParse = _specialProps.transform.parse,
					a, p, i, clearTransform, transform;
				if (this.e === "all") {
					s.cssText = "";
					clearTransform = true;
				} else {
					a = this.e.split(" ").join("").split(",");
					i = a.length;
					while (--i > -1) {
						p = a[i];
						if (_specialProps[p]) {
							if (_specialProps[p].parse === transformParse) {
								clearTransform = true;
							} else {
								p = (p === "transformOrigin") ? _transformOriginProp : _specialProps[p].p; //ensures that special properties use the proper browser-specific property name, like "scaleX" might be "-webkit-transform" or "boxShadow" might be "-moz-box-shadow"
							}
						}
						_removeProp(s, p);
					}
				}
				if (clearTransform) {
					_removeProp(s, _transformProp);
					transform = this.t._gsTransform;
					if (transform) {
						if (transform.svg) {
							this.t.removeAttribute("data-svg-origin");
							this.t.removeAttribute("transform");
						}
						delete this.t._gsTransform;
					}
				}

			}
		};
		_registerComplexSpecialProp("clearProps", {parser:function(t, e, p, cssp, pt) {
			pt = new CSSPropTween(t, p, 0, 0, pt, 2);
			pt.setRatio = _setClearPropsRatio;
			pt.e = e;
			pt.pr = -10;
			pt.data = cssp._tween;
			_hasPriority = true;
			return pt;
		}});

		p = "bezier,throwProps,physicsProps,physics2D".split(",");
		i = p.length;
		while (i--) {
			_registerPluginProp(p[i]);
		}








		p = CSSPlugin.prototype;
		p._firstPT = p._lastParsedTransform = p._transform = null;

		//gets called when the tween renders for the first time. This kicks everything off, recording start/end values, etc.
		p._onInitTween = function(target, vars, tween) {
			if (!target.nodeType) { //css is only for dom elements
				return false;
			}
			this._target = target;
			this._tween = tween;
			this._vars = vars;
			_autoRound = vars.autoRound;
			_hasPriority = false;
			_suffixMap = vars.suffixMap || CSSPlugin.suffixMap;
			_cs = _getComputedStyle(target, "");
			_overwriteProps = this._overwriteProps;
			var style = target.style,
				v, pt, pt2, first, last, next, zIndex, tpt, threeD;
			if (_reqSafariFix) if (style.zIndex === "") {
				v = _getStyle(target, "zIndex", _cs);
				if (v === "auto" || v === "") {
					//corrects a bug in [non-Android] Safari that prevents it from repainting elements in their new positions if they don't have a zIndex set. We also can't just apply this inside _parseTransform() because anything that's moved in any way (like using "left" or "top" instead of transforms like "x" and "y") can be affected, so it is best to ensure that anything that's tweening has a z-index. Setting "WebkitPerspective" to a non-zero value worked too except that on iOS Safari things would flicker randomly. Plus zIndex is less memory-intensive.
					this._addLazySet(style, "zIndex", 0);
				}
			}

			if (typeof(vars) === "string") {
				first = style.cssText;
				v = _getAllStyles(target, _cs);
				style.cssText = first + ";" + vars;
				v = _cssDif(target, v, _getAllStyles(target)).difs;
				if (!_supportsOpacity && _opacityValExp.test(vars)) {
					v.opacity = parseFloat( RegExp.$1 );
				}
				vars = v;
				style.cssText = first;
			}

			if (vars.className) { //className tweens will combine any differences they find in the css with the vars that are passed in, so {className:"myClass", scale:0.5, left:20} would work.
				this._firstPT = pt = _specialProps.className.parse(target, vars.className, "className", this, null, null, vars);
			} else {
				this._firstPT = pt = this.parse(target, vars, null);
			}

			if (this._transformType) {
				threeD = (this._transformType === 3);
				if (!_transformProp) {
					style.zoom = 1; //helps correct an IE issue.
				} else if (_isSafari) {
					_reqSafariFix = true;
					//if zIndex isn't set, iOS Safari doesn't repaint things correctly sometimes (seemingly at random).
					if (style.zIndex === "") {
						zIndex = _getStyle(target, "zIndex", _cs);
						if (zIndex === "auto" || zIndex === "") {
							this._addLazySet(style, "zIndex", 0);
						}
					}
					//Setting WebkitBackfaceVisibility corrects 3 bugs:
					// 1) [non-Android] Safari skips rendering changes to "top" and "left" that are made on the same frame/render as a transform update.
					// 2) iOS Safari sometimes neglects to repaint elements in their new positions. Setting "WebkitPerspective" to a non-zero value worked too except that on iOS Safari things would flicker randomly.
					// 3) Safari sometimes displayed odd artifacts when tweening the transform (or WebkitTransform) property, like ghosts of the edges of the element remained. Definitely a browser bug.
					//Note: we allow the user to override the auto-setting by defining WebkitBackfaceVisibility in the vars of the tween.
					if (_isSafariLT6) {
						this._addLazySet(style, "WebkitBackfaceVisibility", this._vars.WebkitBackfaceVisibility || (threeD ? "visible" : "hidden"));
					}
				}
				pt2 = pt;
				while (pt2 && pt2._next) {
					pt2 = pt2._next;
				}
				tpt = new CSSPropTween(target, "transform", 0, 0, null, 2);
				this._linkCSSP(tpt, null, pt2);
				tpt.setRatio = _transformProp ? _setTransformRatio : _setIETransformRatio;
				tpt.data = this._transform || _getTransform(target, _cs, true);
				tpt.tween = tween;
				tpt.pr = -1; //ensures that the transforms get applied after the components are updated.
				_overwriteProps.pop(); //we don't want to force the overwrite of all "transform" tweens of the target - we only care about individual transform properties like scaleX, rotation, etc. The CSSPropTween constructor automatically adds the property to _overwriteProps which is why we need to pop() here.
			}

			if (_hasPriority) {
				//reorders the linked list in order of pr (priority)
				while (pt) {
					next = pt._next;
					pt2 = first;
					while (pt2 && pt2.pr > pt.pr) {
						pt2 = pt2._next;
					}
					if ((pt._prev = pt2 ? pt2._prev : last)) {
						pt._prev._next = pt;
					} else {
						first = pt;
					}
					if ((pt._next = pt2)) {
						pt2._prev = pt;
					} else {
						last = pt;
					}
					pt = next;
				}
				this._firstPT = first;
			}
			return true;
		};


		p.parse = function(target, vars, pt, plugin) {
			var style = target.style,
				p, sp, bn, en, bs, es, bsfx, esfx, isStr, rel;
			for (p in vars) {
				es = vars[p]; //ending value string
				sp = _specialProps[p]; //SpecialProp lookup.
				if (sp) {
					pt = sp.parse(target, es, p, this, pt, plugin, vars);

				} else {
					bs = _getStyle(target, p, _cs) + "";
					isStr = (typeof(es) === "string");
					if (p === "color" || p === "fill" || p === "stroke" || p.indexOf("Color") !== -1 || (isStr && _rgbhslExp.test(es))) { //Opera uses background: to define color sometimes in addition to backgroundColor:
						if (!isStr) {
							es = _parseColor(es);
							es = ((es.length > 3) ? "rgba(" : "rgb(") + es.join(",") + ")";
						}
						pt = _parseComplex(style, p, bs, es, true, "transparent", pt, 0, plugin);

					} else if (isStr && (es.indexOf(" ") !== -1 || es.indexOf(",") !== -1)) {
						pt = _parseComplex(style, p, bs, es, true, null, pt, 0, plugin);

					} else {
						bn = parseFloat(bs);
						bsfx = (bn || bn === 0) ? bs.substr((bn + "").length) : ""; //remember, bs could be non-numeric like "normal" for fontWeight, so we should default to a blank suffix in that case.

						if (bs === "" || bs === "auto") {
							if (p === "width" || p === "height") {
								bn = _getDimension(target, p, _cs);
								bsfx = "px";
							} else if (p === "left" || p === "top") {
								bn = _calculateOffset(target, p, _cs);
								bsfx = "px";
							} else {
								bn = (p !== "opacity") ? 0 : 1;
								bsfx = "";
							}
						}

						rel = (isStr && es.charAt(1) === "=");
						if (rel) {
							en = parseInt(es.charAt(0) + "1", 10);
							es = es.substr(2);
							en *= parseFloat(es);
							esfx = es.replace(_suffixExp, "");
						} else {
							en = parseFloat(es);
							esfx = isStr ? es.replace(_suffixExp, "") : "";
						}

						if (esfx === "") {
							esfx = (p in _suffixMap) ? _suffixMap[p] : bsfx; //populate the end suffix, prioritizing the map, then if none is found, use the beginning suffix.
						}

						es = (en || en === 0) ? (rel ? en + bn : en) + esfx : vars[p]; //ensures that any += or -= prefixes are taken care of. Record the end value before normalizing the suffix because we always want to end the tween on exactly what they intended even if it doesn't match the beginning value's suffix.

						//if the beginning/ending suffixes don't match, normalize them...
						if (bsfx !== esfx) if (esfx !== "") if (en || en === 0) if (bn) { //note: if the beginning value (bn) is 0, we don't need to convert units!
							bn = _convertToPixels(target, p, bn, bsfx);
							if (esfx === "%") {
								bn /= _convertToPixels(target, p, 100, "%") / 100;
								if (vars.strictUnits !== true) { //some browsers report only "px" values instead of allowing "%" with getComputedStyle(), so we assume that if we're tweening to a %, we should start there too unless strictUnits:true is defined. This approach is particularly useful for responsive designs that use from() tweens.
									bs = bn + "%";
								}

							} else if (esfx === "em" || esfx === "rem" || esfx === "vw" || esfx === "vh") {
								bn /= _convertToPixels(target, p, 1, esfx);

							//otherwise convert to pixels.
							} else if (esfx !== "px") {
								en = _convertToPixels(target, p, en, esfx);
								esfx = "px"; //we don't use bsfx after this, so we don't need to set it to px too.
							}
							if (rel) if (en || en === 0) {
								es = (en + bn) + esfx; //the changes we made affect relative calculations, so adjust the end value here.
							}
						}

						if (rel) {
							en += bn;
						}

						if ((bn || bn === 0) && (en || en === 0)) { //faster than isNaN(). Also, previously we required en !== bn but that doesn't really gain much performance and it prevents _parseToProxy() from working properly if beginning and ending values match but need to get tweened by an external plugin anyway. For example, a bezier tween where the target starts at left:0 and has these points: [{left:50},{left:0}] wouldn't work properly because when parsing the last point, it'd match the first (current) one and a non-tweening CSSPropTween would be recorded when we actually need a normal tween (type:0) so that things get updated during the tween properly.
							pt = new CSSPropTween(style, p, bn, en - bn, pt, 0, p, (_autoRound !== false && (esfx === "px" || p === "zIndex")), 0, bs, es);
							pt.xs0 = esfx;
							//DEBUG: _log("tween "+p+" from "+pt.b+" ("+bn+esfx+") to "+pt.e+" with suffix: "+pt.xs0);
						} else if (style[p] === undefined || !es && (es + "" === "NaN" || es == null)) {
							_log("invalid " + p + " tween value: " + vars[p]);
						} else {
							pt = new CSSPropTween(style, p, en || bn || 0, 0, pt, -1, p, false, 0, bs, es);
							pt.xs0 = (es === "none" && (p === "display" || p.indexOf("Style") !== -1)) ? bs : es; //intermediate value should typically be set immediately (end value) except for "display" or things like borderTopStyle, borderBottomStyle, etc. which should use the beginning value during the tween.
							//DEBUG: _log("non-tweening value "+p+": "+pt.xs0);
						}
					}
				}
				if (plugin) if (pt && !pt.plugin) {
					pt.plugin = plugin;
				}
			}
			return pt;
		};


		//gets called every time the tween updates, passing the new ratio (typically a value between 0 and 1, but not always (for example, if an Elastic.easeOut is used, the value can jump above 1 mid-tween). It will always start and 0 and end at 1.
		p.setRatio = function(v) {
			var pt = this._firstPT,
				min = 0.000001,
				val, str, i;
			//at the end of the tween, we set the values to exactly what we received in order to make sure non-tweening values (like "position" or "float" or whatever) are set and so that if the beginning/ending suffixes (units) didn't match and we normalized to px, the value that the user passed in is used here. We check to see if the tween is at its beginning in case it's a from() tween in which case the ratio will actually go from 1 to 0 over the course of the tween (backwards).
			if (v === 1 && (this._tween._time === this._tween._duration || this._tween._time === 0)) {
				while (pt) {
					if (pt.type !== 2) {
						if (pt.r && pt.type !== -1) {
							val = Math.round(pt.s + pt.c);
							if (!pt.type) {
								pt.t[pt.p] = val + pt.xs0;
							} else if (pt.type === 1) { //complex value (one that typically has multiple numbers inside a string, like "rect(5px,10px,20px,25px)"
								i = pt.l;
								str = pt.xs0 + val + pt.xs1;
								for (i = 1; i < pt.l; i++) {
									str += pt["xn"+i] + pt["xs"+(i+1)];
								}
								pt.t[pt.p] = str;
							}
						} else {
							pt.t[pt.p] = pt.e;
						}
					} else {
						pt.setRatio(v);
					}
					pt = pt._next;
				}

			} else if (v || !(this._tween._time === this._tween._duration || this._tween._time === 0) || this._tween._rawPrevTime === -0.000001) {
				while (pt) {
					val = pt.c * v + pt.s;
					if (pt.r) {
						val = Math.round(val);
					} else if (val < min) if (val > -min) {
						val = 0;
					}
					if (!pt.type) {
						pt.t[pt.p] = val + pt.xs0;
					} else if (pt.type === 1) { //complex value (one that typically has multiple numbers inside a string, like "rect(5px,10px,20px,25px)"
						i = pt.l;
						if (i === 2) {
							pt.t[pt.p] = pt.xs0 + val + pt.xs1 + pt.xn1 + pt.xs2;
						} else if (i === 3) {
							pt.t[pt.p] = pt.xs0 + val + pt.xs1 + pt.xn1 + pt.xs2 + pt.xn2 + pt.xs3;
						} else if (i === 4) {
							pt.t[pt.p] = pt.xs0 + val + pt.xs1 + pt.xn1 + pt.xs2 + pt.xn2 + pt.xs3 + pt.xn3 + pt.xs4;
						} else if (i === 5) {
							pt.t[pt.p] = pt.xs0 + val + pt.xs1 + pt.xn1 + pt.xs2 + pt.xn2 + pt.xs3 + pt.xn3 + pt.xs4 + pt.xn4 + pt.xs5;
						} else {
							str = pt.xs0 + val + pt.xs1;
							for (i = 1; i < pt.l; i++) {
								str += pt["xn"+i] + pt["xs"+(i+1)];
							}
							pt.t[pt.p] = str;
						}

					} else if (pt.type === -1) { //non-tweening value
						pt.t[pt.p] = pt.xs0;

					} else if (pt.setRatio) { //custom setRatio() for things like SpecialProps, external plugins, etc.
						pt.setRatio(v);
					}
					pt = pt._next;
				}

			//if the tween is reversed all the way back to the beginning, we need to restore the original values which may have different units (like % instead of px or em or whatever).
			} else {
				while (pt) {
					if (pt.type !== 2) {
						pt.t[pt.p] = pt.b;
					} else {
						pt.setRatio(v);
					}
					pt = pt._next;
				}
			}
		};

		/**
		 * @private
		 * Forces rendering of the target's transforms (rotation, scale, etc.) whenever the CSSPlugin's setRatio() is called.
		 * Basically, this tells the CSSPlugin to create a CSSPropTween (type 2) after instantiation that runs last in the linked
		 * list and calls the appropriate (3D or 2D) rendering function. We separate this into its own method so that we can call
		 * it from other plugins like BezierPlugin if, for example, it needs to apply an autoRotation and this CSSPlugin
		 * doesn't have any transform-related properties of its own. You can call this method as many times as you
		 * want and it won't create duplicate CSSPropTweens.
		 *
		 * @param {boolean} threeD if true, it should apply 3D tweens (otherwise, just 2D ones are fine and typically faster)
		 */
		p._enableTransforms = function(threeD) {
			this._transform = this._transform || _getTransform(this._target, _cs, true); //ensures that the element has a _gsTransform property with the appropriate values.
			this._transformType = (!(this._transform.svg && _useSVGTransformAttr) && (threeD || this._transformType === 3)) ? 3 : 2;
		};

		var lazySet = function(v) {
			this.t[this.p] = this.e;
			this.data._linkCSSP(this, this._next, null, true); //we purposefully keep this._next even though it'd make sense to null it, but this is a performance optimization, as this happens during the while (pt) {} loop in setRatio() at the bottom of which it sets pt = pt._next, so if we null it, the linked list will be broken in that loop.
		};
		/** @private Gives us a way to set a value on the first render (and only the first render). **/
		p._addLazySet = function(t, p, v) {
			var pt = this._firstPT = new CSSPropTween(t, p, 0, 0, this._firstPT, 2);
			pt.e = v;
			pt.setRatio = lazySet;
			pt.data = this;
		};

		/** @private **/
		p._linkCSSP = function(pt, next, prev, remove) {
			if (pt) {
				if (next) {
					next._prev = pt;
				}
				if (pt._next) {
					pt._next._prev = pt._prev;
				}
				if (pt._prev) {
					pt._prev._next = pt._next;
				} else if (this._firstPT === pt) {
					this._firstPT = pt._next;
					remove = true; //just to prevent resetting this._firstPT 5 lines down in case pt._next is null. (optimized for speed)
				}
				if (prev) {
					prev._next = pt;
				} else if (!remove && this._firstPT === null) {
					this._firstPT = pt;
				}
				pt._next = next;
				pt._prev = prev;
			}
			return pt;
		};

		//we need to make sure that if alpha or autoAlpha is killed, opacity is too. And autoAlpha affects the "visibility" property.
		p._kill = function(lookup) {
			var copy = lookup,
				pt, p, xfirst;
			if (lookup.autoAlpha || lookup.alpha) {
				copy = {};
				for (p in lookup) { //copy the lookup so that we're not changing the original which may be passed elsewhere.
					copy[p] = lookup[p];
				}
				copy.opacity = 1;
				if (copy.autoAlpha) {
					copy.visibility = 1;
				}
			}
			if (lookup.className && (pt = this._classNamePT)) { //for className tweens, we need to kill any associated CSSPropTweens too; a linked list starts at the className's "xfirst".
				xfirst = pt.xfirst;
				if (xfirst && xfirst._prev) {
					this._linkCSSP(xfirst._prev, pt._next, xfirst._prev._prev); //break off the prev
				} else if (xfirst === this._firstPT) {
					this._firstPT = pt._next;
				}
				if (pt._next) {
					this._linkCSSP(pt._next, pt._next._next, xfirst._prev);
				}
				this._classNamePT = null;
			}
			return TweenPlugin.prototype._kill.call(this, copy);
		};



		//used by cascadeTo() for gathering all the style properties of each child element into an array for comparison.
		var _getChildStyles = function(e, props, targets) {
				var children, i, child, type;
				if (e.slice) {
					i = e.length;
					while (--i > -1) {
						_getChildStyles(e[i], props, targets);
					}
					return;
				}
				children = e.childNodes;
				i = children.length;
				while (--i > -1) {
					child = children[i];
					type = child.type;
					if (child.style) {
						props.push(_getAllStyles(child));
						if (targets) {
							targets.push(child);
						}
					}
					if ((type === 1 || type === 9 || type === 11) && child.childNodes.length) {
						_getChildStyles(child, props, targets);
					}
				}
			};

		/**
		 * Typically only useful for className tweens that may affect child elements, this method creates a TweenLite
		 * and then compares the style properties of all the target's child elements at the tween's start and end, and
		 * if any are different, it also creates tweens for those and returns an array containing ALL of the resulting
		 * tweens (so that you can easily add() them to a TimelineLite, for example). The reason this functionality is
		 * wrapped into a separate static method of CSSPlugin instead of being integrated into all regular className tweens
		 * is because it creates entirely new tweens that may have completely different targets than the original tween,
		 * so if they were all lumped into the original tween instance, it would be inconsistent with the rest of the API
		 * and it would create other problems. For example:
		 *  - If I create a tween of elementA, that tween instance may suddenly change its target to include 50 other elements (unintuitive if I specifically defined the target I wanted)
		 *  - We can't just create new independent tweens because otherwise, what happens if the original/parent tween is reversed or pause or dropped into a TimelineLite for tight control? You'd expect that tween's behavior to affect all the others.
		 *  - Analyzing every style property of every child before and after the tween is an expensive operation when there are many children, so this behavior shouldn't be imposed on all className tweens by default, especially since it's probably rare that this extra functionality is needed.
		 *
		 * @param {Object} target object to be tweened
		 * @param {number} Duration in seconds (or frames for frames-based tweens)
		 * @param {Object} Object containing the end values, like {className:"newClass", ease:Linear.easeNone}
		 * @return {Array} An array of TweenLite instances
		 */
		CSSPlugin.cascadeTo = function(target, duration, vars) {
			var tween = TweenLite.to(target, duration, vars),
				results = [tween],
				b = [],
				e = [],
				targets = [],
				_reservedProps = TweenLite._internals.reservedProps,
				i, difs, p, from;
			target = tween._targets || tween.target;
			_getChildStyles(target, b, targets);
			tween.render(duration, true, true);
			_getChildStyles(target, e);
			tween.render(0, true, true);
			tween._enabled(true);
			i = targets.length;
			while (--i > -1) {
				difs = _cssDif(targets[i], b[i], e[i]);
				if (difs.firstMPT) {
					difs = difs.difs;
					for (p in vars) {
						if (_reservedProps[p]) {
							difs[p] = vars[p];
						}
					}
					from = {};
					for (p in difs) {
						from[p] = b[i][p];
					}
					results.push(TweenLite.fromTo(targets[i], duration, from, difs));
				}
			}
			return results;
		};

		TweenPlugin.activate([CSSPlugin]);
		return CSSPlugin;

	}, true);

	
	
	
	
	
	
	
	
	
	
/*
 * ----------------------------------------------------------------
 * RoundPropsPlugin
 * ----------------------------------------------------------------
 */
	(function() {

		var RoundPropsPlugin = _gsScope._gsDefine.plugin({
				propName: "roundProps",
				version: "1.5",
				priority: -1,
				API: 2,

				//called when the tween renders for the first time. This is where initial values should be recorded and any setup routines should run.
				init: function(target, value, tween) {
					this._tween = tween;
					return true;
				}

			}),
			_roundLinkedList = function(node) {
				while (node) {
					if (!node.f && !node.blob) {
						node.r = 1;
					}
					node = node._next;
				}
			},
			p = RoundPropsPlugin.prototype;

		p._onInitAllProps = function() {
			var tween = this._tween,
				rp = (tween.vars.roundProps.join) ? tween.vars.roundProps : tween.vars.roundProps.split(","),
				i = rp.length,
				lookup = {},
				rpt = tween._propLookup.roundProps,
				prop, pt, next;
			while (--i > -1) {
				lookup[rp[i]] = 1;
			}
			i = rp.length;
			while (--i > -1) {
				prop = rp[i];
				pt = tween._firstPT;
				while (pt) {
					next = pt._next; //record here, because it may get removed
					if (pt.pg) {
						pt.t._roundProps(lookup, true);
					} else if (pt.n === prop) {
						if (pt.f === 2 && pt.t) { //a blob (text containing multiple numeric values)
							_roundLinkedList(pt.t._firstPT);
						} else {
							this._add(pt.t, prop, pt.s, pt.c);
							//remove from linked list
							if (next) {
								next._prev = pt._prev;
							}
							if (pt._prev) {
								pt._prev._next = next;
							} else if (tween._firstPT === pt) {
								tween._firstPT = next;
							}
							pt._next = pt._prev = null;
							tween._propLookup[prop] = rpt;
						}
					}
					pt = next;
				}
			}
			return false;
		};

		p._add = function(target, p, s, c) {
			this._addTween(target, p, s, s + c, p, true);
			this._overwriteProps.push(p);
		};

	}());










/*
 * ----------------------------------------------------------------
 * AttrPlugin
 * ----------------------------------------------------------------
 */

	(function() {

		_gsScope._gsDefine.plugin({
			propName: "attr",
			API: 2,
			version: "0.5.0",

			//called when the tween renders for the first time. This is where initial values should be recorded and any setup routines should run.
			init: function(target, value, tween) {
				var p;
				if (typeof(target.setAttribute) !== "function") {
					return false;
				}
				for (p in value) {
					this._addTween(target, "setAttribute", target.getAttribute(p) + "", value[p] + "", p, false, p);
					this._overwriteProps.push(p);
				}
				return true;
			}

		});

	}());










/*
 * ----------------------------------------------------------------
 * DirectionalRotationPlugin
 * ----------------------------------------------------------------
 */
	_gsScope._gsDefine.plugin({
		propName: "directionalRotation",
		version: "0.2.1",
		API: 2,

		//called when the tween renders for the first time. This is where initial values should be recorded and any setup routines should run.
		init: function(target, value, tween) {
			if (typeof(value) !== "object") {
				value = {rotation:value};
			}
			this.finals = {};
			var cap = (value.useRadians === true) ? Math.PI * 2 : 360,
				min = 0.000001,
				p, v, start, end, dif, split;
			for (p in value) {
				if (p !== "useRadians") {
					split = (value[p] + "").split("_");
					v = split[0];
					start = parseFloat( (typeof(target[p]) !== "function") ? target[p] : target[ ((p.indexOf("set") || typeof(target["get" + p.substr(3)]) !== "function") ? p : "get" + p.substr(3)) ]() );
					end = this.finals[p] = (typeof(v) === "string" && v.charAt(1) === "=") ? start + parseInt(v.charAt(0) + "1", 10) * Number(v.substr(2)) : Number(v) || 0;
					dif = end - start;
					if (split.length) {
						v = split.join("_");
						if (v.indexOf("short") !== -1) {
							dif = dif % cap;
							if (dif !== dif % (cap / 2)) {
								dif = (dif < 0) ? dif + cap : dif - cap;
							}
						}
						if (v.indexOf("_cw") !== -1 && dif < 0) {
							dif = ((dif + cap * 9999999999) % cap) - ((dif / cap) | 0) * cap;
						} else if (v.indexOf("ccw") !== -1 && dif > 0) {
							dif = ((dif - cap * 9999999999) % cap) - ((dif / cap) | 0) * cap;
						}
					}
					if (dif > min || dif < -min) {
						this._addTween(target, p, start, start + dif, p);
						this._overwriteProps.push(p);
					}
				}
			}
			return true;
		},

		//called each time the values should be updated, and the ratio gets passed as the only parameter (typically it's a value between 0 and 1, but it can exceed those when using an ease like Elastic.easeOut or Back.easeOut, etc.)
		set: function(ratio) {
			var pt;
			if (ratio !== 1) {
				this._super.setRatio.call(this, ratio);
			} else {
				pt = this._firstPT;
				while (pt) {
					if (pt.f) {
						pt.t[pt.p](this.finals[pt.p]);
					} else {
						pt.t[pt.p] = this.finals[pt.p];
					}
					pt = pt._next;
				}
			}
		}

	})._autoCSS = true;







	
	
	
	
/*
 * ----------------------------------------------------------------
 * EasePack
 * ----------------------------------------------------------------
 */
	_gsScope._gsDefine("easing.Back", ["easing.Ease"], function(Ease) {
		
		var w = (_gsScope.GreenSockGlobals || _gsScope),
			gs = w.com.greensock,
			_2PI = Math.PI * 2,
			_HALF_PI = Math.PI / 2,
			_class = gs._class,
			_create = function(n, f) {
				var C = _class("easing." + n, function(){}, true),
					p = C.prototype = new Ease();
				p.constructor = C;
				p.getRatio = f;
				return C;
			},
			_easeReg = Ease.register || function(){}, //put an empty function in place just as a safety measure in case someone loads an OLD version of TweenLite.js where Ease.register doesn't exist.
			_wrap = function(name, EaseOut, EaseIn, EaseInOut, aliases) {
				var C = _class("easing."+name, {
					easeOut:new EaseOut(),
					easeIn:new EaseIn(),
					easeInOut:new EaseInOut()
				}, true);
				_easeReg(C, name);
				return C;
			},
			EasePoint = function(time, value, next) {
				this.t = time;
				this.v = value;
				if (next) {
					this.next = next;
					next.prev = this;
					this.c = next.v - value;
					this.gap = next.t - time;
				}
			},

			//Back
			_createBack = function(n, f) {
				var C = _class("easing." + n, function(overshoot) {
						this._p1 = (overshoot || overshoot === 0) ? overshoot : 1.70158;
						this._p2 = this._p1 * 1.525;
					}, true),
					p = C.prototype = new Ease();
				p.constructor = C;
				p.getRatio = f;
				p.config = function(overshoot) {
					return new C(overshoot);
				};
				return C;
			},

			Back = _wrap("Back",
				_createBack("BackOut", function(p) {
					return ((p = p - 1) * p * ((this._p1 + 1) * p + this._p1) + 1);
				}),
				_createBack("BackIn", function(p) {
					return p * p * ((this._p1 + 1) * p - this._p1);
				}),
				_createBack("BackInOut", function(p) {
					return ((p *= 2) < 1) ? 0.5 * p * p * ((this._p2 + 1) * p - this._p2) : 0.5 * ((p -= 2) * p * ((this._p2 + 1) * p + this._p2) + 2);
				})
			),


			//SlowMo
			SlowMo = _class("easing.SlowMo", function(linearRatio, power, yoyoMode) {
				power = (power || power === 0) ? power : 0.7;
				if (linearRatio == null) {
					linearRatio = 0.7;
				} else if (linearRatio > 1) {
					linearRatio = 1;
				}
				this._p = (linearRatio !== 1) ? power : 0;
				this._p1 = (1 - linearRatio) / 2;
				this._p2 = linearRatio;
				this._p3 = this._p1 + this._p2;
				this._calcEnd = (yoyoMode === true);
			}, true),
			p = SlowMo.prototype = new Ease(),
			SteppedEase, RoughEase, _createElastic;

		p.constructor = SlowMo;
		p.getRatio = function(p) {
			var r = p + (0.5 - p) * this._p;
			if (p < this._p1) {
				return this._calcEnd ? 1 - ((p = 1 - (p / this._p1)) * p) : r - ((p = 1 - (p / this._p1)) * p * p * p * r);
			} else if (p > this._p3) {
				return this._calcEnd ? 1 - (p = (p - this._p3) / this._p1) * p : r + ((p - r) * (p = (p - this._p3) / this._p1) * p * p * p);
			}
			return this._calcEnd ? 1 : r;
		};
		SlowMo.ease = new SlowMo(0.7, 0.7);

		p.config = SlowMo.config = function(linearRatio, power, yoyoMode) {
			return new SlowMo(linearRatio, power, yoyoMode);
		};


		//SteppedEase
		SteppedEase = _class("easing.SteppedEase", function(steps) {
				steps = steps || 1;
				this._p1 = 1 / steps;
				this._p2 = steps + 1;
			}, true);
		p = SteppedEase.prototype = new Ease();
		p.constructor = SteppedEase;
		p.getRatio = function(p) {
			if (p < 0) {
				p = 0;
			} else if (p >= 1) {
				p = 0.999999999;
			}
			return ((this._p2 * p) >> 0) * this._p1;
		};
		p.config = SteppedEase.config = function(steps) {
			return new SteppedEase(steps);
		};


		//RoughEase
		RoughEase = _class("easing.RoughEase", function(vars) {
			vars = vars || {};
			var taper = vars.taper || "none",
				a = [],
				cnt = 0,
				points = (vars.points || 20) | 0,
				i = points,
				randomize = (vars.randomize !== false),
				clamp = (vars.clamp === true),
				template = (vars.template instanceof Ease) ? vars.template : null,
				strength = (typeof(vars.strength) === "number") ? vars.strength * 0.4 : 0.4,
				x, y, bump, invX, obj, pnt;
			while (--i > -1) {
				x = randomize ? Math.random() : (1 / points) * i;
				y = template ? template.getRatio(x) : x;
				if (taper === "none") {
					bump = strength;
				} else if (taper === "out") {
					invX = 1 - x;
					bump = invX * invX * strength;
				} else if (taper === "in") {
					bump = x * x * strength;
				} else if (x < 0.5) {  //"both" (start)
					invX = x * 2;
					bump = invX * invX * 0.5 * strength;
				} else {				//"both" (end)
					invX = (1 - x) * 2;
					bump = invX * invX * 0.5 * strength;
				}
				if (randomize) {
					y += (Math.random() * bump) - (bump * 0.5);
				} else if (i % 2) {
					y += bump * 0.5;
				} else {
					y -= bump * 0.5;
				}
				if (clamp) {
					if (y > 1) {
						y = 1;
					} else if (y < 0) {
						y = 0;
					}
				}
				a[cnt++] = {x:x, y:y};
			}
			a.sort(function(a, b) {
				return a.x - b.x;
			});

			pnt = new EasePoint(1, 1, null);
			i = points;
			while (--i > -1) {
				obj = a[i];
				pnt = new EasePoint(obj.x, obj.y, pnt);
			}

			this._prev = new EasePoint(0, 0, (pnt.t !== 0) ? pnt : pnt.next);
		}, true);
		p = RoughEase.prototype = new Ease();
		p.constructor = RoughEase;
		p.getRatio = function(p) {
			var pnt = this._prev;
			if (p > pnt.t) {
				while (pnt.next && p >= pnt.t) {
					pnt = pnt.next;
				}
				pnt = pnt.prev;
			} else {
				while (pnt.prev && p <= pnt.t) {
					pnt = pnt.prev;
				}
			}
			this._prev = pnt;
			return (pnt.v + ((p - pnt.t) / pnt.gap) * pnt.c);
		};
		p.config = function(vars) {
			return new RoughEase(vars);
		};
		RoughEase.ease = new RoughEase();


		//Bounce
		_wrap("Bounce",
			_create("BounceOut", function(p) {
				if (p < 1 / 2.75) {
					return 7.5625 * p * p;
				} else if (p < 2 / 2.75) {
					return 7.5625 * (p -= 1.5 / 2.75) * p + 0.75;
				} else if (p < 2.5 / 2.75) {
					return 7.5625 * (p -= 2.25 / 2.75) * p + 0.9375;
				}
				return 7.5625 * (p -= 2.625 / 2.75) * p + 0.984375;
			}),
			_create("BounceIn", function(p) {
				if ((p = 1 - p) < 1 / 2.75) {
					return 1 - (7.5625 * p * p);
				} else if (p < 2 / 2.75) {
					return 1 - (7.5625 * (p -= 1.5 / 2.75) * p + 0.75);
				} else if (p < 2.5 / 2.75) {
					return 1 - (7.5625 * (p -= 2.25 / 2.75) * p + 0.9375);
				}
				return 1 - (7.5625 * (p -= 2.625 / 2.75) * p + 0.984375);
			}),
			_create("BounceInOut", function(p) {
				var invert = (p < 0.5);
				if (invert) {
					p = 1 - (p * 2);
				} else {
					p = (p * 2) - 1;
				}
				if (p < 1 / 2.75) {
					p = 7.5625 * p * p;
				} else if (p < 2 / 2.75) {
					p = 7.5625 * (p -= 1.5 / 2.75) * p + 0.75;
				} else if (p < 2.5 / 2.75) {
					p = 7.5625 * (p -= 2.25 / 2.75) * p + 0.9375;
				} else {
					p = 7.5625 * (p -= 2.625 / 2.75) * p + 0.984375;
				}
				return invert ? (1 - p) * 0.5 : p * 0.5 + 0.5;
			})
		);


		//CIRC
		_wrap("Circ",
			_create("CircOut", function(p) {
				return Math.sqrt(1 - (p = p - 1) * p);
			}),
			_create("CircIn", function(p) {
				return -(Math.sqrt(1 - (p * p)) - 1);
			}),
			_create("CircInOut", function(p) {
				return ((p*=2) < 1) ? -0.5 * (Math.sqrt(1 - p * p) - 1) : 0.5 * (Math.sqrt(1 - (p -= 2) * p) + 1);
			})
		);


		//Elastic
		_createElastic = function(n, f, def) {
			var C = _class("easing." + n, function(amplitude, period) {
					this._p1 = (amplitude >= 1) ? amplitude : 1; //note: if amplitude is < 1, we simply adjust the period for a more natural feel. Otherwise the math doesn't work right and the curve starts at 1.
					this._p2 = (period || def) / (amplitude < 1 ? amplitude : 1);
					this._p3 = this._p2 / _2PI * (Math.asin(1 / this._p1) || 0);
					this._p2 = _2PI / this._p2; //precalculate to optimize
				}, true),
				p = C.prototype = new Ease();
			p.constructor = C;
			p.getRatio = f;
			p.config = function(amplitude, period) {
				return new C(amplitude, period);
			};
			return C;
		};
		_wrap("Elastic",
			_createElastic("ElasticOut", function(p) {
				return this._p1 * Math.pow(2, -10 * p) * Math.sin( (p - this._p3) * this._p2 ) + 1;
			}, 0.3),
			_createElastic("ElasticIn", function(p) {
				return -(this._p1 * Math.pow(2, 10 * (p -= 1)) * Math.sin( (p - this._p3) * this._p2 ));
			}, 0.3),
			_createElastic("ElasticInOut", function(p) {
				return ((p *= 2) < 1) ? -0.5 * (this._p1 * Math.pow(2, 10 * (p -= 1)) * Math.sin( (p - this._p3) * this._p2)) : this._p1 * Math.pow(2, -10 *(p -= 1)) * Math.sin( (p - this._p3) * this._p2 ) * 0.5 + 1;
			}, 0.45)
		);


		//Expo
		_wrap("Expo",
			_create("ExpoOut", function(p) {
				return 1 - Math.pow(2, -10 * p);
			}),
			_create("ExpoIn", function(p) {
				return Math.pow(2, 10 * (p - 1)) - 0.001;
			}),
			_create("ExpoInOut", function(p) {
				return ((p *= 2) < 1) ? 0.5 * Math.pow(2, 10 * (p - 1)) : 0.5 * (2 - Math.pow(2, -10 * (p - 1)));
			})
		);


		//Sine
		_wrap("Sine",
			_create("SineOut", function(p) {
				return Math.sin(p * _HALF_PI);
			}),
			_create("SineIn", function(p) {
				return -Math.cos(p * _HALF_PI) + 1;
			}),
			_create("SineInOut", function(p) {
				return -0.5 * (Math.cos(Math.PI * p) - 1);
			})
		);

		_class("easing.EaseLookup", {
				find:function(s) {
					return Ease.map[s];
				}
			}, true);

		//register the non-standard eases
		_easeReg(w.SlowMo, "SlowMo", "ease,");
		_easeReg(RoughEase, "RoughEase", "ease,");
		_easeReg(SteppedEase, "SteppedEase", "ease,");

		return Back;
		
	}, true);


});

if (_gsScope._gsDefine) { _gsScope._gsQueue.pop()(); } //necessary in case TweenLite was already loaded separately.











/*
 * ----------------------------------------------------------------
 * Base classes like TweenLite, SimpleTimeline, Ease, Ticker, etc.
 * ----------------------------------------------------------------
 */
(function(window, moduleName) {

		"use strict";
		var _globals = window.GreenSockGlobals = window.GreenSockGlobals || window;
		if (_globals.TweenLite) {
			return; //in case the core set of classes is already loaded, don't instantiate twice.
		}
		var _namespace = function(ns) {
				var a = ns.split("."),
					p = _globals, i;
				for (i = 0; i < a.length; i++) {
					p[a[i]] = p = p[a[i]] || {};
				}
				return p;
			},
			gs = _namespace("com.greensock"),
			_tinyNum = 0.0000000001,
			_slice = function(a) { //don't use Array.prototype.slice.call(target, 0) because that doesn't work in IE8 with a NodeList that's returned by querySelectorAll()
				var b = [],
					l = a.length,
					i;
				for (i = 0; i !== l; b.push(a[i++])) {}
				return b;
			},
			_emptyFunc = function() {},
			_isArray = (function() { //works around issues in iframe environments where the Array global isn't shared, thus if the object originates in a different window/iframe, "(obj instanceof Array)" will evaluate false. We added some speed optimizations to avoid Object.prototype.toString.call() unless it's absolutely necessary because it's VERY slow (like 20x slower)
				var toString = Object.prototype.toString,
					array = toString.call([]);
				return function(obj) {
					return obj != null && (obj instanceof Array || (typeof(obj) === "object" && !!obj.push && toString.call(obj) === array));
				};
			}()),
			a, i, p, _ticker, _tickerActive,
			_defLookup = {},

			/**
			 * @constructor
			 * Defines a GreenSock class, optionally with an array of dependencies that must be instantiated first and passed into the definition.
			 * This allows users to load GreenSock JS files in any order even if they have interdependencies (like CSSPlugin extends TweenPlugin which is
			 * inside TweenLite.js, but if CSSPlugin is loaded first, it should wait to run its code until TweenLite.js loads and instantiates TweenPlugin
			 * and then pass TweenPlugin to CSSPlugin's definition). This is all done automatically and internally.
			 *
			 * Every definition will be added to a "com.greensock" global object (typically window, but if a window.GreenSockGlobals object is found,
			 * it will go there as of v1.7). For example, TweenLite will be found at window.com.greensock.TweenLite and since it's a global class that should be available anywhere,
			 * it is ALSO referenced at window.TweenLite. However some classes aren't considered global, like the base com.greensock.core.Animation class, so
			 * those will only be at the package like window.com.greensock.core.Animation. Again, if you define a GreenSockGlobals object on the window, everything
			 * gets tucked neatly inside there instead of on the window directly. This allows you to do advanced things like load multiple versions of GreenSock
			 * files and put them into distinct objects (imagine a banner ad uses a newer version but the main site uses an older one). In that case, you could
			 * sandbox the banner one like:
			 *
			 * <script>
			 *     var gs = window.GreenSockGlobals = {}; //the newer version we're about to load could now be referenced in a "gs" object, like gs.TweenLite.to(...). Use whatever alias you want as long as it's unique, "gs" or "banner" or whatever.
			 * </script>
			 * <script src="js/greensock/v1.7/TweenMax.js"></script>
			 * <script>
			 *     window.GreenSockGlobals = window._gsQueue = window._gsDefine = null; //reset it back to null (along with the special _gsQueue variable) so that the next load of TweenMax affects the window and we can reference things directly like TweenLite.to(...)
			 * </script>
			 * <script src="js/greensock/v1.6/TweenMax.js"></script>
			 * <script>
			 *     gs.TweenLite.to(...); //would use v1.7
			 *     TweenLite.to(...); //would use v1.6
			 * </script>
			 *
			 * @param {!string} ns The namespace of the class definition, leaving off "com.greensock." as that's assumed. For example, "TweenLite" or "plugins.CSSPlugin" or "easing.Back".
			 * @param {!Array.<string>} dependencies An array of dependencies (described as their namespaces minus "com.greensock." prefix). For example ["TweenLite","plugins.TweenPlugin","core.Animation"]
			 * @param {!function():Object} func The function that should be called and passed the resolved dependencies which will return the actual class for this definition.
			 * @param {boolean=} global If true, the class will be added to the global scope (typically window unless you define a window.GreenSockGlobals object)
			 */
			Definition = function(ns, dependencies, func, global) {
				this.sc = (_defLookup[ns]) ? _defLookup[ns].sc : []; //subclasses
				_defLookup[ns] = this;
				this.gsClass = null;
				this.func = func;
				var _classes = [];
				this.check = function(init) {
					var i = dependencies.length,
						missing = i,
						cur, a, n, cl, hasModule;
					while (--i > -1) {
						if ((cur = _defLookup[dependencies[i]] || new Definition(dependencies[i], [])).gsClass) {
							_classes[i] = cur.gsClass;
							missing--;
						} else if (init) {
							cur.sc.push(this);
						}
					}
					if (missing === 0 && func) {
						a = ("com.greensock." + ns).split(".");
						n = a.pop();
						cl = _namespace(a.join("."))[n] = this.gsClass = func.apply(func, _classes);

						//exports to multiple environments
						if (global) {
							_globals[n] = cl; //provides a way to avoid global namespace pollution. By default, the main classes like TweenLite, Power1, Strong, etc. are added to window unless a GreenSockGlobals is defined. So if you want to have things added to a custom object instead, just do something like window.GreenSockGlobals = {} before loading any GreenSock files. You can even set up an alias like window.GreenSockGlobals = windows.gs = {} so that you can access everything like gs.TweenLite. Also remember that ALL classes are added to the window.com.greensock object (in their respective packages, like com.greensock.easing.Power1, com.greensock.TweenLite, etc.)
							hasModule = (typeof(module) !== "undefined" && module.exports);
							if (!hasModule && typeof(define) === "function" && define.amd){ //AMD
								define((window.GreenSockAMDPath ? window.GreenSockAMDPath + "/" : "") + ns.split(".").pop(), [], function() { return cl; });
							} else if (ns === moduleName && hasModule){ //node
								module.exports = cl;
							}
						}
						for (i = 0; i < this.sc.length; i++) {
							this.sc[i].check();
						}
					}
				};
				this.check(true);
			},

			//used to create Definition instances (which basically registers a class that has dependencies).
			_gsDefine = window._gsDefine = function(ns, dependencies, func, global) {
				return new Definition(ns, dependencies, func, global);
			},

			//a quick way to create a class that doesn't have any dependencies. Returns the class, but first registers it in the GreenSock namespace so that other classes can grab it (other classes might be dependent on the class).
			_class = gs._class = function(ns, func, global) {
				func = func || function() {};
				_gsDefine(ns, [], function(){ return func; }, global);
				return func;
			};

		_gsDefine.globals = _globals;



/*
 * ----------------------------------------------------------------
 * Ease
 * ----------------------------------------------------------------
 */
		var _baseParams = [0, 0, 1, 1],
			_blankArray = [],
			Ease = _class("easing.Ease", function(func, extraParams, type, power) {
				this._func = func;
				this._type = type || 0;
				this._power = power || 0;
				this._params = extraParams ? _baseParams.concat(extraParams) : _baseParams;
			}, true),
			_easeMap = Ease.map = {},
			_easeReg = Ease.register = function(ease, names, types, create) {
				var na = names.split(","),
					i = na.length,
					ta = (types || "easeIn,easeOut,easeInOut").split(","),
					e, name, j, type;
				while (--i > -1) {
					name = na[i];
					e = create ? _class("easing."+name, null, true) : gs.easing[name] || {};
					j = ta.length;
					while (--j > -1) {
						type = ta[j];
						_easeMap[name + "." + type] = _easeMap[type + name] = e[type] = ease.getRatio ? ease : ease[type] || new ease();
					}
				}
			};

		p = Ease.prototype;
		p._calcEnd = false;
		p.getRatio = function(p) {
			if (this._func) {
				this._params[0] = p;
				return this._func.apply(null, this._params);
			}
			var t = this._type,
				pw = this._power,
				r = (t === 1) ? 1 - p : (t === 2) ? p : (p < 0.5) ? p * 2 : (1 - p) * 2;
			if (pw === 1) {
				r *= r;
			} else if (pw === 2) {
				r *= r * r;
			} else if (pw === 3) {
				r *= r * r * r;
			} else if (pw === 4) {
				r *= r * r * r * r;
			}
			return (t === 1) ? 1 - r : (t === 2) ? r : (p < 0.5) ? r / 2 : 1 - (r / 2);
		};

		//create all the standard eases like Linear, Quad, Cubic, Quart, Quint, Strong, Power0, Power1, Power2, Power3, and Power4 (each with easeIn, easeOut, and easeInOut)
		a = ["Linear","Quad","Cubic","Quart","Quint,Strong"];
		i = a.length;
		while (--i > -1) {
			p = a[i]+",Power"+i;
			_easeReg(new Ease(null,null,1,i), p, "easeOut", true);
			_easeReg(new Ease(null,null,2,i), p, "easeIn" + ((i === 0) ? ",easeNone" : ""));
			_easeReg(new Ease(null,null,3,i), p, "easeInOut");
		}
		_easeMap.linear = gs.easing.Linear.easeIn;
		_easeMap.swing = gs.easing.Quad.easeInOut; //for jQuery folks


/*
 * ----------------------------------------------------------------
 * EventDispatcher
 * ----------------------------------------------------------------
 */
		var EventDispatcher = _class("events.EventDispatcher", function(target) {
			this._listeners = {};
			this._eventTarget = target || this;
		});
		p = EventDispatcher.prototype;

		p.addEventListener = function(type, callback, scope, useParam, priority) {
			priority = priority || 0;
			var list = this._listeners[type],
				index = 0,
				listener, i;
			if (list == null) {
				this._listeners[type] = list = [];
			}
			i = list.length;
			while (--i > -1) {
				listener = list[i];
				if (listener.c === callback && listener.s === scope) {
					list.splice(i, 1);
				} else if (index === 0 && listener.pr < priority) {
					index = i + 1;
				}
			}
			list.splice(index, 0, {c:callback, s:scope, up:useParam, pr:priority});
			if (this === _ticker && !_tickerActive) {
				_ticker.wake();
			}
		};

		p.removeEventListener = function(type, callback) {
			var list = this._listeners[type], i;
			if (list) {
				i = list.length;
				while (--i > -1) {
					if (list[i].c === callback) {
						list.splice(i, 1);
						return;
					}
				}
			}
		};

		p.dispatchEvent = function(type) {
			var list = this._listeners[type],
				i, t, listener;
			if (list) {
				i = list.length;
				t = this._eventTarget;
				while (--i > -1) {
					listener = list[i];
					if (listener) {
						if (listener.up) {
							listener.c.call(listener.s || t, {type:type, target:t});
						} else {
							listener.c.call(listener.s || t);
						}
					}
				}
			}
		};


/*
 * ----------------------------------------------------------------
 * Ticker
 * ----------------------------------------------------------------
 */
 		var _reqAnimFrame = window.requestAnimationFrame,
			_cancelAnimFrame = window.cancelAnimationFrame,
			_getTime = Date.now || function() {return new Date().getTime();},
			_lastUpdate = _getTime();

		//now try to determine the requestAnimationFrame and cancelAnimationFrame functions and if none are found, we'll use a setTimeout()/clearTimeout() polyfill.
		a = ["ms","moz","webkit","o"];
		i = a.length;
		while (--i > -1 && !_reqAnimFrame) {
			_reqAnimFrame = window[a[i] + "RequestAnimationFrame"];
			_cancelAnimFrame = window[a[i] + "CancelAnimationFrame"] || window[a[i] + "CancelRequestAnimationFrame"];
		}

		_class("Ticker", function(fps, useRAF) {
			var _self = this,
				_startTime = _getTime(),
				_useRAF = (useRAF !== false && _reqAnimFrame) ? "auto" : false,
				_lagThreshold = 500,
				_adjustedLag = 33,
				_tickWord = "tick", //helps reduce gc burden
				_fps, _req, _id, _gap, _nextTime,
				_tick = function(manual) {
					var elapsed = _getTime() - _lastUpdate,
						overlap, dispatch;
					if (elapsed > _lagThreshold) {
						_startTime += elapsed - _adjustedLag;
					}
					_lastUpdate += elapsed;
					_self.time = (_lastUpdate - _startTime) / 1000;
					overlap = _self.time - _nextTime;
					if (!_fps || overlap > 0 || manual === true) {
						_self.frame++;
						_nextTime += overlap + (overlap >= _gap ? 0.004 : _gap - overlap);
						dispatch = true;
					}
					if (manual !== true) { //make sure the request is made before we dispatch the "tick" event so that timing is maintained. Otherwise, if processing the "tick" requires a bunch of time (like 15ms) and we're using a setTimeout() that's based on 16.7ms, it'd technically take 31.7ms between frames otherwise.
						_id = _req(_tick);
					}
					if (dispatch) {
						_self.dispatchEvent(_tickWord);
					}
				};

			EventDispatcher.call(_self);
			_self.time = _self.frame = 0;
			_self.tick = function() {
				_tick(true);
			};

			_self.lagSmoothing = function(threshold, adjustedLag) {
				_lagThreshold = threshold || (1 / _tinyNum); //zero should be interpreted as basically unlimited
				_adjustedLag = Math.min(adjustedLag, _lagThreshold, 0);
			};

			_self.sleep = function() {
				if (_id == null) {
					return;
				}
				if (!_useRAF || !_cancelAnimFrame) {
					clearTimeout(_id);
				} else {
					_cancelAnimFrame(_id);
				}
				_req = _emptyFunc;
				_id = null;
				if (_self === _ticker) {
					_tickerActive = false;
				}
			};

			_self.wake = function(seamless) {
				if (_id !== null) {
					_self.sleep();
				} else if (seamless) {
					_startTime += -_lastUpdate + (_lastUpdate = _getTime());
				} else if (_self.frame > 10) { //don't trigger lagSmoothing if we're just waking up, and make sure that at least 10 frames have elapsed because of the iOS bug that we work around below with the 1.5-second setTimout().
					_lastUpdate = _getTime() - _lagThreshold + 5;
				}
				_req = (_fps === 0) ? _emptyFunc : (!_useRAF || !_reqAnimFrame) ? function(f) { return setTimeout(f, ((_nextTime - _self.time) * 1000 + 1) | 0); } : _reqAnimFrame;
				if (_self === _ticker) {
					_tickerActive = true;
				}
				_tick(2);
			};

			_self.fps = function(value) {
				if (!arguments.length) {
					return _fps;
				}
				_fps = value;
				_gap = 1 / (_fps || 60);
				_nextTime = this.time + _gap;
				_self.wake();
			};

			_self.useRAF = function(value) {
				if (!arguments.length) {
					return _useRAF;
				}
				_self.sleep();
				_useRAF = value;
				_self.fps(_fps);
			};
			_self.fps(fps);

			//a bug in iOS 6 Safari occasionally prevents the requestAnimationFrame from working initially, so we use a 1.5-second timeout that automatically falls back to setTimeout() if it senses this condition.
			setTimeout(function() {
				if (_useRAF === "auto" && _self.frame < 5 && document.visibilityState !== "hidden") {
					_self.useRAF(false);
				}
			}, 1500);
		});

		p = gs.Ticker.prototype = new gs.events.EventDispatcher();
		p.constructor = gs.Ticker;


/*
 * ----------------------------------------------------------------
 * Animation
 * ----------------------------------------------------------------
 */
		var Animation = _class("core.Animation", function(duration, vars) {
				this.vars = vars = vars || {};
				this._duration = this._totalDuration = duration || 0;
				this._delay = Number(vars.delay) || 0;
				this._timeScale = 1;
				this._active = (vars.immediateRender === true);
				this.data = vars.data;
				this._reversed = (vars.reversed === true);

				if (!_rootTimeline) {
					return;
				}
				if (!_tickerActive) { //some browsers (like iOS 6 Safari) shut down JavaScript execution when the tab is disabled and they [occasionally] neglect to start up requestAnimationFrame again when returning - this code ensures that the engine starts up again properly.
					_ticker.wake();
				}

				var tl = this.vars.useFrames ? _rootFramesTimeline : _rootTimeline;
				tl.add(this, tl._time);

				if (this.vars.paused) {
					this.paused(true);
				}
			});

		_ticker = Animation.ticker = new gs.Ticker();
		p = Animation.prototype;
		p._dirty = p._gc = p._initted = p._paused = false;
		p._totalTime = p._time = 0;
		p._rawPrevTime = -1;
		p._next = p._last = p._onUpdate = p._timeline = p.timeline = null;
		p._paused = false;


		//some browsers (like iOS) occasionally drop the requestAnimationFrame event when the user switches to a different tab and then comes back again, so we use a 2-second setTimeout() to sense if/when that condition occurs and then wake() the ticker.
		var _checkTimeout = function() {
				if (_tickerActive && _getTime() - _lastUpdate > 2000) {
					_ticker.wake();
				}
				setTimeout(_checkTimeout, 2000);
			};
		_checkTimeout();


		p.play = function(from, suppressEvents) {
			if (from != null) {
				this.seek(from, suppressEvents);
			}
			return this.reversed(false).paused(false);
		};

		p.pause = function(atTime, suppressEvents) {
			if (atTime != null) {
				this.seek(atTime, suppressEvents);
			}
			return this.paused(true);
		};

		p.resume = function(from, suppressEvents) {
			if (from != null) {
				this.seek(from, suppressEvents);
			}
			return this.paused(false);
		};

		p.seek = function(time, suppressEvents) {
			return this.totalTime(Number(time), suppressEvents !== false);
		};

		p.restart = function(includeDelay, suppressEvents) {
			return this.reversed(false).paused(false).totalTime(includeDelay ? -this._delay : 0, (suppressEvents !== false), true);
		};

		p.reverse = function(from, suppressEvents) {
			if (from != null) {
				this.seek((from || this.totalDuration()), suppressEvents);
			}
			return this.reversed(true).paused(false);
		};

		p.render = function(time, suppressEvents, force) {
			//stub - we override this method in subclasses.
		};

		p.invalidate = function() {
			this._time = this._totalTime = 0;
			this._initted = this._gc = false;
			this._rawPrevTime = -1;
			if (this._gc || !this.timeline) {
				this._enabled(true);
			}
			return this;
		};

		p.isActive = function() {
			var tl = this._timeline, //the 2 root timelines won't have a _timeline; they're always active.
				startTime = this._startTime,
				rawTime;
			return (!tl || (!this._gc && !this._paused && tl.isActive() && (rawTime = tl.rawTime()) >= startTime && rawTime < startTime + this.totalDuration() / this._timeScale));
		};

		p._enabled = function (enabled, ignoreTimeline) {
			if (!_tickerActive) {
				_ticker.wake();
			}
			this._gc = !enabled;
			this._active = this.isActive();
			if (ignoreTimeline !== true) {
				if (enabled && !this.timeline) {
					this._timeline.add(this, this._startTime - this._delay);
				} else if (!enabled && this.timeline) {
					this._timeline._remove(this, true);
				}
			}
			return false;
		};


		p._kill = function(vars, target) {
			return this._enabled(false, false);
		};

		p.kill = function(vars, target) {
			this._kill(vars, target);
			return this;
		};

		p._uncache = function(includeSelf) {
			var tween = includeSelf ? this : this.timeline;
			while (tween) {
				tween._dirty = true;
				tween = tween.timeline;
			}
			return this;
		};

		p._swapSelfInParams = function(params) {
			var i = params.length,
				copy = params.concat();
			while (--i > -1) {
				if (params[i] === "{self}") {
					copy[i] = this;
				}
			}
			return copy;
		};

		p._callback = function(type) {
			var v = this.vars;
			v[type].apply(v[type + "Scope"] || v.callbackScope || this, v[type + "Params"] || _blankArray);
		};

//----Animation getters/setters --------------------------------------------------------

		p.eventCallback = function(type, callback, params, scope) {
			if ((type || "").substr(0,2) === "on") {
				var v = this.vars;
				if (arguments.length === 1) {
					return v[type];
				}
				if (callback == null) {
					delete v[type];
				} else {
					v[type] = callback;
					v[type + "Params"] = (_isArray(params) && params.join("").indexOf("{self}") !== -1) ? this._swapSelfInParams(params) : params;
					v[type + "Scope"] = scope;
				}
				if (type === "onUpdate") {
					this._onUpdate = callback;
				}
			}
			return this;
		};

		p.delay = function(value) {
			if (!arguments.length) {
				return this._delay;
			}
			if (this._timeline.smoothChildTiming) {
				this.startTime( this._startTime + value - this._delay );
			}
			this._delay = value;
			return this;
		};

		p.duration = function(value) {
			if (!arguments.length) {
				this._dirty = false;
				return this._duration;
			}
			this._duration = this._totalDuration = value;
			this._uncache(true); //true in case it's a TweenMax or TimelineMax that has a repeat - we'll need to refresh the totalDuration.
			if (this._timeline.smoothChildTiming) if (this._time > 0) if (this._time < this._duration) if (value !== 0) {
				this.totalTime(this._totalTime * (value / this._duration), true);
			}
			return this;
		};

		p.totalDuration = function(value) {
			this._dirty = false;
			return (!arguments.length) ? this._totalDuration : this.duration(value);
		};

		p.time = function(value, suppressEvents) {
			if (!arguments.length) {
				return this._time;
			}
			if (this._dirty) {
				this.totalDuration();
			}
			return this.totalTime((value > this._duration) ? this._duration : value, suppressEvents);
		};

		p.totalTime = function(time, suppressEvents, uncapped) {
			if (!_tickerActive) {
				_ticker.wake();
			}
			if (!arguments.length) {
				return this._totalTime;
			}
			if (this._timeline) {
				if (time < 0 && !uncapped) {
					time += this.totalDuration();
				}
				if (this._timeline.smoothChildTiming) {
					if (this._dirty) {
						this.totalDuration();
					}
					var totalDuration = this._totalDuration,
						tl = this._timeline;
					if (time > totalDuration && !uncapped) {
						time = totalDuration;
					}
					this._startTime = (this._paused ? this._pauseTime : tl._time) - ((!this._reversed ? time : totalDuration - time) / this._timeScale);
					if (!tl._dirty) { //for performance improvement. If the parent's cache is already dirty, it already took care of marking the ancestors as dirty too, so skip the function call here.
						this._uncache(false);
					}
					//in case any of the ancestor timelines had completed but should now be enabled, we should reset their totalTime() which will also ensure that they're lined up properly and enabled. Skip for animations that are on the root (wasteful). Example: a TimelineLite.exportRoot() is performed when there's a paused tween on the root, the export will not complete until that tween is unpaused, but imagine a child gets restarted later, after all [unpaused] tweens have completed. The startTime of that child would get pushed out, but one of the ancestors may have completed.
					if (tl._timeline) {
						while (tl._timeline) {
							if (tl._timeline._time !== (tl._startTime + tl._totalTime) / tl._timeScale) {
								tl.totalTime(tl._totalTime, true);
							}
							tl = tl._timeline;
						}
					}
				}
				if (this._gc) {
					this._enabled(true, false);
				}
				if (this._totalTime !== time || this._duration === 0) {
					if (_lazyTweens.length) {
						_lazyRender();
					}
					this.render(time, suppressEvents, false);
					if (_lazyTweens.length) { //in case rendering caused any tweens to lazy-init, we should render them because typically when someone calls seek() or time() or progress(), they expect an immediate render.
						_lazyRender();
					}
				}
			}
			return this;
		};

		p.progress = p.totalProgress = function(value, suppressEvents) {
			var duration = this.duration();
			return (!arguments.length) ? (duration ? this._time / duration : this.ratio) : this.totalTime(duration * value, suppressEvents);
		};

		p.startTime = function(value) {
			if (!arguments.length) {
				return this._startTime;
			}
			if (value !== this._startTime) {
				this._startTime = value;
				if (this.timeline) if (this.timeline._sortChildren) {
					this.timeline.add(this, value - this._delay); //ensures that any necessary re-sequencing of Animations in the timeline occurs to make sure the rendering order is correct.
				}
			}
			return this;
		};

		p.endTime = function(includeRepeats) {
			return this._startTime + ((includeRepeats != false) ? this.totalDuration() : this.duration()) / this._timeScale;
		};

		p.timeScale = function(value) {
			if (!arguments.length) {
				return this._timeScale;
			}
			value = value || _tinyNum; //can't allow zero because it'll throw the math off
			if (this._timeline && this._timeline.smoothChildTiming) {
				var pauseTime = this._pauseTime,
					t = (pauseTime || pauseTime === 0) ? pauseTime : this._timeline.totalTime();
				this._startTime = t - ((t - this._startTime) * this._timeScale / value);
			}
			this._timeScale = value;
			return this._uncache(false);
		};

		p.reversed = function(value) {
			if (!arguments.length) {
				return this._reversed;
			}
			if (value != this._reversed) {
				this._reversed = value;
				this.totalTime(((this._timeline && !this._timeline.smoothChildTiming) ? this.totalDuration() - this._totalTime : this._totalTime), true);
			}
			return this;
		};

		p.paused = function(value) {
			if (!arguments.length) {
				return this._paused;
			}
			var tl = this._timeline,
				raw, elapsed;
			if (value != this._paused) if (tl) {
				if (!_tickerActive && !value) {
					_ticker.wake();
				}
				raw = tl.rawTime();
				elapsed = raw - this._pauseTime;
				if (!value && tl.smoothChildTiming) {
					this._startTime += elapsed;
					this._uncache(false);
				}
				this._pauseTime = value ? raw : null;
				this._paused = value;
				this._active = this.isActive();
				if (!value && elapsed !== 0 && this._initted && this.duration()) {
					raw = tl.smoothChildTiming ? this._totalTime : (raw - this._startTime) / this._timeScale;
					this.render(raw, (raw === this._totalTime), true); //in case the target's properties changed via some other tween or manual update by the user, we should force a render.
				}
			}
			if (this._gc && !value) {
				this._enabled(true, false);
			}
			return this;
		};


/*
 * ----------------------------------------------------------------
 * SimpleTimeline
 * ----------------------------------------------------------------
 */
		var SimpleTimeline = _class("core.SimpleTimeline", function(vars) {
			Animation.call(this, 0, vars);
			this.autoRemoveChildren = this.smoothChildTiming = true;
		});

		p = SimpleTimeline.prototype = new Animation();
		p.constructor = SimpleTimeline;
		p.kill()._gc = false;
		p._first = p._last = p._recent = null;
		p._sortChildren = false;

		p.add = p.insert = function(child, position, align, stagger) {
			var prevTween, st;
			child._startTime = Number(position || 0) + child._delay;
			if (child._paused) if (this !== child._timeline) { //we only adjust the _pauseTime if it wasn't in this timeline already. Remember, sometimes a tween will be inserted again into the same timeline when its startTime is changed so that the tweens in the TimelineLite/Max are re-ordered properly in the linked list (so everything renders in the proper order).
				child._pauseTime = child._startTime + ((this.rawTime() - child._startTime) / child._timeScale);
			}
			if (child.timeline) {
				child.timeline._remove(child, true); //removes from existing timeline so that it can be properly added to this one.
			}
			child.timeline = child._timeline = this;
			if (child._gc) {
				child._enabled(true, true);
			}
			prevTween = this._last;
			if (this._sortChildren) {
				st = child._startTime;
				while (prevTween && prevTween._startTime > st) {
					prevTween = prevTween._prev;
				}
			}
			if (prevTween) {
				child._next = prevTween._next;
				prevTween._next = child;
			} else {
				child._next = this._first;
				this._first = child;
			}
			if (child._next) {
				child._next._prev = child;
			} else {
				this._last = child;
			}
			child._prev = prevTween;
			this._recent = child;
			if (this._timeline) {
				this._uncache(true);
			}
			return this;
		};

		p._remove = function(tween, skipDisable) {
			if (tween.timeline === this) {
				if (!skipDisable) {
					tween._enabled(false, true);
				}

				if (tween._prev) {
					tween._prev._next = tween._next;
				} else if (this._first === tween) {
					this._first = tween._next;
				}
				if (tween._next) {
					tween._next._prev = tween._prev;
				} else if (this._last === tween) {
					this._last = tween._prev;
				}
				tween._next = tween._prev = tween.timeline = null;
				if (tween === this._recent) {
					this._recent = this._last;
				}

				if (this._timeline) {
					this._uncache(true);
				}
			}
			return this;
		};

		p.render = function(time, suppressEvents, force) {
			var tween = this._first,
				next;
			this._totalTime = this._time = this._rawPrevTime = time;
			while (tween) {
				next = tween._next; //record it here because the value could change after rendering...
				if (tween._active || (time >= tween._startTime && !tween._paused)) {
					if (!tween._reversed) {
						tween.render((time - tween._startTime) * tween._timeScale, suppressEvents, force);
					} else {
						tween.render(((!tween._dirty) ? tween._totalDuration : tween.totalDuration()) - ((time - tween._startTime) * tween._timeScale), suppressEvents, force);
					}
				}
				tween = next;
			}
		};

		p.rawTime = function() {
			if (!_tickerActive) {
				_ticker.wake();
			}
			return this._totalTime;
		};

/*
 * ----------------------------------------------------------------
 * TweenLite
 * ----------------------------------------------------------------
 */
		var TweenLite = _class("TweenLite", function(target, duration, vars) {
				Animation.call(this, duration, vars);
				this.render = TweenLite.prototype.render; //speed optimization (avoid prototype lookup on this "hot" method)

				if (target == null) {
					throw "Cannot tween a null target.";
				}

				this.target = target = (typeof(target) !== "string") ? target : TweenLite.selector(target) || target;

				var isSelector = (target.jquery || (target.length && target !== window && target[0] && (target[0] === window || (target[0].nodeType && target[0].style && !target.nodeType)))),
					overwrite = this.vars.overwrite,
					i, targ, targets;

				this._overwrite = overwrite = (overwrite == null) ? _overwriteLookup[TweenLite.defaultOverwrite] : (typeof(overwrite) === "number") ? overwrite >> 0 : _overwriteLookup[overwrite];

				if ((isSelector || target instanceof Array || (target.push && _isArray(target))) && typeof(target[0]) !== "number") {
					this._targets = targets = _slice(target);  //don't use Array.prototype.slice.call(target, 0) because that doesn't work in IE8 with a NodeList that's returned by querySelectorAll()
					this._propLookup = [];
					this._siblings = [];
					for (i = 0; i < targets.length; i++) {
						targ = targets[i];
						if (!targ) {
							targets.splice(i--, 1);
							continue;
						} else if (typeof(targ) === "string") {
							targ = targets[i--] = TweenLite.selector(targ); //in case it's an array of strings
							if (typeof(targ) === "string") {
								targets.splice(i+1, 1); //to avoid an endless loop (can't imagine why the selector would return a string, but just in case)
							}
							continue;
						} else if (targ.length && targ !== window && targ[0] && (targ[0] === window || (targ[0].nodeType && targ[0].style && !targ.nodeType))) { //in case the user is passing in an array of selector objects (like jQuery objects), we need to check one more level and pull things out if necessary. Also note that <select> elements pass all the criteria regarding length and the first child having style, so we must also check to ensure the target isn't an HTML node itself.
							targets.splice(i--, 1);
							this._targets = targets = targets.concat(_slice(targ));
							continue;
						}
						this._siblings[i] = _register(targ, this, false);
						if (overwrite === 1) if (this._siblings[i].length > 1) {
							_applyOverwrite(targ, this, null, 1, this._siblings[i]);
						}
					}

				} else {
					this._propLookup = {};
					this._siblings = _register(target, this, false);
					if (overwrite === 1) if (this._siblings.length > 1) {
						_applyOverwrite(target, this, null, 1, this._siblings);
					}
				}
				if (this.vars.immediateRender || (duration === 0 && this._delay === 0 && this.vars.immediateRender !== false)) {
					this._time = -_tinyNum; //forces a render without having to set the render() "force" parameter to true because we want to allow lazying by default (using the "force" parameter always forces an immediate full render)
					this.render(-this._delay);
				}
			}, true),
			_isSelector = function(v) {
				return (v && v.length && v !== window && v[0] && (v[0] === window || (v[0].nodeType && v[0].style && !v.nodeType))); //we cannot check "nodeType" if the target is window from within an iframe, otherwise it will trigger a security error in some browsers like Firefox.
			},
			_autoCSS = function(vars, target) {
				var css = {},
					p;
				for (p in vars) {
					if (!_reservedProps[p] && (!(p in target) || p === "transform" || p === "x" || p === "y" || p === "width" || p === "height" || p === "className" || p === "border") && (!_plugins[p] || (_plugins[p] && _plugins[p]._autoCSS))) { //note: <img> elements contain read-only "x" and "y" properties. We should also prioritize editing css width/height rather than the element's properties.
						css[p] = vars[p];
						delete vars[p];
					}
				}
				vars.css = css;
			};

		p = TweenLite.prototype = new Animation();
		p.constructor = TweenLite;
		p.kill()._gc = false;

//----TweenLite defaults, overwrite management, and root updates ----------------------------------------------------

		p.ratio = 0;
		p._firstPT = p._targets = p._overwrittenProps = p._startAt = null;
		p._notifyPluginsOfEnabled = p._lazy = false;

		TweenLite.version = "1.18.2";
		TweenLite.defaultEase = p._ease = new Ease(null, null, 1, 1);
		TweenLite.defaultOverwrite = "auto";
		TweenLite.ticker = _ticker;
		TweenLite.autoSleep = 120;
		TweenLite.lagSmoothing = function(threshold, adjustedLag) {
			_ticker.lagSmoothing(threshold, adjustedLag);
		};

		TweenLite.selector = window.$ || window.jQuery || function(e) {
			var selector = window.$ || window.jQuery;
			if (selector) {
				TweenLite.selector = selector;
				return selector(e);
			}
			return (typeof(document) === "undefined") ? e : (document.querySelectorAll ? document.querySelectorAll(e) : document.getElementById((e.charAt(0) === "#") ? e.substr(1) : e));
		};

		var _lazyTweens = [],
			_lazyLookup = {},
			_numbersExp = /(?:(-|-=|\+=)?\d*\.?\d*(?:e[\-+]?\d+)?)[0-9]/ig,
			//_nonNumbersExp = /(?:([\-+](?!(\d|=)))|[^\d\-+=e]|(e(?![\-+][\d])))+/ig,
			_setRatio = function(v) {
				var pt = this._firstPT,
					min = 0.000001,
					val;
				while (pt) {
					val = !pt.blob ? pt.c * v + pt.s : v ? this.join("") : this.start;
					if (pt.r) {
						val = Math.round(val);
					} else if (val < min) if (val > -min) { //prevents issues with converting very small numbers to strings in the browser
						val = 0;
					}
					if (!pt.f) {
						pt.t[pt.p] = val;
					} else if (pt.fp) {
						pt.t[pt.p](pt.fp, val);
					} else {
						pt.t[pt.p](val);
					}
					pt = pt._next;
				}
			},
			//compares two strings (start/end), finds the numbers that are different and spits back an array representing the whole value but with the changing values isolated as elements. For example, "rgb(0,0,0)" and "rgb(100,50,0)" would become ["rgb(", 0, ",", 50, ",0)"]. Notice it merges the parts that are identical (performance optimization). The array also has a linked list of PropTweens attached starting with _firstPT that contain the tweening data (t, p, s, c, f, etc.). It also stores the starting value as a "start" property so that we can revert to it if/when necessary, like when a tween rewinds fully. If the quantity of numbers differs between the start and end, it will always prioritize the end value(s). The pt parameter is optional - it's for a PropTween that will be appended to the end of the linked list and is typically for actually setting the value after all of the elements have been updated (with array.join("")).
			_blobDif = function(start, end, filter, pt) {
				var a = [start, end],
					charIndex = 0,
					s = "",
					color = 0,
					startNums, endNums, num, i, l, nonNumbers, currentNum;
				a.start = start;
				if (filter) {
					filter(a); //pass an array with the starting and ending values and let the filter do whatever it needs to the values.
					start = a[0];
					end = a[1];
				}
				a.length = 0;
				startNums = start.match(_numbersExp) || [];
				endNums = end.match(_numbersExp) || [];
				if (pt) {
					pt._next = null;
					pt.blob = 1;
					a._firstPT = pt; //apply last in the linked list (which means inserting it first)
				}
				l = endNums.length;
				for (i = 0; i < l; i++) {
					currentNum = endNums[i];
					nonNumbers = end.substr(charIndex, end.indexOf(currentNum, charIndex)-charIndex);
					s += (nonNumbers || !i) ? nonNumbers : ","; //note: SVG spec allows omission of comma/space when a negative sign is wedged between two numbers, like 2.5-5.3 instead of 2.5,-5.3 but when tweening, the negative value may switch to positive, so we insert the comma just in case.
					charIndex += nonNumbers.length;
					if (color) { //sense rgba() values and round them.
						color = (color + 1) % 5;
					} else if (nonNumbers.substr(-5) === "rgba(") {
						color = 1;
					}
					if (currentNum === startNums[i] || startNums.length <= i) {
						s += currentNum;
					} else {
						if (s) {
							a.push(s);
							s = "";
						}
						num = parseFloat(startNums[i]);
						a.push(num);
						a._firstPT = {_next: a._firstPT, t:a, p: a.length-1, s:num, c:((currentNum.charAt(1) === "=") ? parseInt(currentNum.charAt(0) + "1", 10) * parseFloat(currentNum.substr(2)) : (parseFloat(currentNum) - num)) || 0, f:0, r:(color && color < 4)};
						//note: we don't set _prev because we'll never need to remove individual PropTweens from this list.
					}
					charIndex += currentNum.length;
				}
				s += end.substr(charIndex);
				if (s) {
					a.push(s);
				}
				a.setRatio = _setRatio;
				return a;
			},
			//note: "funcParam" is only necessary for function-based getters/setters that require an extra parameter like getAttribute("width") and setAttribute("width", value). In this example, funcParam would be "width". Used by AttrPlugin for example.
			_addPropTween = function(target, prop, start, end, overwriteProp, round, funcParam, stringFilter) {
				var s = (start === "get") ? target[prop] : start,
					type = typeof(target[prop]),
					isRelative = (typeof(end) === "string" && end.charAt(1) === "="),
					pt = {t:target, p:prop, s:s, f:(type === "function"), pg:0, n:overwriteProp || prop, r:round, pr:0, c:isRelative ? parseInt(end.charAt(0) + "1", 10) * parseFloat(end.substr(2)) : (parseFloat(end) - s) || 0},
					blob, getterName;
				if (type !== "number") {
					if (type === "function" && start === "get") {
						getterName = ((prop.indexOf("set") || typeof(target["get" + prop.substr(3)]) !== "function") ? prop : "get" + prop.substr(3));
						pt.s = s = funcParam ? target[getterName](funcParam) : target[getterName]();
					}
					if (typeof(s) === "string" && (funcParam || isNaN(s))) {
						//a blob (string that has multiple numbers in it)
						pt.fp = funcParam;
						blob = _blobDif(s, end, stringFilter || TweenLite.defaultStringFilter, pt);
						pt = {t:blob, p:"setRatio", s:0, c:1, f:2, pg:0, n:overwriteProp || prop, pr:0}; //"2" indicates it's a Blob property tween. Needed for RoundPropsPlugin for example.
					} else if (!isRelative) {
						pt.s = parseFloat(s);
						pt.c = (parseFloat(end) - pt.s) || 0;
					}
				}
				if (pt.c) { //only add it to the linked list if there's a change.
					if ((pt._next = this._firstPT)) {
						pt._next._prev = pt;
					}
					this._firstPT = pt;
					return pt;
				}
			},
			_internals = TweenLite._internals = {isArray:_isArray, isSelector:_isSelector, lazyTweens:_lazyTweens, blobDif:_blobDif}, //gives us a way to expose certain private values to other GreenSock classes without contaminating tha main TweenLite object.
			_plugins = TweenLite._plugins = {},
			_tweenLookup = _internals.tweenLookup = {},
			_tweenLookupNum = 0,
			_reservedProps = _internals.reservedProps = {ease:1, delay:1, overwrite:1, onComplete:1, onCompleteParams:1, onCompleteScope:1, useFrames:1, runBackwards:1, startAt:1, onUpdate:1, onUpdateParams:1, onUpdateScope:1, onStart:1, onStartParams:1, onStartScope:1, onReverseComplete:1, onReverseCompleteParams:1, onReverseCompleteScope:1, onRepeat:1, onRepeatParams:1, onRepeatScope:1, easeParams:1, yoyo:1, immediateRender:1, repeat:1, repeatDelay:1, data:1, paused:1, reversed:1, autoCSS:1, lazy:1, onOverwrite:1, callbackScope:1, stringFilter:1},
			_overwriteLookup = {none:0, all:1, auto:2, concurrent:3, allOnStart:4, preexisting:5, "true":1, "false":0},
			_rootFramesTimeline = Animation._rootFramesTimeline = new SimpleTimeline(),
			_rootTimeline = Animation._rootTimeline = new SimpleTimeline(),
			_nextGCFrame = 30,
			_lazyRender = _internals.lazyRender = function() {
				var i = _lazyTweens.length,
					tween;
				_lazyLookup = {};
				while (--i > -1) {
					tween = _lazyTweens[i];
					if (tween && tween._lazy !== false) {
						tween.render(tween._lazy[0], tween._lazy[1], true);
						tween._lazy = false;
					}
				}
				_lazyTweens.length = 0;
			};

		_rootTimeline._startTime = _ticker.time;
		_rootFramesTimeline._startTime = _ticker.frame;
		_rootTimeline._active = _rootFramesTimeline._active = true;
		setTimeout(_lazyRender, 1); //on some mobile devices, there isn't a "tick" before code runs which means any lazy renders wouldn't run before the next official "tick".

		Animation._updateRoot = TweenLite.render = function() {
				var i, a, p;
				if (_lazyTweens.length) { //if code is run outside of the requestAnimationFrame loop, there may be tweens queued AFTER the engine refreshed, so we need to ensure any pending renders occur before we refresh again.
					_lazyRender();
				}
				_rootTimeline.render((_ticker.time - _rootTimeline._startTime) * _rootTimeline._timeScale, false, false);
				_rootFramesTimeline.render((_ticker.frame - _rootFramesTimeline._startTime) * _rootFramesTimeline._timeScale, false, false);
				if (_lazyTweens.length) {
					_lazyRender();
				}
				if (_ticker.frame >= _nextGCFrame) { //dump garbage every 120 frames or whatever the user sets TweenLite.autoSleep to
					_nextGCFrame = _ticker.frame + (parseInt(TweenLite.autoSleep, 10) || 120);
					for (p in _tweenLookup) {
						a = _tweenLookup[p].tweens;
						i = a.length;
						while (--i > -1) {
							if (a[i]._gc) {
								a.splice(i, 1);
							}
						}
						if (a.length === 0) {
							delete _tweenLookup[p];
						}
					}
					//if there are no more tweens in the root timelines, or if they're all paused, make the _timer sleep to reduce load on the CPU slightly
					p = _rootTimeline._first;
					if (!p || p._paused) if (TweenLite.autoSleep && !_rootFramesTimeline._first && _ticker._listeners.tick.length === 1) {
						while (p && p._paused) {
							p = p._next;
						}
						if (!p) {
							_ticker.sleep();
						}
					}
				}
			};

		_ticker.addEventListener("tick", Animation._updateRoot);

		var _register = function(target, tween, scrub) {
				var id = target._gsTweenID, a, i;
				if (!_tweenLookup[id || (target._gsTweenID = id = "t" + (_tweenLookupNum++))]) {
					_tweenLookup[id] = {target:target, tweens:[]};
				}
				if (tween) {
					a = _tweenLookup[id].tweens;
					a[(i = a.length)] = tween;
					if (scrub) {
						while (--i > -1) {
							if (a[i] === tween) {
								a.splice(i, 1);
							}
						}
					}
				}
				return _tweenLookup[id].tweens;
			},
			_onOverwrite = function(overwrittenTween, overwritingTween, target, killedProps) {
				var func = overwrittenTween.vars.onOverwrite, r1, r2;
				if (func) {
					r1 = func(overwrittenTween, overwritingTween, target, killedProps);
				}
				func = TweenLite.onOverwrite;
				if (func) {
					r2 = func(overwrittenTween, overwritingTween, target, killedProps);
				}
				return (r1 !== false && r2 !== false);
			},
			_applyOverwrite = function(target, tween, props, mode, siblings) {
				var i, changed, curTween, l;
				if (mode === 1 || mode >= 4) {
					l = siblings.length;
					for (i = 0; i < l; i++) {
						if ((curTween = siblings[i]) !== tween) {
							if (!curTween._gc) {
								if (curTween._kill(null, target, tween)) {
									changed = true;
								}
							}
						} else if (mode === 5) {
							break;
						}
					}
					return changed;
				}
				//NOTE: Add 0.0000000001 to overcome floating point errors that can cause the startTime to be VERY slightly off (when a tween's time() is set for example)
				var startTime = tween._startTime + _tinyNum,
					overlaps = [],
					oCount = 0,
					zeroDur = (tween._duration === 0),
					globalStart;
				i = siblings.length;
				while (--i > -1) {
					if ((curTween = siblings[i]) === tween || curTween._gc || curTween._paused) {
						//ignore
					} else if (curTween._timeline !== tween._timeline) {
						globalStart = globalStart || _checkOverlap(tween, 0, zeroDur);
						if (_checkOverlap(curTween, globalStart, zeroDur) === 0) {
							overlaps[oCount++] = curTween;
						}
					} else if (curTween._startTime <= startTime) if (curTween._startTime + curTween.totalDuration() / curTween._timeScale > startTime) if (!((zeroDur || !curTween._initted) && startTime - curTween._startTime <= 0.0000000002)) {
						overlaps[oCount++] = curTween;
					}
				}

				i = oCount;
				while (--i > -1) {
					curTween = overlaps[i];
					if (mode === 2) if (curTween._kill(props, target, tween)) {
						changed = true;
					}
					if (mode !== 2 || (!curTween._firstPT && curTween._initted)) {
						if (mode !== 2 && !_onOverwrite(curTween, tween)) {
							continue;
						}
						if (curTween._enabled(false, false)) { //if all property tweens have been overwritten, kill the tween.
							changed = true;
						}
					}
				}
				return changed;
			},
			_checkOverlap = function(tween, reference, zeroDur) {
				var tl = tween._timeline,
					ts = tl._timeScale,
					t = tween._startTime;
				while (tl._timeline) {
					t += tl._startTime;
					ts *= tl._timeScale;
					if (tl._paused) {
						return -100;
					}
					tl = tl._timeline;
				}
				t /= ts;
				return (t > reference) ? t - reference : ((zeroDur && t === reference) || (!tween._initted && t - reference < 2 * _tinyNum)) ? _tinyNum : ((t += tween.totalDuration() / tween._timeScale / ts) > reference + _tinyNum) ? 0 : t - reference - _tinyNum;
			};


//---- TweenLite instance methods -----------------------------------------------------------------------------

		p._init = function() {
			var v = this.vars,
				op = this._overwrittenProps,
				dur = this._duration,
				immediate = !!v.immediateRender,
				ease = v.ease,
				i, initPlugins, pt, p, startVars;
			if (v.startAt) {
				if (this._startAt) {
					this._startAt.render(-1, true); //if we've run a startAt previously (when the tween instantiated), we should revert it so that the values re-instantiate correctly particularly for relative tweens. Without this, a TweenLite.fromTo(obj, 1, {x:"+=100"}, {x:"-=100"}), for example, would actually jump to +=200 because the startAt would run twice, doubling the relative change.
					this._startAt.kill();
				}
				startVars = {};
				for (p in v.startAt) { //copy the properties/values into a new object to avoid collisions, like var to = {x:0}, from = {x:500}; timeline.fromTo(e, 1, from, to).fromTo(e, 1, to, from);
					startVars[p] = v.startAt[p];
				}
				startVars.overwrite = false;
				startVars.immediateRender = true;
				startVars.lazy = (immediate && v.lazy !== false);
				startVars.startAt = startVars.delay = null; //no nesting of startAt objects allowed (otherwise it could cause an infinite loop).
				this._startAt = TweenLite.to(this.target, 0, startVars);
				if (immediate) {
					if (this._time > 0) {
						this._startAt = null; //tweens that render immediately (like most from() and fromTo() tweens) shouldn't revert when their parent timeline's playhead goes backward past the startTime because the initial render could have happened anytime and it shouldn't be directly correlated to this tween's startTime. Imagine setting up a complex animation where the beginning states of various objects are rendered immediately but the tween doesn't happen for quite some time - if we revert to the starting values as soon as the playhead goes backward past the tween's startTime, it will throw things off visually. Reversion should only happen in TimelineLite/Max instances where immediateRender was false (which is the default in the convenience methods like from()).
					} else if (dur !== 0) {
						return; //we skip initialization here so that overwriting doesn't occur until the tween actually begins. Otherwise, if you create several immediateRender:true tweens of the same target/properties to drop into a TimelineLite or TimelineMax, the last one created would overwrite the first ones because they didn't get placed into the timeline yet before the first render occurs and kicks in overwriting.
					}
				}
			} else if (v.runBackwards && dur !== 0) {
				//from() tweens must be handled uniquely: their beginning values must be rendered but we don't want overwriting to occur yet (when time is still 0). Wait until the tween actually begins before doing all the routines like overwriting. At that time, we should render at the END of the tween to ensure that things initialize correctly (remember, from() tweens go backwards)
				if (this._startAt) {
					this._startAt.render(-1, true);
					this._startAt.kill();
					this._startAt = null;
				} else {
					if (this._time !== 0) { //in rare cases (like if a from() tween runs and then is invalidate()-ed), immediateRender could be true but the initial forced-render gets skipped, so there's no need to force the render in this context when the _time is greater than 0
						immediate = false;
					}
					pt = {};
					for (p in v) { //copy props into a new object and skip any reserved props, otherwise onComplete or onUpdate or onStart could fire. We should, however, permit autoCSS to go through.
						if (!_reservedProps[p] || p === "autoCSS") {
							pt[p] = v[p];
						}
					}
					pt.overwrite = 0;
					pt.data = "isFromStart"; //we tag the tween with as "isFromStart" so that if [inside a plugin] we need to only do something at the very END of a tween, we have a way of identifying this tween as merely the one that's setting the beginning values for a "from()" tween. For example, clearProps in CSSPlugin should only get applied at the very END of a tween and without this tag, from(...{height:100, clearProps:"height", delay:1}) would wipe the height at the beginning of the tween and after 1 second, it'd kick back in.
					pt.lazy = (immediate && v.lazy !== false);
					pt.immediateRender = immediate; //zero-duration tweens render immediately by default, but if we're not specifically instructed to render this tween immediately, we should skip this and merely _init() to record the starting values (rendering them immediately would push them to completion which is wasteful in that case - we'd have to render(-1) immediately after)
					this._startAt = TweenLite.to(this.target, 0, pt);
					if (!immediate) {
						this._startAt._init(); //ensures that the initial values are recorded
						this._startAt._enabled(false); //no need to have the tween render on the next cycle. Disable it because we'll always manually control the renders of the _startAt tween.
						if (this.vars.immediateRender) {
							this._startAt = null;
						}
					} else if (this._time === 0) {
						return;
					}
				}
			}
			this._ease = ease = (!ease) ? TweenLite.defaultEase : (ease instanceof Ease) ? ease : (typeof(ease) === "function") ? new Ease(ease, v.easeParams) : _easeMap[ease] || TweenLite.defaultEase;
			if (v.easeParams instanceof Array && ease.config) {
				this._ease = ease.config.apply(ease, v.easeParams);
			}
			this._easeType = this._ease._type;
			this._easePower = this._ease._power;
			this._firstPT = null;

			if (this._targets) {
				i = this._targets.length;
				while (--i > -1) {
					if ( this._initProps( this._targets[i], (this._propLookup[i] = {}), this._siblings[i], (op ? op[i] : null)) ) {
						initPlugins = true;
					}
				}
			} else {
				initPlugins = this._initProps(this.target, this._propLookup, this._siblings, op);
			}

			if (initPlugins) {
				TweenLite._onPluginEvent("_onInitAllProps", this); //reorders the array in order of priority. Uses a static TweenPlugin method in order to minimize file size in TweenLite
			}
			if (op) if (!this._firstPT) if (typeof(this.target) !== "function") { //if all tweening properties have been overwritten, kill the tween. If the target is a function, it's probably a delayedCall so let it live.
				this._enabled(false, false);
			}
			if (v.runBackwards) {
				pt = this._firstPT;
				while (pt) {
					pt.s += pt.c;
					pt.c = -pt.c;
					pt = pt._next;
				}
			}
			this._onUpdate = v.onUpdate;
			this._initted = true;
		};

		p._initProps = function(target, propLookup, siblings, overwrittenProps) {
			var p, i, initPlugins, plugin, pt, v;
			if (target == null) {
				return false;
			}

			if (_lazyLookup[target._gsTweenID]) {
				_lazyRender(); //if other tweens of the same target have recently initted but haven't rendered yet, we've got to force the render so that the starting values are correct (imagine populating a timeline with a bunch of sequential tweens and then jumping to the end)
			}

			if (!this.vars.css) if (target.style) if (target !== window && target.nodeType) if (_plugins.css) if (this.vars.autoCSS !== false) { //it's so common to use TweenLite/Max to animate the css of DOM elements, we assume that if the target is a DOM element, that's what is intended (a convenience so that users don't have to wrap things in css:{}, although we still recommend it for a slight performance boost and better specificity). Note: we cannot check "nodeType" on the window inside an iframe.
				_autoCSS(this.vars, target);
			}
			for (p in this.vars) {
				v = this.vars[p];
				if (_reservedProps[p]) {
					if (v) if ((v instanceof Array) || (v.push && _isArray(v))) if (v.join("").indexOf("{self}") !== -1) {
						this.vars[p] = v = this._swapSelfInParams(v, this);
					}

				} else if (_plugins[p] && (plugin = new _plugins[p]())._onInitTween(target, this.vars[p], this)) {

					//t - target 		[object]
					//p - property 		[string]
					//s - start			[number]
					//c - change		[number]
					//f - isFunction	[boolean]
					//n - name			[string]
					//pg - isPlugin 	[boolean]
					//pr - priority		[number]
					this._firstPT = pt = {_next:this._firstPT, t:plugin, p:"setRatio", s:0, c:1, f:1, n:p, pg:1, pr:plugin._priority};
					i = plugin._overwriteProps.length;
					while (--i > -1) {
						propLookup[plugin._overwriteProps[i]] = this._firstPT;
					}
					if (plugin._priority || plugin._onInitAllProps) {
						initPlugins = true;
					}
					if (plugin._onDisable || plugin._onEnable) {
						this._notifyPluginsOfEnabled = true;
					}
					if (pt._next) {
						pt._next._prev = pt;
					}

				} else {
					propLookup[p] = _addPropTween.call(this, target, p, "get", v, p, 0, null, this.vars.stringFilter);
				}
			}

			if (overwrittenProps) if (this._kill(overwrittenProps, target)) { //another tween may have tried to overwrite properties of this tween before init() was called (like if two tweens start at the same time, the one created second will run first)
				return this._initProps(target, propLookup, siblings, overwrittenProps);
			}
			if (this._overwrite > 1) if (this._firstPT) if (siblings.length > 1) if (_applyOverwrite(target, this, propLookup, this._overwrite, siblings)) {
				this._kill(propLookup, target);
				return this._initProps(target, propLookup, siblings, overwrittenProps);
			}
			if (this._firstPT) if ((this.vars.lazy !== false && this._duration) || (this.vars.lazy && !this._duration)) { //zero duration tweens don't lazy render by default; everything else does.
				_lazyLookup[target._gsTweenID] = true;
			}
			return initPlugins;
		};

		p.render = function(time, suppressEvents, force) {
			var prevTime = this._time,
				duration = this._duration,
				prevRawPrevTime = this._rawPrevTime,
				isComplete, callback, pt, rawPrevTime;
			if (time >= duration - 0.0000001) { //to work around occasional floating point math artifacts.
				this._totalTime = this._time = duration;
				this.ratio = this._ease._calcEnd ? this._ease.getRatio(1) : 1;
				if (!this._reversed ) {
					isComplete = true;
					callback = "onComplete";
					force = (force || this._timeline.autoRemoveChildren); //otherwise, if the animation is unpaused/activated after it's already finished, it doesn't get removed from the parent timeline.
				}
				if (duration === 0) if (this._initted || !this.vars.lazy || force) { //zero-duration tweens are tricky because we must discern the momentum/direction of time in order to determine whether the starting values should be rendered or the ending values. If the "playhead" of its timeline goes past the zero-duration tween in the forward direction or lands directly on it, the end values should be rendered, but if the timeline's "playhead" moves past it in the backward direction (from a postitive time to a negative time), the starting values must be rendered.
					if (this._startTime === this._timeline._duration) { //if a zero-duration tween is at the VERY end of a timeline and that timeline renders at its end, it will typically add a tiny bit of cushion to the render time to prevent rounding errors from getting in the way of tweens rendering their VERY end. If we then reverse() that timeline, the zero-duration tween will trigger its onReverseComplete even though technically the playhead didn't pass over it again. It's a very specific edge case we must accommodate.
						time = 0;
					}
					if (prevRawPrevTime < 0 || (time <= 0 && time >= -0.0000001) || (prevRawPrevTime === _tinyNum && this.data !== "isPause")) if (prevRawPrevTime !== time) { //note: when this.data is "isPause", it's a callback added by addPause() on a timeline that we should not be triggered when LEAVING its exact start time. In other words, tl.addPause(1).play(1) shouldn't pause.
						force = true;
						if (prevRawPrevTime > _tinyNum) {
							callback = "onReverseComplete";
						}
					}
					this._rawPrevTime = rawPrevTime = (!suppressEvents || time || prevRawPrevTime === time) ? time : _tinyNum; //when the playhead arrives at EXACTLY time 0 (right on top) of a zero-duration tween, we need to discern if events are suppressed so that when the playhead moves again (next time), it'll trigger the callback. If events are NOT suppressed, obviously the callback would be triggered in this render. Basically, the callback should fire either when the playhead ARRIVES or LEAVES this exact spot, not both. Imagine doing a timeline.seek(0) and there's a callback that sits at 0. Since events are suppressed on that seek() by default, nothing will fire, but when the playhead moves off of that position, the callback should fire. This behavior is what people intuitively expect. We set the _rawPrevTime to be a precise tiny number to indicate this scenario rather than using another property/variable which would increase memory usage. This technique is less readable, but more efficient.
				}

			} else if (time < 0.0000001) { //to work around occasional floating point math artifacts, round super small values to 0.
				this._totalTime = this._time = 0;
				this.ratio = this._ease._calcEnd ? this._ease.getRatio(0) : 0;
				if (prevTime !== 0 || (duration === 0 && prevRawPrevTime > 0)) {
					callback = "onReverseComplete";
					isComplete = this._reversed;
				}
				if (time < 0) {
					this._active = false;
					if (duration === 0) if (this._initted || !this.vars.lazy || force) { //zero-duration tweens are tricky because we must discern the momentum/direction of time in order to determine whether the starting values should be rendered or the ending values. If the "playhead" of its timeline goes past the zero-duration tween in the forward direction or lands directly on it, the end values should be rendered, but if the timeline's "playhead" moves past it in the backward direction (from a postitive time to a negative time), the starting values must be rendered.
						if (prevRawPrevTime >= 0 && !(prevRawPrevTime === _tinyNum && this.data === "isPause")) {
							force = true;
						}
						this._rawPrevTime = rawPrevTime = (!suppressEvents || time || prevRawPrevTime === time) ? time : _tinyNum; //when the playhead arrives at EXACTLY time 0 (right on top) of a zero-duration tween, we need to discern if events are suppressed so that when the playhead moves again (next time), it'll trigger the callback. If events are NOT suppressed, obviously the callback would be triggered in this render. Basically, the callback should fire either when the playhead ARRIVES or LEAVES this exact spot, not both. Imagine doing a timeline.seek(0) and there's a callback that sits at 0. Since events are suppressed on that seek() by default, nothing will fire, but when the playhead moves off of that position, the callback should fire. This behavior is what people intuitively expect. We set the _rawPrevTime to be a precise tiny number to indicate this scenario rather than using another property/variable which would increase memory usage. This technique is less readable, but more efficient.
					}
				}
				if (!this._initted) { //if we render the very beginning (time == 0) of a fromTo(), we must force the render (normal tweens wouldn't need to render at a time of 0 when the prevTime was also 0). This is also mandatory to make sure overwriting kicks in immediately.
					force = true;
				}
			} else {
				this._totalTime = this._time = time;

				if (this._easeType) {
					var r = time / duration, type = this._easeType, pow = this._easePower;
					if (type === 1 || (type === 3 && r >= 0.5)) {
						r = 1 - r;
					}
					if (type === 3) {
						r *= 2;
					}
					if (pow === 1) {
						r *= r;
					} else if (pow === 2) {
						r *= r * r;
					} else if (pow === 3) {
						r *= r * r * r;
					} else if (pow === 4) {
						r *= r * r * r * r;
					}

					if (type === 1) {
						this.ratio = 1 - r;
					} else if (type === 2) {
						this.ratio = r;
					} else if (time / duration < 0.5) {
						this.ratio = r / 2;
					} else {
						this.ratio = 1 - (r / 2);
					}

				} else {
					this.ratio = this._ease.getRatio(time / duration);
				}
			}

			if (this._time === prevTime && !force) {
				return;
			} else if (!this._initted) {
				this._init();
				if (!this._initted || this._gc) { //immediateRender tweens typically won't initialize until the playhead advances (_time is greater than 0) in order to ensure that overwriting occurs properly. Also, if all of the tweening properties have been overwritten (which would cause _gc to be true, as set in _init()), we shouldn't continue otherwise an onStart callback could be called for example.
					return;
				} else if (!force && this._firstPT && ((this.vars.lazy !== false && this._duration) || (this.vars.lazy && !this._duration))) {
					this._time = this._totalTime = prevTime;
					this._rawPrevTime = prevRawPrevTime;
					_lazyTweens.push(this);
					this._lazy = [time, suppressEvents];
					return;
				}
				//_ease is initially set to defaultEase, so now that init() has run, _ease is set properly and we need to recalculate the ratio. Overall this is faster than using conditional logic earlier in the method to avoid having to set ratio twice because we only init() once but renderTime() gets called VERY frequently.
				if (this._time && !isComplete) {
					this.ratio = this._ease.getRatio(this._time / duration);
				} else if (isComplete && this._ease._calcEnd) {
					this.ratio = this._ease.getRatio((this._time === 0) ? 0 : 1);
				}
			}
			if (this._lazy !== false) { //in case a lazy render is pending, we should flush it because the new render is occurring now (imagine a lazy tween instantiating and then immediately the user calls tween.seek(tween.duration()), skipping to the end - the end render would be forced, and then if we didn't flush the lazy render, it'd fire AFTER the seek(), rendering it at the wrong time.
				this._lazy = false;
			}
			if (!this._active) if (!this._paused && this._time !== prevTime && time >= 0) {
				this._active = true;  //so that if the user renders a tween (as opposed to the timeline rendering it), the timeline is forced to re-render and align it with the proper time/frame on the next rendering cycle. Maybe the tween already finished but the user manually re-renders it as halfway done.
			}
			if (prevTime === 0) {
				if (this._startAt) {
					if (time >= 0) {
						this._startAt.render(time, suppressEvents, force);
					} else if (!callback) {
						callback = "_dummyGS"; //if no callback is defined, use a dummy value just so that the condition at the end evaluates as true because _startAt should render AFTER the normal render loop when the time is negative. We could handle this in a more intuitive way, of course, but the render loop is the MOST important thing to optimize, so this technique allows us to avoid adding extra conditional logic in a high-frequency area.
					}
				}
				if (this.vars.onStart) if (this._time !== 0 || duration === 0) if (!suppressEvents) {
					this._callback("onStart");
				}
			}
			pt = this._firstPT;
			while (pt) {
				if (pt.f) {
					pt.t[pt.p](pt.c * this.ratio + pt.s);
				} else {
					pt.t[pt.p] = pt.c * this.ratio + pt.s;
				}
				pt = pt._next;
			}

			if (this._onUpdate) {
				if (time < 0) if (this._startAt && time !== -0.0001) { //if the tween is positioned at the VERY beginning (_startTime 0) of its parent timeline, it's illegal for the playhead to go back further, so we should not render the recorded startAt values.
					this._startAt.render(time, suppressEvents, force); //note: for performance reasons, we tuck this conditional logic inside less traveled areas (most tweens don't have an onUpdate). We'd just have it at the end before the onComplete, but the values should be updated before any onUpdate is called, so we ALSO put it here and then if it's not called, we do so later near the onComplete.
				}
				if (!suppressEvents) if (this._time !== prevTime || isComplete) {
					this._callback("onUpdate");
				}
			}
			if (callback) if (!this._gc || force) { //check _gc because there's a chance that kill() could be called in an onUpdate
				if (time < 0 && this._startAt && !this._onUpdate && time !== -0.0001) { //-0.0001 is a special value that we use when looping back to the beginning of a repeated TimelineMax, in which case we shouldn't render the _startAt values.
					this._startAt.render(time, suppressEvents, force);
				}
				if (isComplete) {
					if (this._timeline.autoRemoveChildren) {
						this._enabled(false, false);
					}
					this._active = false;
				}
				if (!suppressEvents && this.vars[callback]) {
					this._callback(callback);
				}
				if (duration === 0 && this._rawPrevTime === _tinyNum && rawPrevTime !== _tinyNum) { //the onComplete or onReverseComplete could trigger movement of the playhead and for zero-duration tweens (which must discern direction) that land directly back on their start time, we don't want to fire again on the next render. Think of several addPause()'s in a timeline that forces the playhead to a certain spot, but what if it's already paused and another tween is tweening the "time" of the timeline? Each time it moves [forward] past that spot, it would move back, and since suppressEvents is true, it'd reset _rawPrevTime to _tinyNum so that when it begins again, the callback would fire (so ultimately it could bounce back and forth during that tween). Again, this is a very uncommon scenario, but possible nonetheless.
					this._rawPrevTime = 0;
				}
			}
		};

		p._kill = function(vars, target, overwritingTween) {
			if (vars === "all") {
				vars = null;
			}
			if (vars == null) if (target == null || target === this.target) {
				this._lazy = false;
				return this._enabled(false, false);
			}
			target = (typeof(target) !== "string") ? (target || this._targets || this.target) : TweenLite.selector(target) || target;
			var simultaneousOverwrite = (overwritingTween && this._time && overwritingTween._startTime === this._startTime && this._timeline === overwritingTween._timeline),
				i, overwrittenProps, p, pt, propLookup, changed, killProps, record, killed;
			if ((_isArray(target) || _isSelector(target)) && typeof(target[0]) !== "number") {
				i = target.length;
				while (--i > -1) {
					if (this._kill(vars, target[i], overwritingTween)) {
						changed = true;
					}
				}
			} else {
				if (this._targets) {
					i = this._targets.length;
					while (--i > -1) {
						if (target === this._targets[i]) {
							propLookup = this._propLookup[i] || {};
							this._overwrittenProps = this._overwrittenProps || [];
							overwrittenProps = this._overwrittenProps[i] = vars ? this._overwrittenProps[i] || {} : "all";
							break;
						}
					}
				} else if (target !== this.target) {
					return false;
				} else {
					propLookup = this._propLookup;
					overwrittenProps = this._overwrittenProps = vars ? this._overwrittenProps || {} : "all";
				}

				if (propLookup) {
					killProps = vars || propLookup;
					record = (vars !== overwrittenProps && overwrittenProps !== "all" && vars !== propLookup && (typeof(vars) !== "object" || !vars._tempKill)); //_tempKill is a super-secret way to delete a particular tweening property but NOT have it remembered as an official overwritten property (like in BezierPlugin)
					if (overwritingTween && (TweenLite.onOverwrite || this.vars.onOverwrite)) {
						for (p in killProps) {
							if (propLookup[p]) {
								if (!killed) {
									killed = [];
								}
								killed.push(p);
							}
						}
						if ((killed || !vars) && !_onOverwrite(this, overwritingTween, target, killed)) { //if the onOverwrite returned false, that means the user wants to override the overwriting (cancel it).
							return false;
						}
					}

					for (p in killProps) {
						if ((pt = propLookup[p])) {
							if (simultaneousOverwrite) { //if another tween overwrites this one and they both start at exactly the same time, yet this tween has already rendered once (for example, at 0.001) because it's first in the queue, we should revert the values to where they were at 0 so that the starting values aren't contaminated on the overwriting tween.
								if (pt.f) {
									pt.t[pt.p](pt.s);
								} else {
									pt.t[pt.p] = pt.s;
								}
								changed = true;
							}
							if (pt.pg && pt.t._kill(killProps)) {
								changed = true; //some plugins need to be notified so they can perform cleanup tasks first
							}
							if (!pt.pg || pt.t._overwriteProps.length === 0) {
								if (pt._prev) {
									pt._prev._next = pt._next;
								} else if (pt === this._firstPT) {
									this._firstPT = pt._next;
								}
								if (pt._next) {
									pt._next._prev = pt._prev;
								}
								pt._next = pt._prev = null;
							}
							delete propLookup[p];
						}
						if (record) {
							overwrittenProps[p] = 1;
						}
					}
					if (!this._firstPT && this._initted) { //if all tweening properties are killed, kill the tween. Without this line, if there's a tween with multiple targets and then you killTweensOf() each target individually, the tween would technically still remain active and fire its onComplete even though there aren't any more properties tweening.
						this._enabled(false, false);
					}
				}
			}
			return changed;
		};

		p.invalidate = function() {
			if (this._notifyPluginsOfEnabled) {
				TweenLite._onPluginEvent("_onDisable", this);
			}
			this._firstPT = this._overwrittenProps = this._startAt = this._onUpdate = null;
			this._notifyPluginsOfEnabled = this._active = this._lazy = false;
			this._propLookup = (this._targets) ? {} : [];
			Animation.prototype.invalidate.call(this);
			if (this.vars.immediateRender) {
				this._time = -_tinyNum; //forces a render without having to set the render() "force" parameter to true because we want to allow lazying by default (using the "force" parameter always forces an immediate full render)
				this.render(-this._delay);
			}
			return this;
		};

		p._enabled = function(enabled, ignoreTimeline) {
			if (!_tickerActive) {
				_ticker.wake();
			}
			if (enabled && this._gc) {
				var targets = this._targets,
					i;
				if (targets) {
					i = targets.length;
					while (--i > -1) {
						this._siblings[i] = _register(targets[i], this, true);
					}
				} else {
					this._siblings = _register(this.target, this, true);
				}
			}
			Animation.prototype._enabled.call(this, enabled, ignoreTimeline);
			if (this._notifyPluginsOfEnabled) if (this._firstPT) {
				return TweenLite._onPluginEvent((enabled ? "_onEnable" : "_onDisable"), this);
			}
			return false;
		};


//----TweenLite static methods -----------------------------------------------------

		TweenLite.to = function(target, duration, vars) {
			return new TweenLite(target, duration, vars);
		};

		TweenLite.from = function(target, duration, vars) {
			vars.runBackwards = true;
			vars.immediateRender = (vars.immediateRender != false);
			return new TweenLite(target, duration, vars);
		};

		TweenLite.fromTo = function(target, duration, fromVars, toVars) {
			toVars.startAt = fromVars;
			toVars.immediateRender = (toVars.immediateRender != false && fromVars.immediateRender != false);
			return new TweenLite(target, duration, toVars);
		};

		TweenLite.delayedCall = function(delay, callback, params, scope, useFrames) {
			return new TweenLite(callback, 0, {delay:delay, onComplete:callback, onCompleteParams:params, callbackScope:scope, onReverseComplete:callback, onReverseCompleteParams:params, immediateRender:false, lazy:false, useFrames:useFrames, overwrite:0});
		};

		TweenLite.set = function(target, vars) {
			return new TweenLite(target, 0, vars);
		};

		TweenLite.getTweensOf = function(target, onlyActive) {
			if (target == null) { return []; }
			target = (typeof(target) !== "string") ? target : TweenLite.selector(target) || target;
			var i, a, j, t;
			if ((_isArray(target) || _isSelector(target)) && typeof(target[0]) !== "number") {
				i = target.length;
				a = [];
				while (--i > -1) {
					a = a.concat(TweenLite.getTweensOf(target[i], onlyActive));
				}
				i = a.length;
				//now get rid of any duplicates (tweens of arrays of objects could cause duplicates)
				while (--i > -1) {
					t = a[i];
					j = i;
					while (--j > -1) {
						if (t === a[j]) {
							a.splice(i, 1);
						}
					}
				}
			} else {
				a = _register(target).concat();
				i = a.length;
				while (--i > -1) {
					if (a[i]._gc || (onlyActive && !a[i].isActive())) {
						a.splice(i, 1);
					}
				}
			}
			return a;
		};

		TweenLite.killTweensOf = TweenLite.killDelayedCallsTo = function(target, onlyActive, vars) {
			if (typeof(onlyActive) === "object") {
				vars = onlyActive; //for backwards compatibility (before "onlyActive" parameter was inserted)
				onlyActive = false;
			}
			var a = TweenLite.getTweensOf(target, onlyActive),
				i = a.length;
			while (--i > -1) {
				a[i]._kill(vars, target);
			}
		};



/*
 * ----------------------------------------------------------------
 * TweenPlugin   (could easily be split out as a separate file/class, but included for ease of use (so that people don't need to include another script call before loading plugins which is easy to forget)
 * ----------------------------------------------------------------
 */
		var TweenPlugin = _class("plugins.TweenPlugin", function(props, priority) {
					this._overwriteProps = (props || "").split(",");
					this._propName = this._overwriteProps[0];
					this._priority = priority || 0;
					this._super = TweenPlugin.prototype;
				}, true);

		p = TweenPlugin.prototype;
		TweenPlugin.version = "1.18.0";
		TweenPlugin.API = 2;
		p._firstPT = null;
		p._addTween = _addPropTween;
		p.setRatio = _setRatio;

		p._kill = function(lookup) {
			var a = this._overwriteProps,
				pt = this._firstPT,
				i;
			if (lookup[this._propName] != null) {
				this._overwriteProps = [];
			} else {
				i = a.length;
				while (--i > -1) {
					if (lookup[a[i]] != null) {
						a.splice(i, 1);
					}
				}
			}
			while (pt) {
				if (lookup[pt.n] != null) {
					if (pt._next) {
						pt._next._prev = pt._prev;
					}
					if (pt._prev) {
						pt._prev._next = pt._next;
						pt._prev = null;
					} else if (this._firstPT === pt) {
						this._firstPT = pt._next;
					}
				}
				pt = pt._next;
			}
			return false;
		};

		p._roundProps = function(lookup, value) {
			var pt = this._firstPT;
			while (pt) {
				if (lookup[this._propName] || (pt.n != null && lookup[ pt.n.split(this._propName + "_").join("") ])) { //some properties that are very plugin-specific add a prefix named after the _propName plus an underscore, so we need to ignore that extra stuff here.
					pt.r = value;
				}
				pt = pt._next;
			}
		};

		TweenLite._onPluginEvent = function(type, tween) {
			var pt = tween._firstPT,
				changed, pt2, first, last, next;
			if (type === "_onInitAllProps") {
				//sorts the PropTween linked list in order of priority because some plugins need to render earlier/later than others, like MotionBlurPlugin applies its effects after all x/y/alpha tweens have rendered on each frame.
				while (pt) {
					next = pt._next;
					pt2 = first;
					while (pt2 && pt2.pr > pt.pr) {
						pt2 = pt2._next;
					}
					if ((pt._prev = pt2 ? pt2._prev : last)) {
						pt._prev._next = pt;
					} else {
						first = pt;
					}
					if ((pt._next = pt2)) {
						pt2._prev = pt;
					} else {
						last = pt;
					}
					pt = next;
				}
				pt = tween._firstPT = first;
			}
			while (pt) {
				if (pt.pg) if (typeof(pt.t[type]) === "function") if (pt.t[type]()) {
					changed = true;
				}
				pt = pt._next;
			}
			return changed;
		};

		TweenPlugin.activate = function(plugins) {
			var i = plugins.length;
			while (--i > -1) {
				if (plugins[i].API === TweenPlugin.API) {
					_plugins[(new plugins[i]())._propName] = plugins[i];
				}
			}
			return true;
		};

		//provides a more concise way to define plugins that have no dependencies besides TweenPlugin and TweenLite, wrapping common boilerplate stuff into one function (added in 1.9.0). You don't NEED to use this to define a plugin - the old way still works and can be useful in certain (rare) situations.
		_gsDefine.plugin = function(config) {
			if (!config || !config.propName || !config.init || !config.API) { throw "illegal plugin definition."; }
			var propName = config.propName,
				priority = config.priority || 0,
				overwriteProps = config.overwriteProps,
				map = {init:"_onInitTween", set:"setRatio", kill:"_kill", round:"_roundProps", initAll:"_onInitAllProps"},
				Plugin = _class("plugins." + propName.charAt(0).toUpperCase() + propName.substr(1) + "Plugin",
					function() {
						TweenPlugin.call(this, propName, priority);
						this._overwriteProps = overwriteProps || [];
					}, (config.global === true)),
				p = Plugin.prototype = new TweenPlugin(propName),
				prop;
			p.constructor = Plugin;
			Plugin.API = config.API;
			for (prop in map) {
				if (typeof(config[prop]) === "function") {
					p[map[prop]] = config[prop];
				}
			}
			Plugin.version = config.version;
			TweenPlugin.activate([Plugin]);
			return Plugin;
		};


		//now run through all the dependencies discovered and if any are missing, log that to the console as a warning. This is why it's best to have TweenLite load last - it can check all the dependencies for you.
		a = window._gsQueue;
		if (a) {
			for (i = 0; i < a.length; i++) {
				a[i]();
			}
			for (p in _defLookup) {
				if (!_defLookup[p].func) {
					window.console.log("GSAP encountered missing dependency: com.greensock." + p);
				}
			}
		}

		_tickerActive = false; //ensures that the first official animation forces a ticker.tick() to update the time when it is instantiated

})((typeof(module) !== "undefined" && module.exports && typeof(global) !== "undefined") ? global : this || window, "TweenMax");
}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{}]},{},[])
//# sourceMappingURL=data:application/json;charset:utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJub2RlX21vZHVsZXMvZ3NhcC9zcmMvdW5jb21wcmVzc2VkL1R3ZWVuTWF4LmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOztBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCIvKiFcbiAqIFZFUlNJT046IDEuMTguMlxuICogREFURTogMjAxNS0xMi0yMlxuICogVVBEQVRFUyBBTkQgRE9DUyBBVDogaHR0cDovL2dyZWVuc29jay5jb21cbiAqIFxuICogSW5jbHVkZXMgYWxsIG9mIHRoZSBmb2xsb3dpbmc6IFR3ZWVuTGl0ZSwgVHdlZW5NYXgsIFRpbWVsaW5lTGl0ZSwgVGltZWxpbmVNYXgsIEVhc2VQYWNrLCBDU1NQbHVnaW4sIFJvdW5kUHJvcHNQbHVnaW4sIEJlemllclBsdWdpbiwgQXR0clBsdWdpbiwgRGlyZWN0aW9uYWxSb3RhdGlvblBsdWdpblxuICpcbiAqIEBsaWNlbnNlIENvcHlyaWdodCAoYykgMjAwOC0yMDE2LCBHcmVlblNvY2suIEFsbCByaWdodHMgcmVzZXJ2ZWQuXG4gKiBUaGlzIHdvcmsgaXMgc3ViamVjdCB0byB0aGUgdGVybXMgYXQgaHR0cDovL2dyZWVuc29jay5jb20vc3RhbmRhcmQtbGljZW5zZSBvciBmb3JcbiAqIENsdWIgR3JlZW5Tb2NrIG1lbWJlcnMsIHRoZSBzb2Z0d2FyZSBhZ3JlZW1lbnQgdGhhdCB3YXMgaXNzdWVkIHdpdGggeW91ciBtZW1iZXJzaGlwLlxuICogXG4gKiBAYXV0aG9yOiBKYWNrIERveWxlLCBqYWNrQGdyZWVuc29jay5jb21cbiAqKi9cbnZhciBfZ3NTY29wZSA9ICh0eXBlb2YobW9kdWxlKSAhPT0gXCJ1bmRlZmluZWRcIiAmJiBtb2R1bGUuZXhwb3J0cyAmJiB0eXBlb2YoZ2xvYmFsKSAhPT0gXCJ1bmRlZmluZWRcIikgPyBnbG9iYWwgOiB0aGlzIHx8IHdpbmRvdzsgLy9oZWxwcyBlbnN1cmUgY29tcGF0aWJpbGl0eSB3aXRoIEFNRC9SZXF1aXJlSlMgYW5kIENvbW1vbkpTL05vZGVcbihfZ3NTY29wZS5fZ3NRdWV1ZSB8fCAoX2dzU2NvcGUuX2dzUXVldWUgPSBbXSkpLnB1c2goIGZ1bmN0aW9uKCkge1xuXG5cdFwidXNlIHN0cmljdFwiO1xuXG5cdF9nc1Njb3BlLl9nc0RlZmluZShcIlR3ZWVuTWF4XCIsIFtcImNvcmUuQW5pbWF0aW9uXCIsXCJjb3JlLlNpbXBsZVRpbWVsaW5lXCIsXCJUd2VlbkxpdGVcIl0sIGZ1bmN0aW9uKEFuaW1hdGlvbiwgU2ltcGxlVGltZWxpbmUsIFR3ZWVuTGl0ZSkge1xuXG5cdFx0dmFyIF9zbGljZSA9IGZ1bmN0aW9uKGEpIHsgLy9kb24ndCB1c2UgW10uc2xpY2UgYmVjYXVzZSB0aGF0IGRvZXNuJ3Qgd29yayBpbiBJRTggd2l0aCBhIE5vZGVMaXN0IHRoYXQncyByZXR1cm5lZCBieSBxdWVyeVNlbGVjdG9yQWxsKClcblx0XHRcdFx0dmFyIGIgPSBbXSxcblx0XHRcdFx0XHRsID0gYS5sZW5ndGgsXG5cdFx0XHRcdFx0aTtcblx0XHRcdFx0Zm9yIChpID0gMDsgaSAhPT0gbDsgYi5wdXNoKGFbaSsrXSkpO1xuXHRcdFx0XHRyZXR1cm4gYjtcblx0XHRcdH0sXG5cdFx0XHRfYXBwbHlDeWNsZSA9IGZ1bmN0aW9uKHZhcnMsIHRhcmdldHMsIGkpIHtcblx0XHRcdFx0dmFyIGFsdCA9IHZhcnMuY3ljbGUsXG5cdFx0XHRcdFx0cCwgdmFsO1xuXHRcdFx0XHRmb3IgKHAgaW4gYWx0KSB7XG5cdFx0XHRcdFx0dmFsID0gYWx0W3BdO1xuXHRcdFx0XHRcdHZhcnNbcF0gPSAodHlwZW9mKHZhbCkgPT09IFwiZnVuY3Rpb25cIikgPyB2YWwuY2FsbCh0YXJnZXRzW2ldLCBpKSA6IHZhbFtpICUgdmFsLmxlbmd0aF07XG5cdFx0XHRcdH1cblx0XHRcdFx0ZGVsZXRlIHZhcnMuY3ljbGU7XG5cdFx0XHR9LFxuXHRcdFx0VHdlZW5NYXggPSBmdW5jdGlvbih0YXJnZXQsIGR1cmF0aW9uLCB2YXJzKSB7XG5cdFx0XHRcdFR3ZWVuTGl0ZS5jYWxsKHRoaXMsIHRhcmdldCwgZHVyYXRpb24sIHZhcnMpO1xuXHRcdFx0XHR0aGlzLl9jeWNsZSA9IDA7XG5cdFx0XHRcdHRoaXMuX3lveW8gPSAodGhpcy52YXJzLnlveW8gPT09IHRydWUpO1xuXHRcdFx0XHR0aGlzLl9yZXBlYXQgPSB0aGlzLnZhcnMucmVwZWF0IHx8IDA7XG5cdFx0XHRcdHRoaXMuX3JlcGVhdERlbGF5ID0gdGhpcy52YXJzLnJlcGVhdERlbGF5IHx8IDA7XG5cdFx0XHRcdHRoaXMuX2RpcnR5ID0gdHJ1ZTsgLy9lbnN1cmVzIHRoYXQgaWYgdGhlcmUgaXMgYW55IHJlcGVhdCwgdGhlIHRvdGFsRHVyYXRpb24gd2lsbCBnZXQgcmVjYWxjdWxhdGVkIHRvIGFjY3VyYXRlbHkgcmVwb3J0IGl0LlxuXHRcdFx0XHR0aGlzLnJlbmRlciA9IFR3ZWVuTWF4LnByb3RvdHlwZS5yZW5kZXI7IC8vc3BlZWQgb3B0aW1pemF0aW9uIChhdm9pZCBwcm90b3R5cGUgbG9va3VwIG9uIHRoaXMgXCJob3RcIiBtZXRob2QpXG5cdFx0XHR9LFxuXHRcdFx0X3RpbnlOdW0gPSAwLjAwMDAwMDAwMDEsXG5cdFx0XHRUd2VlbkxpdGVJbnRlcm5hbHMgPSBUd2VlbkxpdGUuX2ludGVybmFscyxcblx0XHRcdF9pc1NlbGVjdG9yID0gVHdlZW5MaXRlSW50ZXJuYWxzLmlzU2VsZWN0b3IsXG5cdFx0XHRfaXNBcnJheSA9IFR3ZWVuTGl0ZUludGVybmFscy5pc0FycmF5LFxuXHRcdFx0cCA9IFR3ZWVuTWF4LnByb3RvdHlwZSA9IFR3ZWVuTGl0ZS50byh7fSwgMC4xLCB7fSksXG5cdFx0XHRfYmxhbmtBcnJheSA9IFtdO1xuXG5cdFx0VHdlZW5NYXgudmVyc2lvbiA9IFwiMS4xOC4yXCI7XG5cdFx0cC5jb25zdHJ1Y3RvciA9IFR3ZWVuTWF4O1xuXHRcdHAua2lsbCgpLl9nYyA9IGZhbHNlO1xuXHRcdFR3ZWVuTWF4LmtpbGxUd2VlbnNPZiA9IFR3ZWVuTWF4LmtpbGxEZWxheWVkQ2FsbHNUbyA9IFR3ZWVuTGl0ZS5raWxsVHdlZW5zT2Y7XG5cdFx0VHdlZW5NYXguZ2V0VHdlZW5zT2YgPSBUd2VlbkxpdGUuZ2V0VHdlZW5zT2Y7XG5cdFx0VHdlZW5NYXgubGFnU21vb3RoaW5nID0gVHdlZW5MaXRlLmxhZ1Ntb290aGluZztcblx0XHRUd2Vlbk1heC50aWNrZXIgPSBUd2VlbkxpdGUudGlja2VyO1xuXHRcdFR3ZWVuTWF4LnJlbmRlciA9IFR3ZWVuTGl0ZS5yZW5kZXI7XG5cblx0XHRwLmludmFsaWRhdGUgPSBmdW5jdGlvbigpIHtcblx0XHRcdHRoaXMuX3lveW8gPSAodGhpcy52YXJzLnlveW8gPT09IHRydWUpO1xuXHRcdFx0dGhpcy5fcmVwZWF0ID0gdGhpcy52YXJzLnJlcGVhdCB8fCAwO1xuXHRcdFx0dGhpcy5fcmVwZWF0RGVsYXkgPSB0aGlzLnZhcnMucmVwZWF0RGVsYXkgfHwgMDtcblx0XHRcdHRoaXMuX3VuY2FjaGUodHJ1ZSk7XG5cdFx0XHRyZXR1cm4gVHdlZW5MaXRlLnByb3RvdHlwZS5pbnZhbGlkYXRlLmNhbGwodGhpcyk7XG5cdFx0fTtcblx0XHRcblx0XHRwLnVwZGF0ZVRvID0gZnVuY3Rpb24odmFycywgcmVzZXREdXJhdGlvbikge1xuXHRcdFx0dmFyIGN1clJhdGlvID0gdGhpcy5yYXRpbyxcblx0XHRcdFx0aW1tZWRpYXRlID0gdGhpcy52YXJzLmltbWVkaWF0ZVJlbmRlciB8fCB2YXJzLmltbWVkaWF0ZVJlbmRlcixcblx0XHRcdFx0cDtcblx0XHRcdGlmIChyZXNldER1cmF0aW9uICYmIHRoaXMuX3N0YXJ0VGltZSA8IHRoaXMuX3RpbWVsaW5lLl90aW1lKSB7XG5cdFx0XHRcdHRoaXMuX3N0YXJ0VGltZSA9IHRoaXMuX3RpbWVsaW5lLl90aW1lO1xuXHRcdFx0XHR0aGlzLl91bmNhY2hlKGZhbHNlKTtcblx0XHRcdFx0aWYgKHRoaXMuX2djKSB7XG5cdFx0XHRcdFx0dGhpcy5fZW5hYmxlZCh0cnVlLCBmYWxzZSk7XG5cdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0dGhpcy5fdGltZWxpbmUuaW5zZXJ0KHRoaXMsIHRoaXMuX3N0YXJ0VGltZSAtIHRoaXMuX2RlbGF5KTsgLy9lbnN1cmVzIHRoYXQgYW55IG5lY2Vzc2FyeSByZS1zZXF1ZW5jaW5nIG9mIEFuaW1hdGlvbnMgaW4gdGhlIHRpbWVsaW5lIG9jY3VycyB0byBtYWtlIHN1cmUgdGhlIHJlbmRlcmluZyBvcmRlciBpcyBjb3JyZWN0LlxuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0XHRmb3IgKHAgaW4gdmFycykge1xuXHRcdFx0XHR0aGlzLnZhcnNbcF0gPSB2YXJzW3BdO1xuXHRcdFx0fVxuXHRcdFx0aWYgKHRoaXMuX2luaXR0ZWQgfHwgaW1tZWRpYXRlKSB7XG5cdFx0XHRcdGlmIChyZXNldER1cmF0aW9uKSB7XG5cdFx0XHRcdFx0dGhpcy5faW5pdHRlZCA9IGZhbHNlO1xuXHRcdFx0XHRcdGlmIChpbW1lZGlhdGUpIHtcblx0XHRcdFx0XHRcdHRoaXMucmVuZGVyKDAsIHRydWUsIHRydWUpO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRpZiAodGhpcy5fZ2MpIHtcblx0XHRcdFx0XHRcdHRoaXMuX2VuYWJsZWQodHJ1ZSwgZmFsc2UpO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHRpZiAodGhpcy5fbm90aWZ5UGx1Z2luc09mRW5hYmxlZCAmJiB0aGlzLl9maXJzdFBUKSB7XG5cdFx0XHRcdFx0XHRUd2VlbkxpdGUuX29uUGx1Z2luRXZlbnQoXCJfb25EaXNhYmxlXCIsIHRoaXMpOyAvL2luIGNhc2UgYSBwbHVnaW4gbGlrZSBNb3Rpb25CbHVyIG11c3QgcGVyZm9ybSBzb21lIGNsZWFudXAgdGFza3Ncblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0aWYgKHRoaXMuX3RpbWUgLyB0aGlzLl9kdXJhdGlvbiA+IDAuOTk4KSB7IC8vaWYgdGhlIHR3ZWVuIGhhcyBmaW5pc2hlZCAob3IgY29tZSBleHRyZW1lbHkgY2xvc2UgdG8gZmluaXNoaW5nKSwgd2UganVzdCBuZWVkIHRvIHJld2luZCBpdCB0byAwIGFuZCB0aGVuIHJlbmRlciBpdCBhZ2FpbiBhdCB0aGUgZW5kIHdoaWNoIGZvcmNlcyBpdCB0byByZS1pbml0aWFsaXplIChwYXJzaW5nIHRoZSBuZXcgdmFycykuIFdlIGFsbG93IHR3ZWVucyB0aGF0IGFyZSBjbG9zZSB0byBmaW5pc2hpbmcgKGJ1dCBoYXZlbid0IHF1aXRlIGZpbmlzaGVkKSB0byB3b3JrIHRoaXMgd2F5IHRvbyBiZWNhdXNlIG90aGVyd2lzZSwgdGhlIHZhbHVlcyBhcmUgc28gc21hbGwgd2hlbiBkZXRlcm1pbmluZyB3aGVyZSB0byBwcm9qZWN0IHRoZSBzdGFydGluZyB2YWx1ZXMgdGhhdCBiaW5hcnkgbWF0aCBpc3N1ZXMgY3JlZXAgaW4gYW5kIGNhbiBtYWtlIHRoZSB0d2VlbiBhcHBlYXIgdG8gcmVuZGVyIGluY29ycmVjdGx5IHdoZW4gcnVuIGJhY2t3YXJkcy4gXG5cdFx0XHRcdFx0XHR2YXIgcHJldlRpbWUgPSB0aGlzLl90b3RhbFRpbWU7XG5cdFx0XHRcdFx0XHR0aGlzLnJlbmRlcigwLCB0cnVlLCBmYWxzZSk7XG5cdFx0XHRcdFx0XHR0aGlzLl9pbml0dGVkID0gZmFsc2U7XG5cdFx0XHRcdFx0XHR0aGlzLnJlbmRlcihwcmV2VGltZSwgdHJ1ZSwgZmFsc2UpO1xuXHRcdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0XHR0aGlzLl9pbml0dGVkID0gZmFsc2U7XG5cdFx0XHRcdFx0XHR0aGlzLl9pbml0KCk7XG5cdFx0XHRcdFx0XHRpZiAodGhpcy5fdGltZSA+IDAgfHwgaW1tZWRpYXRlKSB7XG5cdFx0XHRcdFx0XHRcdHZhciBpbnYgPSAxIC8gKDEgLSBjdXJSYXRpbyksXG5cdFx0XHRcdFx0XHRcdFx0cHQgPSB0aGlzLl9maXJzdFBULCBlbmRWYWx1ZTtcblx0XHRcdFx0XHRcdFx0d2hpbGUgKHB0KSB7XG5cdFx0XHRcdFx0XHRcdFx0ZW5kVmFsdWUgPSBwdC5zICsgcHQuYztcblx0XHRcdFx0XHRcdFx0XHRwdC5jICo9IGludjtcblx0XHRcdFx0XHRcdFx0XHRwdC5zID0gZW5kVmFsdWUgLSBwdC5jO1xuXHRcdFx0XHRcdFx0XHRcdHB0ID0gcHQuX25leHQ7XG5cdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHRcdHJldHVybiB0aGlzO1xuXHRcdH07XG5cdFx0XHRcdFxuXHRcdHAucmVuZGVyID0gZnVuY3Rpb24odGltZSwgc3VwcHJlc3NFdmVudHMsIGZvcmNlKSB7XG5cdFx0XHRpZiAoIXRoaXMuX2luaXR0ZWQpIGlmICh0aGlzLl9kdXJhdGlvbiA9PT0gMCAmJiB0aGlzLnZhcnMucmVwZWF0KSB7IC8vemVybyBkdXJhdGlvbiB0d2VlbnMgdGhhdCByZW5kZXIgaW1tZWRpYXRlbHkgaGF2ZSByZW5kZXIoKSBjYWxsZWQgZnJvbSBUd2VlbkxpdGUncyBjb25zdHJ1Y3RvciwgYmVmb3JlIFR3ZWVuTWF4J3MgY29uc3RydWN0b3IgaGFzIGZpbmlzaGVkIHNldHRpbmcgX3JlcGVhdCwgX3JlcGVhdERlbGF5LCBhbmQgX3lveW8gd2hpY2ggYXJlIGNyaXRpY2FsIGluIGRldGVybWluaW5nIHRvdGFsRHVyYXRpb24oKSBzbyB3ZSBuZWVkIHRvIGNhbGwgaW52YWxpZGF0ZSgpIHdoaWNoIGlzIGEgbG93LWtiIHdheSB0byBnZXQgdGhvc2Ugc2V0IHByb3Blcmx5LlxuXHRcdFx0XHR0aGlzLmludmFsaWRhdGUoKTtcblx0XHRcdH1cblx0XHRcdHZhciB0b3RhbER1ciA9ICghdGhpcy5fZGlydHkpID8gdGhpcy5fdG90YWxEdXJhdGlvbiA6IHRoaXMudG90YWxEdXJhdGlvbigpLFxuXHRcdFx0XHRwcmV2VGltZSA9IHRoaXMuX3RpbWUsXG5cdFx0XHRcdHByZXZUb3RhbFRpbWUgPSB0aGlzLl90b3RhbFRpbWUsIFxuXHRcdFx0XHRwcmV2Q3ljbGUgPSB0aGlzLl9jeWNsZSxcblx0XHRcdFx0ZHVyYXRpb24gPSB0aGlzLl9kdXJhdGlvbixcblx0XHRcdFx0cHJldlJhd1ByZXZUaW1lID0gdGhpcy5fcmF3UHJldlRpbWUsXG5cdFx0XHRcdGlzQ29tcGxldGUsIGNhbGxiYWNrLCBwdCwgY3ljbGVEdXJhdGlvbiwgciwgdHlwZSwgcG93LCByYXdQcmV2VGltZTtcblx0XHRcdGlmICh0aW1lID49IHRvdGFsRHVyIC0gMC4wMDAwMDAxKSB7IC8vdG8gd29yayBhcm91bmQgb2NjYXNpb25hbCBmbG9hdGluZyBwb2ludCBtYXRoIGFydGlmYWN0cy5cblx0XHRcdFx0dGhpcy5fdG90YWxUaW1lID0gdG90YWxEdXI7XG5cdFx0XHRcdHRoaXMuX2N5Y2xlID0gdGhpcy5fcmVwZWF0O1xuXHRcdFx0XHRpZiAodGhpcy5feW95byAmJiAodGhpcy5fY3ljbGUgJiAxKSAhPT0gMCkge1xuXHRcdFx0XHRcdHRoaXMuX3RpbWUgPSAwO1xuXHRcdFx0XHRcdHRoaXMucmF0aW8gPSB0aGlzLl9lYXNlLl9jYWxjRW5kID8gdGhpcy5fZWFzZS5nZXRSYXRpbygwKSA6IDA7XG5cdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0dGhpcy5fdGltZSA9IGR1cmF0aW9uO1xuXHRcdFx0XHRcdHRoaXMucmF0aW8gPSB0aGlzLl9lYXNlLl9jYWxjRW5kID8gdGhpcy5fZWFzZS5nZXRSYXRpbygxKSA6IDE7XG5cdFx0XHRcdH1cblx0XHRcdFx0aWYgKCF0aGlzLl9yZXZlcnNlZCkge1xuXHRcdFx0XHRcdGlzQ29tcGxldGUgPSB0cnVlO1xuXHRcdFx0XHRcdGNhbGxiYWNrID0gXCJvbkNvbXBsZXRlXCI7XG5cdFx0XHRcdFx0Zm9yY2UgPSAoZm9yY2UgfHwgdGhpcy5fdGltZWxpbmUuYXV0b1JlbW92ZUNoaWxkcmVuKTsgLy9vdGhlcndpc2UsIGlmIHRoZSBhbmltYXRpb24gaXMgdW5wYXVzZWQvYWN0aXZhdGVkIGFmdGVyIGl0J3MgYWxyZWFkeSBmaW5pc2hlZCwgaXQgZG9lc24ndCBnZXQgcmVtb3ZlZCBmcm9tIHRoZSBwYXJlbnQgdGltZWxpbmUuXG5cdFx0XHRcdH1cblx0XHRcdFx0aWYgKGR1cmF0aW9uID09PSAwKSBpZiAodGhpcy5faW5pdHRlZCB8fCAhdGhpcy52YXJzLmxhenkgfHwgZm9yY2UpIHsgLy96ZXJvLWR1cmF0aW9uIHR3ZWVucyBhcmUgdHJpY2t5IGJlY2F1c2Ugd2UgbXVzdCBkaXNjZXJuIHRoZSBtb21lbnR1bS9kaXJlY3Rpb24gb2YgdGltZSBpbiBvcmRlciB0byBkZXRlcm1pbmUgd2hldGhlciB0aGUgc3RhcnRpbmcgdmFsdWVzIHNob3VsZCBiZSByZW5kZXJlZCBvciB0aGUgZW5kaW5nIHZhbHVlcy4gSWYgdGhlIFwicGxheWhlYWRcIiBvZiBpdHMgdGltZWxpbmUgZ29lcyBwYXN0IHRoZSB6ZXJvLWR1cmF0aW9uIHR3ZWVuIGluIHRoZSBmb3J3YXJkIGRpcmVjdGlvbiBvciBsYW5kcyBkaXJlY3RseSBvbiBpdCwgdGhlIGVuZCB2YWx1ZXMgc2hvdWxkIGJlIHJlbmRlcmVkLCBidXQgaWYgdGhlIHRpbWVsaW5lJ3MgXCJwbGF5aGVhZFwiIG1vdmVzIHBhc3QgaXQgaW4gdGhlIGJhY2t3YXJkIGRpcmVjdGlvbiAoZnJvbSBhIHBvc3RpdGl2ZSB0aW1lIHRvIGEgbmVnYXRpdmUgdGltZSksIHRoZSBzdGFydGluZyB2YWx1ZXMgbXVzdCBiZSByZW5kZXJlZC5cblx0XHRcdFx0XHRpZiAodGhpcy5fc3RhcnRUaW1lID09PSB0aGlzLl90aW1lbGluZS5fZHVyYXRpb24pIHsgLy9pZiBhIHplcm8tZHVyYXRpb24gdHdlZW4gaXMgYXQgdGhlIFZFUlkgZW5kIG9mIGEgdGltZWxpbmUgYW5kIHRoYXQgdGltZWxpbmUgcmVuZGVycyBhdCBpdHMgZW5kLCBpdCB3aWxsIHR5cGljYWxseSBhZGQgYSB0aW55IGJpdCBvZiBjdXNoaW9uIHRvIHRoZSByZW5kZXIgdGltZSB0byBwcmV2ZW50IHJvdW5kaW5nIGVycm9ycyBmcm9tIGdldHRpbmcgaW4gdGhlIHdheSBvZiB0d2VlbnMgcmVuZGVyaW5nIHRoZWlyIFZFUlkgZW5kLiBJZiB3ZSB0aGVuIHJldmVyc2UoKSB0aGF0IHRpbWVsaW5lLCB0aGUgemVyby1kdXJhdGlvbiB0d2VlbiB3aWxsIHRyaWdnZXIgaXRzIG9uUmV2ZXJzZUNvbXBsZXRlIGV2ZW4gdGhvdWdoIHRlY2huaWNhbGx5IHRoZSBwbGF5aGVhZCBkaWRuJ3QgcGFzcyBvdmVyIGl0IGFnYWluLiBJdCdzIGEgdmVyeSBzcGVjaWZpYyBlZGdlIGNhc2Ugd2UgbXVzdCBhY2NvbW1vZGF0ZS5cblx0XHRcdFx0XHRcdHRpbWUgPSAwO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHRpZiAocHJldlJhd1ByZXZUaW1lIDwgMCB8fCAodGltZSA8PSAwICYmIHRpbWUgPj0gLTAuMDAwMDAwMSkgfHwgKHByZXZSYXdQcmV2VGltZSA9PT0gX3RpbnlOdW0gJiYgdGhpcy5kYXRhICE9PSBcImlzUGF1c2VcIikpIGlmIChwcmV2UmF3UHJldlRpbWUgIT09IHRpbWUpIHsgLy9ub3RlOiB3aGVuIHRoaXMuZGF0YSBpcyBcImlzUGF1c2VcIiwgaXQncyBhIGNhbGxiYWNrIGFkZGVkIGJ5IGFkZFBhdXNlKCkgb24gYSB0aW1lbGluZSB0aGF0IHdlIHNob3VsZCBub3QgYmUgdHJpZ2dlcmVkIHdoZW4gTEVBVklORyBpdHMgZXhhY3Qgc3RhcnQgdGltZS4gSW4gb3RoZXIgd29yZHMsIHRsLmFkZFBhdXNlKDEpLnBsYXkoMSkgc2hvdWxkbid0IHBhdXNlLlxuXHRcdFx0XHRcdFx0Zm9yY2UgPSB0cnVlO1xuXHRcdFx0XHRcdFx0aWYgKHByZXZSYXdQcmV2VGltZSA+IF90aW55TnVtKSB7XG5cdFx0XHRcdFx0XHRcdGNhbGxiYWNrID0gXCJvblJldmVyc2VDb21wbGV0ZVwiO1xuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHR0aGlzLl9yYXdQcmV2VGltZSA9IHJhd1ByZXZUaW1lID0gKCFzdXBwcmVzc0V2ZW50cyB8fCB0aW1lIHx8IHByZXZSYXdQcmV2VGltZSA9PT0gdGltZSkgPyB0aW1lIDogX3RpbnlOdW07IC8vd2hlbiB0aGUgcGxheWhlYWQgYXJyaXZlcyBhdCBFWEFDVExZIHRpbWUgMCAocmlnaHQgb24gdG9wKSBvZiBhIHplcm8tZHVyYXRpb24gdHdlZW4sIHdlIG5lZWQgdG8gZGlzY2VybiBpZiBldmVudHMgYXJlIHN1cHByZXNzZWQgc28gdGhhdCB3aGVuIHRoZSBwbGF5aGVhZCBtb3ZlcyBhZ2FpbiAobmV4dCB0aW1lKSwgaXQnbGwgdHJpZ2dlciB0aGUgY2FsbGJhY2suIElmIGV2ZW50cyBhcmUgTk9UIHN1cHByZXNzZWQsIG9idmlvdXNseSB0aGUgY2FsbGJhY2sgd291bGQgYmUgdHJpZ2dlcmVkIGluIHRoaXMgcmVuZGVyLiBCYXNpY2FsbHksIHRoZSBjYWxsYmFjayBzaG91bGQgZmlyZSBlaXRoZXIgd2hlbiB0aGUgcGxheWhlYWQgQVJSSVZFUyBvciBMRUFWRVMgdGhpcyBleGFjdCBzcG90LCBub3QgYm90aC4gSW1hZ2luZSBkb2luZyBhIHRpbWVsaW5lLnNlZWsoMCkgYW5kIHRoZXJlJ3MgYSBjYWxsYmFjayB0aGF0IHNpdHMgYXQgMC4gU2luY2UgZXZlbnRzIGFyZSBzdXBwcmVzc2VkIG9uIHRoYXQgc2VlaygpIGJ5IGRlZmF1bHQsIG5vdGhpbmcgd2lsbCBmaXJlLCBidXQgd2hlbiB0aGUgcGxheWhlYWQgbW92ZXMgb2ZmIG9mIHRoYXQgcG9zaXRpb24sIHRoZSBjYWxsYmFjayBzaG91bGQgZmlyZS4gVGhpcyBiZWhhdmlvciBpcyB3aGF0IHBlb3BsZSBpbnR1aXRpdmVseSBleHBlY3QuIFdlIHNldCB0aGUgX3Jhd1ByZXZUaW1lIHRvIGJlIGEgcHJlY2lzZSB0aW55IG51bWJlciB0byBpbmRpY2F0ZSB0aGlzIHNjZW5hcmlvIHJhdGhlciB0aGFuIHVzaW5nIGFub3RoZXIgcHJvcGVydHkvdmFyaWFibGUgd2hpY2ggd291bGQgaW5jcmVhc2UgbWVtb3J5IHVzYWdlLiBUaGlzIHRlY2huaXF1ZSBpcyBsZXNzIHJlYWRhYmxlLCBidXQgbW9yZSBlZmZpY2llbnQuXG5cdFx0XHRcdH1cblx0XHRcdFx0XG5cdFx0XHR9IGVsc2UgaWYgKHRpbWUgPCAwLjAwMDAwMDEpIHsgLy90byB3b3JrIGFyb3VuZCBvY2Nhc2lvbmFsIGZsb2F0aW5nIHBvaW50IG1hdGggYXJ0aWZhY3RzLCByb3VuZCBzdXBlciBzbWFsbCB2YWx1ZXMgdG8gMC5cblx0XHRcdFx0dGhpcy5fdG90YWxUaW1lID0gdGhpcy5fdGltZSA9IHRoaXMuX2N5Y2xlID0gMDtcblx0XHRcdFx0dGhpcy5yYXRpbyA9IHRoaXMuX2Vhc2UuX2NhbGNFbmQgPyB0aGlzLl9lYXNlLmdldFJhdGlvKDApIDogMDtcblx0XHRcdFx0aWYgKHByZXZUb3RhbFRpbWUgIT09IDAgfHwgKGR1cmF0aW9uID09PSAwICYmIHByZXZSYXdQcmV2VGltZSA+IDApKSB7XG5cdFx0XHRcdFx0Y2FsbGJhY2sgPSBcIm9uUmV2ZXJzZUNvbXBsZXRlXCI7XG5cdFx0XHRcdFx0aXNDb21wbGV0ZSA9IHRoaXMuX3JldmVyc2VkO1xuXHRcdFx0XHR9XG5cdFx0XHRcdGlmICh0aW1lIDwgMCkge1xuXHRcdFx0XHRcdHRoaXMuX2FjdGl2ZSA9IGZhbHNlO1xuXHRcdFx0XHRcdGlmIChkdXJhdGlvbiA9PT0gMCkgaWYgKHRoaXMuX2luaXR0ZWQgfHwgIXRoaXMudmFycy5sYXp5IHx8IGZvcmNlKSB7IC8vemVyby1kdXJhdGlvbiB0d2VlbnMgYXJlIHRyaWNreSBiZWNhdXNlIHdlIG11c3QgZGlzY2VybiB0aGUgbW9tZW50dW0vZGlyZWN0aW9uIG9mIHRpbWUgaW4gb3JkZXIgdG8gZGV0ZXJtaW5lIHdoZXRoZXIgdGhlIHN0YXJ0aW5nIHZhbHVlcyBzaG91bGQgYmUgcmVuZGVyZWQgb3IgdGhlIGVuZGluZyB2YWx1ZXMuIElmIHRoZSBcInBsYXloZWFkXCIgb2YgaXRzIHRpbWVsaW5lIGdvZXMgcGFzdCB0aGUgemVyby1kdXJhdGlvbiB0d2VlbiBpbiB0aGUgZm9yd2FyZCBkaXJlY3Rpb24gb3IgbGFuZHMgZGlyZWN0bHkgb24gaXQsIHRoZSBlbmQgdmFsdWVzIHNob3VsZCBiZSByZW5kZXJlZCwgYnV0IGlmIHRoZSB0aW1lbGluZSdzIFwicGxheWhlYWRcIiBtb3ZlcyBwYXN0IGl0IGluIHRoZSBiYWNrd2FyZCBkaXJlY3Rpb24gKGZyb20gYSBwb3N0aXRpdmUgdGltZSB0byBhIG5lZ2F0aXZlIHRpbWUpLCB0aGUgc3RhcnRpbmcgdmFsdWVzIG11c3QgYmUgcmVuZGVyZWQuXG5cdFx0XHRcdFx0XHRpZiAocHJldlJhd1ByZXZUaW1lID49IDApIHtcblx0XHRcdFx0XHRcdFx0Zm9yY2UgPSB0cnVlO1xuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0dGhpcy5fcmF3UHJldlRpbWUgPSByYXdQcmV2VGltZSA9ICghc3VwcHJlc3NFdmVudHMgfHwgdGltZSB8fCBwcmV2UmF3UHJldlRpbWUgPT09IHRpbWUpID8gdGltZSA6IF90aW55TnVtOyAvL3doZW4gdGhlIHBsYXloZWFkIGFycml2ZXMgYXQgRVhBQ1RMWSB0aW1lIDAgKHJpZ2h0IG9uIHRvcCkgb2YgYSB6ZXJvLWR1cmF0aW9uIHR3ZWVuLCB3ZSBuZWVkIHRvIGRpc2Nlcm4gaWYgZXZlbnRzIGFyZSBzdXBwcmVzc2VkIHNvIHRoYXQgd2hlbiB0aGUgcGxheWhlYWQgbW92ZXMgYWdhaW4gKG5leHQgdGltZSksIGl0J2xsIHRyaWdnZXIgdGhlIGNhbGxiYWNrLiBJZiBldmVudHMgYXJlIE5PVCBzdXBwcmVzc2VkLCBvYnZpb3VzbHkgdGhlIGNhbGxiYWNrIHdvdWxkIGJlIHRyaWdnZXJlZCBpbiB0aGlzIHJlbmRlci4gQmFzaWNhbGx5LCB0aGUgY2FsbGJhY2sgc2hvdWxkIGZpcmUgZWl0aGVyIHdoZW4gdGhlIHBsYXloZWFkIEFSUklWRVMgb3IgTEVBVkVTIHRoaXMgZXhhY3Qgc3BvdCwgbm90IGJvdGguIEltYWdpbmUgZG9pbmcgYSB0aW1lbGluZS5zZWVrKDApIGFuZCB0aGVyZSdzIGEgY2FsbGJhY2sgdGhhdCBzaXRzIGF0IDAuIFNpbmNlIGV2ZW50cyBhcmUgc3VwcHJlc3NlZCBvbiB0aGF0IHNlZWsoKSBieSBkZWZhdWx0LCBub3RoaW5nIHdpbGwgZmlyZSwgYnV0IHdoZW4gdGhlIHBsYXloZWFkIG1vdmVzIG9mZiBvZiB0aGF0IHBvc2l0aW9uLCB0aGUgY2FsbGJhY2sgc2hvdWxkIGZpcmUuIFRoaXMgYmVoYXZpb3IgaXMgd2hhdCBwZW9wbGUgaW50dWl0aXZlbHkgZXhwZWN0LiBXZSBzZXQgdGhlIF9yYXdQcmV2VGltZSB0byBiZSBhIHByZWNpc2UgdGlueSBudW1iZXIgdG8gaW5kaWNhdGUgdGhpcyBzY2VuYXJpbyByYXRoZXIgdGhhbiB1c2luZyBhbm90aGVyIHByb3BlcnR5L3ZhcmlhYmxlIHdoaWNoIHdvdWxkIGluY3JlYXNlIG1lbW9yeSB1c2FnZS4gVGhpcyB0ZWNobmlxdWUgaXMgbGVzcyByZWFkYWJsZSwgYnV0IG1vcmUgZWZmaWNpZW50LlxuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXHRcdFx0XHRpZiAoIXRoaXMuX2luaXR0ZWQpIHsgLy9pZiB3ZSByZW5kZXIgdGhlIHZlcnkgYmVnaW5uaW5nICh0aW1lID09IDApIG9mIGEgZnJvbVRvKCksIHdlIG11c3QgZm9yY2UgdGhlIHJlbmRlciAobm9ybWFsIHR3ZWVucyB3b3VsZG4ndCBuZWVkIHRvIHJlbmRlciBhdCBhIHRpbWUgb2YgMCB3aGVuIHRoZSBwcmV2VGltZSB3YXMgYWxzbyAwKS4gVGhpcyBpcyBhbHNvIG1hbmRhdG9yeSB0byBtYWtlIHN1cmUgb3ZlcndyaXRpbmcga2lja3MgaW4gaW1tZWRpYXRlbHkuXG5cdFx0XHRcdFx0Zm9yY2UgPSB0cnVlO1xuXHRcdFx0XHR9XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHR0aGlzLl90b3RhbFRpbWUgPSB0aGlzLl90aW1lID0gdGltZTtcblx0XHRcdFx0XG5cdFx0XHRcdGlmICh0aGlzLl9yZXBlYXQgIT09IDApIHtcblx0XHRcdFx0XHRjeWNsZUR1cmF0aW9uID0gZHVyYXRpb24gKyB0aGlzLl9yZXBlYXREZWxheTtcblx0XHRcdFx0XHR0aGlzLl9jeWNsZSA9ICh0aGlzLl90b3RhbFRpbWUgLyBjeWNsZUR1cmF0aW9uKSA+PiAwOyAvL29yaWdpbmFsbHkgX3RvdGFsVGltZSAlIGN5Y2xlRHVyYXRpb24gYnV0IGZsb2F0aW5nIHBvaW50IGVycm9ycyBjYXVzZWQgcHJvYmxlbXMsIHNvIEkgbm9ybWFsaXplZCBpdC4gKDQgJSAwLjggc2hvdWxkIGJlIDAgYnV0IEZsYXNoIHJlcG9ydHMgaXQgYXMgMC43OTk5OTk5OSEpXG5cdFx0XHRcdFx0aWYgKHRoaXMuX2N5Y2xlICE9PSAwKSBpZiAodGhpcy5fY3ljbGUgPT09IHRoaXMuX3RvdGFsVGltZSAvIGN5Y2xlRHVyYXRpb24pIHtcblx0XHRcdFx0XHRcdHRoaXMuX2N5Y2xlLS07IC8vb3RoZXJ3aXNlIHdoZW4gcmVuZGVyZWQgZXhhY3RseSBhdCB0aGUgZW5kIHRpbWUsIGl0IHdpbGwgYWN0IGFzIHRob3VnaCBpdCBpcyByZXBlYXRpbmcgKGF0IHRoZSBiZWdpbm5pbmcpXG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdHRoaXMuX3RpbWUgPSB0aGlzLl90b3RhbFRpbWUgLSAodGhpcy5fY3ljbGUgKiBjeWNsZUR1cmF0aW9uKTtcblx0XHRcdFx0XHRpZiAodGhpcy5feW95bykgaWYgKCh0aGlzLl9jeWNsZSAmIDEpICE9PSAwKSB7XG5cdFx0XHRcdFx0XHR0aGlzLl90aW1lID0gZHVyYXRpb24gLSB0aGlzLl90aW1lO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHRpZiAodGhpcy5fdGltZSA+IGR1cmF0aW9uKSB7XG5cdFx0XHRcdFx0XHR0aGlzLl90aW1lID0gZHVyYXRpb247XG5cdFx0XHRcdFx0fSBlbHNlIGlmICh0aGlzLl90aW1lIDwgMCkge1xuXHRcdFx0XHRcdFx0dGhpcy5fdGltZSA9IDA7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cblx0XHRcdFx0aWYgKHRoaXMuX2Vhc2VUeXBlKSB7XG5cdFx0XHRcdFx0ciA9IHRoaXMuX3RpbWUgLyBkdXJhdGlvbjtcblx0XHRcdFx0XHR0eXBlID0gdGhpcy5fZWFzZVR5cGU7XG5cdFx0XHRcdFx0cG93ID0gdGhpcy5fZWFzZVBvd2VyO1xuXHRcdFx0XHRcdGlmICh0eXBlID09PSAxIHx8ICh0eXBlID09PSAzICYmIHIgPj0gMC41KSkge1xuXHRcdFx0XHRcdFx0ciA9IDEgLSByO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHRpZiAodHlwZSA9PT0gMykge1xuXHRcdFx0XHRcdFx0ciAqPSAyO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHRpZiAocG93ID09PSAxKSB7XG5cdFx0XHRcdFx0XHRyICo9IHI7XG5cdFx0XHRcdFx0fSBlbHNlIGlmIChwb3cgPT09IDIpIHtcblx0XHRcdFx0XHRcdHIgKj0gciAqIHI7XG5cdFx0XHRcdFx0fSBlbHNlIGlmIChwb3cgPT09IDMpIHtcblx0XHRcdFx0XHRcdHIgKj0gciAqIHIgKiByO1xuXHRcdFx0XHRcdH0gZWxzZSBpZiAocG93ID09PSA0KSB7XG5cdFx0XHRcdFx0XHRyICo9IHIgKiByICogciAqIHI7XG5cdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0aWYgKHR5cGUgPT09IDEpIHtcblx0XHRcdFx0XHRcdHRoaXMucmF0aW8gPSAxIC0gcjtcblx0XHRcdFx0XHR9IGVsc2UgaWYgKHR5cGUgPT09IDIpIHtcblx0XHRcdFx0XHRcdHRoaXMucmF0aW8gPSByO1xuXHRcdFx0XHRcdH0gZWxzZSBpZiAodGhpcy5fdGltZSAvIGR1cmF0aW9uIDwgMC41KSB7XG5cdFx0XHRcdFx0XHR0aGlzLnJhdGlvID0gciAvIDI7XG5cdFx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRcdHRoaXMucmF0aW8gPSAxIC0gKHIgLyAyKTtcblx0XHRcdFx0XHR9XG5cblx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHR0aGlzLnJhdGlvID0gdGhpcy5fZWFzZS5nZXRSYXRpbyh0aGlzLl90aW1lIC8gZHVyYXRpb24pO1xuXHRcdFx0XHR9XG5cdFx0XHRcdFxuXHRcdFx0fVxuXHRcdFx0XHRcblx0XHRcdGlmIChwcmV2VGltZSA9PT0gdGhpcy5fdGltZSAmJiAhZm9yY2UgJiYgcHJldkN5Y2xlID09PSB0aGlzLl9jeWNsZSkge1xuXHRcdFx0XHRpZiAocHJldlRvdGFsVGltZSAhPT0gdGhpcy5fdG90YWxUaW1lKSBpZiAodGhpcy5fb25VcGRhdGUpIGlmICghc3VwcHJlc3NFdmVudHMpIHsgLy9zbyB0aGF0IG9uVXBkYXRlIGZpcmVzIGV2ZW4gZHVyaW5nIHRoZSByZXBlYXREZWxheSAtIGFzIGxvbmcgYXMgdGhlIHRvdGFsVGltZSBjaGFuZ2VkLCB3ZSBzaG91bGQgdHJpZ2dlciBvblVwZGF0ZS5cblx0XHRcdFx0XHR0aGlzLl9jYWxsYmFjayhcIm9uVXBkYXRlXCIpO1xuXHRcdFx0XHR9XG5cdFx0XHRcdHJldHVybjtcblx0XHRcdH0gZWxzZSBpZiAoIXRoaXMuX2luaXR0ZWQpIHtcblx0XHRcdFx0dGhpcy5faW5pdCgpO1xuXHRcdFx0XHRpZiAoIXRoaXMuX2luaXR0ZWQgfHwgdGhpcy5fZ2MpIHsgLy9pbW1lZGlhdGVSZW5kZXIgdHdlZW5zIHR5cGljYWxseSB3b24ndCBpbml0aWFsaXplIHVudGlsIHRoZSBwbGF5aGVhZCBhZHZhbmNlcyAoX3RpbWUgaXMgZ3JlYXRlciB0aGFuIDApIGluIG9yZGVyIHRvIGVuc3VyZSB0aGF0IG92ZXJ3cml0aW5nIG9jY3VycyBwcm9wZXJseS4gQWxzbywgaWYgYWxsIG9mIHRoZSB0d2VlbmluZyBwcm9wZXJ0aWVzIGhhdmUgYmVlbiBvdmVyd3JpdHRlbiAod2hpY2ggd291bGQgY2F1c2UgX2djIHRvIGJlIHRydWUsIGFzIHNldCBpbiBfaW5pdCgpKSwgd2Ugc2hvdWxkbid0IGNvbnRpbnVlIG90aGVyd2lzZSBhbiBvblN0YXJ0IGNhbGxiYWNrIGNvdWxkIGJlIGNhbGxlZCBmb3IgZXhhbXBsZS5cblx0XHRcdFx0XHRyZXR1cm47XG5cdFx0XHRcdH0gZWxzZSBpZiAoIWZvcmNlICYmIHRoaXMuX2ZpcnN0UFQgJiYgKCh0aGlzLnZhcnMubGF6eSAhPT0gZmFsc2UgJiYgdGhpcy5fZHVyYXRpb24pIHx8ICh0aGlzLnZhcnMubGF6eSAmJiAhdGhpcy5fZHVyYXRpb24pKSkgeyAvL3dlIHN0aWNrIGl0IGluIHRoZSBxdWV1ZSBmb3IgcmVuZGVyaW5nIGF0IHRoZSB2ZXJ5IGVuZCBvZiB0aGUgdGljayAtIHRoaXMgaXMgYSBwZXJmb3JtYW5jZSBvcHRpbWl6YXRpb24gYmVjYXVzZSBicm93c2VycyBpbnZhbGlkYXRlIHN0eWxlcyBhbmQgZm9yY2UgYSByZWNhbGN1bGF0aW9uIGlmIHlvdSByZWFkLCB3cml0ZSwgYW5kIHRoZW4gcmVhZCBzdHlsZSBkYXRhIChzbyBpdCdzIGJldHRlciB0byByZWFkL3JlYWQvcmVhZC93cml0ZS93cml0ZS93cml0ZSB0aGFuIHJlYWQvd3JpdGUvcmVhZC93cml0ZS9yZWFkL3dyaXRlKS4gVGhlIGRvd24gc2lkZSwgb2YgY291cnNlLCBpcyB0aGF0IHVzdWFsbHkgeW91IFdBTlQgdGhpbmdzIHRvIHJlbmRlciBpbW1lZGlhdGVseSBiZWNhdXNlIHlvdSBtYXkgaGF2ZSBjb2RlIHJ1bm5pbmcgcmlnaHQgYWZ0ZXIgdGhhdCB3aGljaCBkZXBlbmRzIG9uIHRoZSBjaGFuZ2UuIExpa2UgaW1hZ2luZSBydW5uaW5nIFR3ZWVuTGl0ZS5zZXQoLi4uKSBhbmQgdGhlbiBpbW1lZGlhdGVseSBhZnRlciB0aGF0LCBjcmVhdGluZyBhIG5vdGhlciB0d2VlbiB0aGF0IGFuaW1hdGVzIHRoZSBzYW1lIHByb3BlcnR5IHRvIGFub3RoZXIgdmFsdWU7IHRoZSBzdGFydGluZyB2YWx1ZXMgb2YgdGhhdCAybmQgdHdlZW4gd291bGRuJ3QgYmUgYWNjdXJhdGUgaWYgbGF6eSBpcyB0cnVlLlxuXHRcdFx0XHRcdHRoaXMuX3RpbWUgPSBwcmV2VGltZTtcblx0XHRcdFx0XHR0aGlzLl90b3RhbFRpbWUgPSBwcmV2VG90YWxUaW1lO1xuXHRcdFx0XHRcdHRoaXMuX3Jhd1ByZXZUaW1lID0gcHJldlJhd1ByZXZUaW1lO1xuXHRcdFx0XHRcdHRoaXMuX2N5Y2xlID0gcHJldkN5Y2xlO1xuXHRcdFx0XHRcdFR3ZWVuTGl0ZUludGVybmFscy5sYXp5VHdlZW5zLnB1c2godGhpcyk7XG5cdFx0XHRcdFx0dGhpcy5fbGF6eSA9IFt0aW1lLCBzdXBwcmVzc0V2ZW50c107XG5cdFx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0XHR9XG5cdFx0XHRcdC8vX2Vhc2UgaXMgaW5pdGlhbGx5IHNldCB0byBkZWZhdWx0RWFzZSwgc28gbm93IHRoYXQgaW5pdCgpIGhhcyBydW4sIF9lYXNlIGlzIHNldCBwcm9wZXJseSBhbmQgd2UgbmVlZCB0byByZWNhbGN1bGF0ZSB0aGUgcmF0aW8uIE92ZXJhbGwgdGhpcyBpcyBmYXN0ZXIgdGhhbiB1c2luZyBjb25kaXRpb25hbCBsb2dpYyBlYXJsaWVyIGluIHRoZSBtZXRob2QgdG8gYXZvaWQgaGF2aW5nIHRvIHNldCByYXRpbyB0d2ljZSBiZWNhdXNlIHdlIG9ubHkgaW5pdCgpIG9uY2UgYnV0IHJlbmRlclRpbWUoKSBnZXRzIGNhbGxlZCBWRVJZIGZyZXF1ZW50bHkuXG5cdFx0XHRcdGlmICh0aGlzLl90aW1lICYmICFpc0NvbXBsZXRlKSB7XG5cdFx0XHRcdFx0dGhpcy5yYXRpbyA9IHRoaXMuX2Vhc2UuZ2V0UmF0aW8odGhpcy5fdGltZSAvIGR1cmF0aW9uKTtcblx0XHRcdFx0fSBlbHNlIGlmIChpc0NvbXBsZXRlICYmIHRoaXMuX2Vhc2UuX2NhbGNFbmQpIHtcblx0XHRcdFx0XHR0aGlzLnJhdGlvID0gdGhpcy5fZWFzZS5nZXRSYXRpbygodGhpcy5fdGltZSA9PT0gMCkgPyAwIDogMSk7XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHRcdGlmICh0aGlzLl9sYXp5ICE9PSBmYWxzZSkge1xuXHRcdFx0XHR0aGlzLl9sYXp5ID0gZmFsc2U7XG5cdFx0XHR9XG5cblx0XHRcdGlmICghdGhpcy5fYWN0aXZlKSBpZiAoIXRoaXMuX3BhdXNlZCAmJiB0aGlzLl90aW1lICE9PSBwcmV2VGltZSAmJiB0aW1lID49IDApIHtcblx0XHRcdFx0dGhpcy5fYWN0aXZlID0gdHJ1ZTsgLy9zbyB0aGF0IGlmIHRoZSB1c2VyIHJlbmRlcnMgYSB0d2VlbiAoYXMgb3Bwb3NlZCB0byB0aGUgdGltZWxpbmUgcmVuZGVyaW5nIGl0KSwgdGhlIHRpbWVsaW5lIGlzIGZvcmNlZCB0byByZS1yZW5kZXIgYW5kIGFsaWduIGl0IHdpdGggdGhlIHByb3BlciB0aW1lL2ZyYW1lIG9uIHRoZSBuZXh0IHJlbmRlcmluZyBjeWNsZS4gTWF5YmUgdGhlIHR3ZWVuIGFscmVhZHkgZmluaXNoZWQgYnV0IHRoZSB1c2VyIG1hbnVhbGx5IHJlLXJlbmRlcnMgaXQgYXMgaGFsZndheSBkb25lLlxuXHRcdFx0fVxuXHRcdFx0aWYgKHByZXZUb3RhbFRpbWUgPT09IDApIHtcblx0XHRcdFx0aWYgKHRoaXMuX2luaXR0ZWQgPT09IDIgJiYgdGltZSA+IDApIHtcblx0XHRcdFx0XHQvL3RoaXMuaW52YWxpZGF0ZSgpO1xuXHRcdFx0XHRcdHRoaXMuX2luaXQoKTsgLy93aWxsIGp1c3QgYXBwbHkgb3ZlcndyaXRpbmcgc2luY2UgX2luaXR0ZWQgb2YgKDIpIG1lYW5zIGl0IHdhcyBhIGZyb20oKSB0d2VlbiB0aGF0IGhhZCBpbW1lZGlhdGVSZW5kZXI6dHJ1ZVxuXHRcdFx0XHR9XG5cdFx0XHRcdGlmICh0aGlzLl9zdGFydEF0KSB7XG5cdFx0XHRcdFx0aWYgKHRpbWUgPj0gMCkge1xuXHRcdFx0XHRcdFx0dGhpcy5fc3RhcnRBdC5yZW5kZXIodGltZSwgc3VwcHJlc3NFdmVudHMsIGZvcmNlKTtcblx0XHRcdFx0XHR9IGVsc2UgaWYgKCFjYWxsYmFjaykge1xuXHRcdFx0XHRcdFx0Y2FsbGJhY2sgPSBcIl9kdW1teUdTXCI7IC8vaWYgbm8gY2FsbGJhY2sgaXMgZGVmaW5lZCwgdXNlIGEgZHVtbXkgdmFsdWUganVzdCBzbyB0aGF0IHRoZSBjb25kaXRpb24gYXQgdGhlIGVuZCBldmFsdWF0ZXMgYXMgdHJ1ZSBiZWNhdXNlIF9zdGFydEF0IHNob3VsZCByZW5kZXIgQUZURVIgdGhlIG5vcm1hbCByZW5kZXIgbG9vcCB3aGVuIHRoZSB0aW1lIGlzIG5lZ2F0aXZlLiBXZSBjb3VsZCBoYW5kbGUgdGhpcyBpbiBhIG1vcmUgaW50dWl0aXZlIHdheSwgb2YgY291cnNlLCBidXQgdGhlIHJlbmRlciBsb29wIGlzIHRoZSBNT1NUIGltcG9ydGFudCB0aGluZyB0byBvcHRpbWl6ZSwgc28gdGhpcyB0ZWNobmlxdWUgYWxsb3dzIHVzIHRvIGF2b2lkIGFkZGluZyBleHRyYSBjb25kaXRpb25hbCBsb2dpYyBpbiBhIGhpZ2gtZnJlcXVlbmN5IGFyZWEuXG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cdFx0XHRcdGlmICh0aGlzLnZhcnMub25TdGFydCkgaWYgKHRoaXMuX3RvdGFsVGltZSAhPT0gMCB8fCBkdXJhdGlvbiA9PT0gMCkgaWYgKCFzdXBwcmVzc0V2ZW50cykge1xuXHRcdFx0XHRcdHRoaXMuX2NhbGxiYWNrKFwib25TdGFydFwiKTtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdFx0XG5cdFx0XHRwdCA9IHRoaXMuX2ZpcnN0UFQ7XG5cdFx0XHR3aGlsZSAocHQpIHtcblx0XHRcdFx0aWYgKHB0LmYpIHtcblx0XHRcdFx0XHRwdC50W3B0LnBdKHB0LmMgKiB0aGlzLnJhdGlvICsgcHQucyk7XG5cdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0cHQudFtwdC5wXSA9IHB0LmMgKiB0aGlzLnJhdGlvICsgcHQucztcblx0XHRcdFx0fVxuXHRcdFx0XHRwdCA9IHB0Ll9uZXh0O1xuXHRcdFx0fVxuXHRcdFx0XG5cdFx0XHRpZiAodGhpcy5fb25VcGRhdGUpIHtcblx0XHRcdFx0aWYgKHRpbWUgPCAwKSBpZiAodGhpcy5fc3RhcnRBdCAmJiB0aGlzLl9zdGFydFRpbWUpIHsgLy9pZiB0aGUgdHdlZW4gaXMgcG9zaXRpb25lZCBhdCB0aGUgVkVSWSBiZWdpbm5pbmcgKF9zdGFydFRpbWUgMCkgb2YgaXRzIHBhcmVudCB0aW1lbGluZSwgaXQncyBpbGxlZ2FsIGZvciB0aGUgcGxheWhlYWQgdG8gZ28gYmFjayBmdXJ0aGVyLCBzbyB3ZSBzaG91bGQgbm90IHJlbmRlciB0aGUgcmVjb3JkZWQgc3RhcnRBdCB2YWx1ZXMuXG5cdFx0XHRcdFx0dGhpcy5fc3RhcnRBdC5yZW5kZXIodGltZSwgc3VwcHJlc3NFdmVudHMsIGZvcmNlKTsgLy9ub3RlOiBmb3IgcGVyZm9ybWFuY2UgcmVhc29ucywgd2UgdHVjayB0aGlzIGNvbmRpdGlvbmFsIGxvZ2ljIGluc2lkZSBsZXNzIHRyYXZlbGVkIGFyZWFzIChtb3N0IHR3ZWVucyBkb24ndCBoYXZlIGFuIG9uVXBkYXRlKS4gV2UnZCBqdXN0IGhhdmUgaXQgYXQgdGhlIGVuZCBiZWZvcmUgdGhlIG9uQ29tcGxldGUsIGJ1dCB0aGUgdmFsdWVzIHNob3VsZCBiZSB1cGRhdGVkIGJlZm9yZSBhbnkgb25VcGRhdGUgaXMgY2FsbGVkLCBzbyB3ZSBBTFNPIHB1dCBpdCBoZXJlIGFuZCB0aGVuIGlmIGl0J3Mgbm90IGNhbGxlZCwgd2UgZG8gc28gbGF0ZXIgbmVhciB0aGUgb25Db21wbGV0ZS5cblx0XHRcdFx0fVxuXHRcdFx0XHRpZiAoIXN1cHByZXNzRXZlbnRzKSBpZiAodGhpcy5fdG90YWxUaW1lICE9PSBwcmV2VG90YWxUaW1lIHx8IGlzQ29tcGxldGUpIHtcblx0XHRcdFx0XHR0aGlzLl9jYWxsYmFjayhcIm9uVXBkYXRlXCIpO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0XHRpZiAodGhpcy5fY3ljbGUgIT09IHByZXZDeWNsZSkgaWYgKCFzdXBwcmVzc0V2ZW50cykgaWYgKCF0aGlzLl9nYykgaWYgKHRoaXMudmFycy5vblJlcGVhdCkge1xuXHRcdFx0XHR0aGlzLl9jYWxsYmFjayhcIm9uUmVwZWF0XCIpO1xuXHRcdFx0fVxuXHRcdFx0aWYgKGNhbGxiYWNrKSBpZiAoIXRoaXMuX2djIHx8IGZvcmNlKSB7IC8vY2hlY2sgZ2MgYmVjYXVzZSB0aGVyZSdzIGEgY2hhbmNlIHRoYXQga2lsbCgpIGNvdWxkIGJlIGNhbGxlZCBpbiBhbiBvblVwZGF0ZVxuXHRcdFx0XHRpZiAodGltZSA8IDAgJiYgdGhpcy5fc3RhcnRBdCAmJiAhdGhpcy5fb25VcGRhdGUgJiYgdGhpcy5fc3RhcnRUaW1lKSB7IC8vaWYgdGhlIHR3ZWVuIGlzIHBvc2l0aW9uZWQgYXQgdGhlIFZFUlkgYmVnaW5uaW5nIChfc3RhcnRUaW1lIDApIG9mIGl0cyBwYXJlbnQgdGltZWxpbmUsIGl0J3MgaWxsZWdhbCBmb3IgdGhlIHBsYXloZWFkIHRvIGdvIGJhY2sgZnVydGhlciwgc28gd2Ugc2hvdWxkIG5vdCByZW5kZXIgdGhlIHJlY29yZGVkIHN0YXJ0QXQgdmFsdWVzLlxuXHRcdFx0XHRcdHRoaXMuX3N0YXJ0QXQucmVuZGVyKHRpbWUsIHN1cHByZXNzRXZlbnRzLCBmb3JjZSk7XG5cdFx0XHRcdH1cblx0XHRcdFx0aWYgKGlzQ29tcGxldGUpIHtcblx0XHRcdFx0XHRpZiAodGhpcy5fdGltZWxpbmUuYXV0b1JlbW92ZUNoaWxkcmVuKSB7XG5cdFx0XHRcdFx0XHR0aGlzLl9lbmFibGVkKGZhbHNlLCBmYWxzZSk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdHRoaXMuX2FjdGl2ZSA9IGZhbHNlO1xuXHRcdFx0XHR9XG5cdFx0XHRcdGlmICghc3VwcHJlc3NFdmVudHMgJiYgdGhpcy52YXJzW2NhbGxiYWNrXSkge1xuXHRcdFx0XHRcdHRoaXMuX2NhbGxiYWNrKGNhbGxiYWNrKTtcblx0XHRcdFx0fVxuXHRcdFx0XHRpZiAoZHVyYXRpb24gPT09IDAgJiYgdGhpcy5fcmF3UHJldlRpbWUgPT09IF90aW55TnVtICYmIHJhd1ByZXZUaW1lICE9PSBfdGlueU51bSkgeyAvL3RoZSBvbkNvbXBsZXRlIG9yIG9uUmV2ZXJzZUNvbXBsZXRlIGNvdWxkIHRyaWdnZXIgbW92ZW1lbnQgb2YgdGhlIHBsYXloZWFkIGFuZCBmb3IgemVyby1kdXJhdGlvbiB0d2VlbnMgKHdoaWNoIG11c3QgZGlzY2VybiBkaXJlY3Rpb24pIHRoYXQgbGFuZCBkaXJlY3RseSBiYWNrIG9uIHRoZWlyIHN0YXJ0IHRpbWUsIHdlIGRvbid0IHdhbnQgdG8gZmlyZSBhZ2FpbiBvbiB0aGUgbmV4dCByZW5kZXIuIFRoaW5rIG9mIHNldmVyYWwgYWRkUGF1c2UoKSdzIGluIGEgdGltZWxpbmUgdGhhdCBmb3JjZXMgdGhlIHBsYXloZWFkIHRvIGEgY2VydGFpbiBzcG90LCBidXQgd2hhdCBpZiBpdCdzIGFscmVhZHkgcGF1c2VkIGFuZCBhbm90aGVyIHR3ZWVuIGlzIHR3ZWVuaW5nIHRoZSBcInRpbWVcIiBvZiB0aGUgdGltZWxpbmU/IEVhY2ggdGltZSBpdCBtb3ZlcyBbZm9yd2FyZF0gcGFzdCB0aGF0IHNwb3QsIGl0IHdvdWxkIG1vdmUgYmFjaywgYW5kIHNpbmNlIHN1cHByZXNzRXZlbnRzIGlzIHRydWUsIGl0J2QgcmVzZXQgX3Jhd1ByZXZUaW1lIHRvIF90aW55TnVtIHNvIHRoYXQgd2hlbiBpdCBiZWdpbnMgYWdhaW4sIHRoZSBjYWxsYmFjayB3b3VsZCBmaXJlIChzbyB1bHRpbWF0ZWx5IGl0IGNvdWxkIGJvdW5jZSBiYWNrIGFuZCBmb3J0aCBkdXJpbmcgdGhhdCB0d2VlbikuIEFnYWluLCB0aGlzIGlzIGEgdmVyeSB1bmNvbW1vbiBzY2VuYXJpbywgYnV0IHBvc3NpYmxlIG5vbmV0aGVsZXNzLlxuXHRcdFx0XHRcdHRoaXMuX3Jhd1ByZXZUaW1lID0gMDtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH07XG5cdFx0XG4vLy0tLS0gU1RBVElDIEZVTkNUSU9OUyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXHRcdFxuXHRcdFR3ZWVuTWF4LnRvID0gZnVuY3Rpb24odGFyZ2V0LCBkdXJhdGlvbiwgdmFycykge1xuXHRcdFx0cmV0dXJuIG5ldyBUd2Vlbk1heCh0YXJnZXQsIGR1cmF0aW9uLCB2YXJzKTtcblx0XHR9O1xuXHRcdFxuXHRcdFR3ZWVuTWF4LmZyb20gPSBmdW5jdGlvbih0YXJnZXQsIGR1cmF0aW9uLCB2YXJzKSB7XG5cdFx0XHR2YXJzLnJ1bkJhY2t3YXJkcyA9IHRydWU7XG5cdFx0XHR2YXJzLmltbWVkaWF0ZVJlbmRlciA9ICh2YXJzLmltbWVkaWF0ZVJlbmRlciAhPSBmYWxzZSk7XG5cdFx0XHRyZXR1cm4gbmV3IFR3ZWVuTWF4KHRhcmdldCwgZHVyYXRpb24sIHZhcnMpO1xuXHRcdH07XG5cdFx0XG5cdFx0VHdlZW5NYXguZnJvbVRvID0gZnVuY3Rpb24odGFyZ2V0LCBkdXJhdGlvbiwgZnJvbVZhcnMsIHRvVmFycykge1xuXHRcdFx0dG9WYXJzLnN0YXJ0QXQgPSBmcm9tVmFycztcblx0XHRcdHRvVmFycy5pbW1lZGlhdGVSZW5kZXIgPSAodG9WYXJzLmltbWVkaWF0ZVJlbmRlciAhPSBmYWxzZSAmJiBmcm9tVmFycy5pbW1lZGlhdGVSZW5kZXIgIT0gZmFsc2UpO1xuXHRcdFx0cmV0dXJuIG5ldyBUd2Vlbk1heCh0YXJnZXQsIGR1cmF0aW9uLCB0b1ZhcnMpO1xuXHRcdH07XG5cdFx0XG5cdFx0VHdlZW5NYXguc3RhZ2dlclRvID0gVHdlZW5NYXguYWxsVG8gPSBmdW5jdGlvbih0YXJnZXRzLCBkdXJhdGlvbiwgdmFycywgc3RhZ2dlciwgb25Db21wbGV0ZUFsbCwgb25Db21wbGV0ZUFsbFBhcmFtcywgb25Db21wbGV0ZUFsbFNjb3BlKSB7XG5cdFx0XHRzdGFnZ2VyID0gc3RhZ2dlciB8fCAwO1xuXHRcdFx0dmFyIGRlbGF5ID0gMCxcblx0XHRcdFx0YSA9IFtdLFxuXHRcdFx0XHRmaW5hbENvbXBsZXRlID0gZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0aWYgKHZhcnMub25Db21wbGV0ZSkge1xuXHRcdFx0XHRcdFx0dmFycy5vbkNvbXBsZXRlLmFwcGx5KHZhcnMub25Db21wbGV0ZVNjb3BlIHx8IHRoaXMsIGFyZ3VtZW50cyk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdG9uQ29tcGxldGVBbGwuYXBwbHkob25Db21wbGV0ZUFsbFNjb3BlIHx8IHZhcnMuY2FsbGJhY2tTY29wZSB8fCB0aGlzLCBvbkNvbXBsZXRlQWxsUGFyYW1zIHx8IF9ibGFua0FycmF5KTtcblx0XHRcdFx0fSxcblx0XHRcdFx0Y3ljbGUgPSB2YXJzLmN5Y2xlLFxuXHRcdFx0XHRmcm9tQ3ljbGUgPSAodmFycy5zdGFydEF0ICYmIHZhcnMuc3RhcnRBdC5jeWNsZSksXG5cdFx0XHRcdGwsIGNvcHksIGksIHA7XG5cdFx0XHRpZiAoIV9pc0FycmF5KHRhcmdldHMpKSB7XG5cdFx0XHRcdGlmICh0eXBlb2YodGFyZ2V0cykgPT09IFwic3RyaW5nXCIpIHtcblx0XHRcdFx0XHR0YXJnZXRzID0gVHdlZW5MaXRlLnNlbGVjdG9yKHRhcmdldHMpIHx8IHRhcmdldHM7XG5cdFx0XHRcdH1cblx0XHRcdFx0aWYgKF9pc1NlbGVjdG9yKHRhcmdldHMpKSB7XG5cdFx0XHRcdFx0dGFyZ2V0cyA9IF9zbGljZSh0YXJnZXRzKTtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdFx0dGFyZ2V0cyA9IHRhcmdldHMgfHwgW107XG5cdFx0XHRpZiAoc3RhZ2dlciA8IDApIHtcblx0XHRcdFx0dGFyZ2V0cyA9IF9zbGljZSh0YXJnZXRzKTtcblx0XHRcdFx0dGFyZ2V0cy5yZXZlcnNlKCk7XG5cdFx0XHRcdHN0YWdnZXIgKj0gLTE7XG5cdFx0XHR9XG5cdFx0XHRsID0gdGFyZ2V0cy5sZW5ndGggLSAxO1xuXHRcdFx0Zm9yIChpID0gMDsgaSA8PSBsOyBpKyspIHtcblx0XHRcdFx0Y29weSA9IHt9O1xuXHRcdFx0XHRmb3IgKHAgaW4gdmFycykge1xuXHRcdFx0XHRcdGNvcHlbcF0gPSB2YXJzW3BdO1xuXHRcdFx0XHR9XG5cdFx0XHRcdGlmIChjeWNsZSkge1xuXHRcdFx0XHRcdF9hcHBseUN5Y2xlKGNvcHksIHRhcmdldHMsIGkpO1xuXHRcdFx0XHR9XG5cdFx0XHRcdGlmIChmcm9tQ3ljbGUpIHtcblx0XHRcdFx0XHRmcm9tQ3ljbGUgPSBjb3B5LnN0YXJ0QXQgPSB7fTtcblx0XHRcdFx0XHRmb3IgKHAgaW4gdmFycy5zdGFydEF0KSB7XG5cdFx0XHRcdFx0XHRmcm9tQ3ljbGVbcF0gPSB2YXJzLnN0YXJ0QXRbcF07XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdF9hcHBseUN5Y2xlKGNvcHkuc3RhcnRBdCwgdGFyZ2V0cywgaSk7XG5cdFx0XHRcdH1cblx0XHRcdFx0Y29weS5kZWxheSA9IGRlbGF5ICsgKGNvcHkuZGVsYXkgfHwgMCk7XG5cdFx0XHRcdGlmIChpID09PSBsICYmIG9uQ29tcGxldGVBbGwpIHtcblx0XHRcdFx0XHRjb3B5Lm9uQ29tcGxldGUgPSBmaW5hbENvbXBsZXRlO1xuXHRcdFx0XHR9XG5cdFx0XHRcdGFbaV0gPSBuZXcgVHdlZW5NYXgodGFyZ2V0c1tpXSwgZHVyYXRpb24sIGNvcHkpO1xuXHRcdFx0XHRkZWxheSArPSBzdGFnZ2VyO1xuXHRcdFx0fVxuXHRcdFx0cmV0dXJuIGE7XG5cdFx0fTtcblx0XHRcblx0XHRUd2Vlbk1heC5zdGFnZ2VyRnJvbSA9IFR3ZWVuTWF4LmFsbEZyb20gPSBmdW5jdGlvbih0YXJnZXRzLCBkdXJhdGlvbiwgdmFycywgc3RhZ2dlciwgb25Db21wbGV0ZUFsbCwgb25Db21wbGV0ZUFsbFBhcmFtcywgb25Db21wbGV0ZUFsbFNjb3BlKSB7XG5cdFx0XHR2YXJzLnJ1bkJhY2t3YXJkcyA9IHRydWU7XG5cdFx0XHR2YXJzLmltbWVkaWF0ZVJlbmRlciA9ICh2YXJzLmltbWVkaWF0ZVJlbmRlciAhPSBmYWxzZSk7XG5cdFx0XHRyZXR1cm4gVHdlZW5NYXguc3RhZ2dlclRvKHRhcmdldHMsIGR1cmF0aW9uLCB2YXJzLCBzdGFnZ2VyLCBvbkNvbXBsZXRlQWxsLCBvbkNvbXBsZXRlQWxsUGFyYW1zLCBvbkNvbXBsZXRlQWxsU2NvcGUpO1xuXHRcdH07XG5cdFx0XG5cdFx0VHdlZW5NYXguc3RhZ2dlckZyb21UbyA9IFR3ZWVuTWF4LmFsbEZyb21UbyA9IGZ1bmN0aW9uKHRhcmdldHMsIGR1cmF0aW9uLCBmcm9tVmFycywgdG9WYXJzLCBzdGFnZ2VyLCBvbkNvbXBsZXRlQWxsLCBvbkNvbXBsZXRlQWxsUGFyYW1zLCBvbkNvbXBsZXRlQWxsU2NvcGUpIHtcblx0XHRcdHRvVmFycy5zdGFydEF0ID0gZnJvbVZhcnM7XG5cdFx0XHR0b1ZhcnMuaW1tZWRpYXRlUmVuZGVyID0gKHRvVmFycy5pbW1lZGlhdGVSZW5kZXIgIT0gZmFsc2UgJiYgZnJvbVZhcnMuaW1tZWRpYXRlUmVuZGVyICE9IGZhbHNlKTtcblx0XHRcdHJldHVybiBUd2Vlbk1heC5zdGFnZ2VyVG8odGFyZ2V0cywgZHVyYXRpb24sIHRvVmFycywgc3RhZ2dlciwgb25Db21wbGV0ZUFsbCwgb25Db21wbGV0ZUFsbFBhcmFtcywgb25Db21wbGV0ZUFsbFNjb3BlKTtcblx0XHR9O1xuXHRcdFx0XHRcblx0XHRUd2Vlbk1heC5kZWxheWVkQ2FsbCA9IGZ1bmN0aW9uKGRlbGF5LCBjYWxsYmFjaywgcGFyYW1zLCBzY29wZSwgdXNlRnJhbWVzKSB7XG5cdFx0XHRyZXR1cm4gbmV3IFR3ZWVuTWF4KGNhbGxiYWNrLCAwLCB7ZGVsYXk6ZGVsYXksIG9uQ29tcGxldGU6Y2FsbGJhY2ssIG9uQ29tcGxldGVQYXJhbXM6cGFyYW1zLCBjYWxsYmFja1Njb3BlOnNjb3BlLCBvblJldmVyc2VDb21wbGV0ZTpjYWxsYmFjaywgb25SZXZlcnNlQ29tcGxldGVQYXJhbXM6cGFyYW1zLCBpbW1lZGlhdGVSZW5kZXI6ZmFsc2UsIHVzZUZyYW1lczp1c2VGcmFtZXMsIG92ZXJ3cml0ZTowfSk7XG5cdFx0fTtcblx0XHRcblx0XHRUd2Vlbk1heC5zZXQgPSBmdW5jdGlvbih0YXJnZXQsIHZhcnMpIHtcblx0XHRcdHJldHVybiBuZXcgVHdlZW5NYXgodGFyZ2V0LCAwLCB2YXJzKTtcblx0XHR9O1xuXHRcdFxuXHRcdFR3ZWVuTWF4LmlzVHdlZW5pbmcgPSBmdW5jdGlvbih0YXJnZXQpIHtcblx0XHRcdHJldHVybiAoVHdlZW5MaXRlLmdldFR3ZWVuc09mKHRhcmdldCwgdHJ1ZSkubGVuZ3RoID4gMCk7XG5cdFx0fTtcblx0XHRcblx0XHR2YXIgX2dldENoaWxkcmVuT2YgPSBmdW5jdGlvbih0aW1lbGluZSwgaW5jbHVkZVRpbWVsaW5lcykge1xuXHRcdFx0XHR2YXIgYSA9IFtdLFxuXHRcdFx0XHRcdGNudCA9IDAsXG5cdFx0XHRcdFx0dHdlZW4gPSB0aW1lbGluZS5fZmlyc3Q7XG5cdFx0XHRcdHdoaWxlICh0d2Vlbikge1xuXHRcdFx0XHRcdGlmICh0d2VlbiBpbnN0YW5jZW9mIFR3ZWVuTGl0ZSkge1xuXHRcdFx0XHRcdFx0YVtjbnQrK10gPSB0d2Vlbjtcblx0XHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdFx0aWYgKGluY2x1ZGVUaW1lbGluZXMpIHtcblx0XHRcdFx0XHRcdFx0YVtjbnQrK10gPSB0d2Vlbjtcblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdGEgPSBhLmNvbmNhdChfZ2V0Q2hpbGRyZW5PZih0d2VlbiwgaW5jbHVkZVRpbWVsaW5lcykpO1xuXHRcdFx0XHRcdFx0Y250ID0gYS5sZW5ndGg7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdHR3ZWVuID0gdHdlZW4uX25leHQ7XG5cdFx0XHRcdH1cblx0XHRcdFx0cmV0dXJuIGE7XG5cdFx0XHR9LCBcblx0XHRcdGdldEFsbFR3ZWVucyA9IFR3ZWVuTWF4LmdldEFsbFR3ZWVucyA9IGZ1bmN0aW9uKGluY2x1ZGVUaW1lbGluZXMpIHtcblx0XHRcdFx0cmV0dXJuIF9nZXRDaGlsZHJlbk9mKEFuaW1hdGlvbi5fcm9vdFRpbWVsaW5lLCBpbmNsdWRlVGltZWxpbmVzKS5jb25jYXQoIF9nZXRDaGlsZHJlbk9mKEFuaW1hdGlvbi5fcm9vdEZyYW1lc1RpbWVsaW5lLCBpbmNsdWRlVGltZWxpbmVzKSApO1xuXHRcdFx0fTtcblx0XHRcblx0XHRUd2Vlbk1heC5raWxsQWxsID0gZnVuY3Rpb24oY29tcGxldGUsIHR3ZWVucywgZGVsYXllZENhbGxzLCB0aW1lbGluZXMpIHtcblx0XHRcdGlmICh0d2VlbnMgPT0gbnVsbCkge1xuXHRcdFx0XHR0d2VlbnMgPSB0cnVlO1xuXHRcdFx0fVxuXHRcdFx0aWYgKGRlbGF5ZWRDYWxscyA9PSBudWxsKSB7XG5cdFx0XHRcdGRlbGF5ZWRDYWxscyA9IHRydWU7XG5cdFx0XHR9XG5cdFx0XHR2YXIgYSA9IGdldEFsbFR3ZWVucygodGltZWxpbmVzICE9IGZhbHNlKSksXG5cdFx0XHRcdGwgPSBhLmxlbmd0aCxcblx0XHRcdFx0YWxsVHJ1ZSA9ICh0d2VlbnMgJiYgZGVsYXllZENhbGxzICYmIHRpbWVsaW5lcyksXG5cdFx0XHRcdGlzREMsIHR3ZWVuLCBpO1xuXHRcdFx0Zm9yIChpID0gMDsgaSA8IGw7IGkrKykge1xuXHRcdFx0XHR0d2VlbiA9IGFbaV07XG5cdFx0XHRcdGlmIChhbGxUcnVlIHx8ICh0d2VlbiBpbnN0YW5jZW9mIFNpbXBsZVRpbWVsaW5lKSB8fCAoKGlzREMgPSAodHdlZW4udGFyZ2V0ID09PSB0d2Vlbi52YXJzLm9uQ29tcGxldGUpKSAmJiBkZWxheWVkQ2FsbHMpIHx8ICh0d2VlbnMgJiYgIWlzREMpKSB7XG5cdFx0XHRcdFx0aWYgKGNvbXBsZXRlKSB7XG5cdFx0XHRcdFx0XHR0d2Vlbi50b3RhbFRpbWUodHdlZW4uX3JldmVyc2VkID8gMCA6IHR3ZWVuLnRvdGFsRHVyYXRpb24oKSk7XG5cdFx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRcdHR3ZWVuLl9lbmFibGVkKGZhbHNlLCBmYWxzZSk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fTtcblx0XHRcblx0XHRUd2Vlbk1heC5raWxsQ2hpbGRUd2VlbnNPZiA9IGZ1bmN0aW9uKHBhcmVudCwgY29tcGxldGUpIHtcblx0XHRcdGlmIChwYXJlbnQgPT0gbnVsbCkge1xuXHRcdFx0XHRyZXR1cm47XG5cdFx0XHR9XG5cdFx0XHR2YXIgdGwgPSBUd2VlbkxpdGVJbnRlcm5hbHMudHdlZW5Mb29rdXAsXG5cdFx0XHRcdGEsIGN1clBhcmVudCwgcCwgaSwgbDtcblx0XHRcdGlmICh0eXBlb2YocGFyZW50KSA9PT0gXCJzdHJpbmdcIikge1xuXHRcdFx0XHRwYXJlbnQgPSBUd2VlbkxpdGUuc2VsZWN0b3IocGFyZW50KSB8fCBwYXJlbnQ7XG5cdFx0XHR9XG5cdFx0XHRpZiAoX2lzU2VsZWN0b3IocGFyZW50KSkge1xuXHRcdFx0XHRwYXJlbnQgPSBfc2xpY2UocGFyZW50KTtcblx0XHRcdH1cblx0XHRcdGlmIChfaXNBcnJheShwYXJlbnQpKSB7XG5cdFx0XHRcdGkgPSBwYXJlbnQubGVuZ3RoO1xuXHRcdFx0XHR3aGlsZSAoLS1pID4gLTEpIHtcblx0XHRcdFx0XHRUd2Vlbk1heC5raWxsQ2hpbGRUd2VlbnNPZihwYXJlbnRbaV0sIGNvbXBsZXRlKTtcblx0XHRcdFx0fVxuXHRcdFx0XHRyZXR1cm47XG5cdFx0XHR9XG5cdFx0XHRhID0gW107XG5cdFx0XHRmb3IgKHAgaW4gdGwpIHtcblx0XHRcdFx0Y3VyUGFyZW50ID0gdGxbcF0udGFyZ2V0LnBhcmVudE5vZGU7XG5cdFx0XHRcdHdoaWxlIChjdXJQYXJlbnQpIHtcblx0XHRcdFx0XHRpZiAoY3VyUGFyZW50ID09PSBwYXJlbnQpIHtcblx0XHRcdFx0XHRcdGEgPSBhLmNvbmNhdCh0bFtwXS50d2VlbnMpO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHRjdXJQYXJlbnQgPSBjdXJQYXJlbnQucGFyZW50Tm9kZTtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdFx0bCA9IGEubGVuZ3RoO1xuXHRcdFx0Zm9yIChpID0gMDsgaSA8IGw7IGkrKykge1xuXHRcdFx0XHRpZiAoY29tcGxldGUpIHtcblx0XHRcdFx0XHRhW2ldLnRvdGFsVGltZShhW2ldLnRvdGFsRHVyYXRpb24oKSk7XG5cdFx0XHRcdH1cblx0XHRcdFx0YVtpXS5fZW5hYmxlZChmYWxzZSwgZmFsc2UpO1xuXHRcdFx0fVxuXHRcdH07XG5cblx0XHR2YXIgX2NoYW5nZVBhdXNlID0gZnVuY3Rpb24ocGF1c2UsIHR3ZWVucywgZGVsYXllZENhbGxzLCB0aW1lbGluZXMpIHtcblx0XHRcdHR3ZWVucyA9ICh0d2VlbnMgIT09IGZhbHNlKTtcblx0XHRcdGRlbGF5ZWRDYWxscyA9IChkZWxheWVkQ2FsbHMgIT09IGZhbHNlKTtcblx0XHRcdHRpbWVsaW5lcyA9ICh0aW1lbGluZXMgIT09IGZhbHNlKTtcblx0XHRcdHZhciBhID0gZ2V0QWxsVHdlZW5zKHRpbWVsaW5lcyksXG5cdFx0XHRcdGFsbFRydWUgPSAodHdlZW5zICYmIGRlbGF5ZWRDYWxscyAmJiB0aW1lbGluZXMpLFxuXHRcdFx0XHRpID0gYS5sZW5ndGgsXG5cdFx0XHRcdGlzREMsIHR3ZWVuO1xuXHRcdFx0d2hpbGUgKC0taSA+IC0xKSB7XG5cdFx0XHRcdHR3ZWVuID0gYVtpXTtcblx0XHRcdFx0aWYgKGFsbFRydWUgfHwgKHR3ZWVuIGluc3RhbmNlb2YgU2ltcGxlVGltZWxpbmUpIHx8ICgoaXNEQyA9ICh0d2Vlbi50YXJnZXQgPT09IHR3ZWVuLnZhcnMub25Db21wbGV0ZSkpICYmIGRlbGF5ZWRDYWxscykgfHwgKHR3ZWVucyAmJiAhaXNEQykpIHtcblx0XHRcdFx0XHR0d2Vlbi5wYXVzZWQocGF1c2UpO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fTtcblx0XHRcblx0XHRUd2Vlbk1heC5wYXVzZUFsbCA9IGZ1bmN0aW9uKHR3ZWVucywgZGVsYXllZENhbGxzLCB0aW1lbGluZXMpIHtcblx0XHRcdF9jaGFuZ2VQYXVzZSh0cnVlLCB0d2VlbnMsIGRlbGF5ZWRDYWxscywgdGltZWxpbmVzKTtcblx0XHR9O1xuXHRcdFxuXHRcdFR3ZWVuTWF4LnJlc3VtZUFsbCA9IGZ1bmN0aW9uKHR3ZWVucywgZGVsYXllZENhbGxzLCB0aW1lbGluZXMpIHtcblx0XHRcdF9jaGFuZ2VQYXVzZShmYWxzZSwgdHdlZW5zLCBkZWxheWVkQ2FsbHMsIHRpbWVsaW5lcyk7XG5cdFx0fTtcblxuXHRcdFR3ZWVuTWF4Lmdsb2JhbFRpbWVTY2FsZSA9IGZ1bmN0aW9uKHZhbHVlKSB7XG5cdFx0XHR2YXIgdGwgPSBBbmltYXRpb24uX3Jvb3RUaW1lbGluZSxcblx0XHRcdFx0dCA9IFR3ZWVuTGl0ZS50aWNrZXIudGltZTtcblx0XHRcdGlmICghYXJndW1lbnRzLmxlbmd0aCkge1xuXHRcdFx0XHRyZXR1cm4gdGwuX3RpbWVTY2FsZTtcblx0XHRcdH1cblx0XHRcdHZhbHVlID0gdmFsdWUgfHwgX3RpbnlOdW07IC8vY2FuJ3QgYWxsb3cgemVybyBiZWNhdXNlIGl0J2xsIHRocm93IHRoZSBtYXRoIG9mZlxuXHRcdFx0dGwuX3N0YXJ0VGltZSA9IHQgLSAoKHQgLSB0bC5fc3RhcnRUaW1lKSAqIHRsLl90aW1lU2NhbGUgLyB2YWx1ZSk7XG5cdFx0XHR0bCA9IEFuaW1hdGlvbi5fcm9vdEZyYW1lc1RpbWVsaW5lO1xuXHRcdFx0dCA9IFR3ZWVuTGl0ZS50aWNrZXIuZnJhbWU7XG5cdFx0XHR0bC5fc3RhcnRUaW1lID0gdCAtICgodCAtIHRsLl9zdGFydFRpbWUpICogdGwuX3RpbWVTY2FsZSAvIHZhbHVlKTtcblx0XHRcdHRsLl90aW1lU2NhbGUgPSBBbmltYXRpb24uX3Jvb3RUaW1lbGluZS5fdGltZVNjYWxlID0gdmFsdWU7XG5cdFx0XHRyZXR1cm4gdmFsdWU7XG5cdFx0fTtcblx0XHRcblx0XG4vLy0tLS0gR0VUVEVSUyAvIFNFVFRFUlMgLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXHRcdFxuXHRcdHAucHJvZ3Jlc3MgPSBmdW5jdGlvbih2YWx1ZSkge1xuXHRcdFx0cmV0dXJuICghYXJndW1lbnRzLmxlbmd0aCkgPyB0aGlzLl90aW1lIC8gdGhpcy5kdXJhdGlvbigpIDogdGhpcy50b3RhbFRpbWUoIHRoaXMuZHVyYXRpb24oKSAqICgodGhpcy5feW95byAmJiAodGhpcy5fY3ljbGUgJiAxKSAhPT0gMCkgPyAxIC0gdmFsdWUgOiB2YWx1ZSkgKyAodGhpcy5fY3ljbGUgKiAodGhpcy5fZHVyYXRpb24gKyB0aGlzLl9yZXBlYXREZWxheSkpLCBmYWxzZSk7XG5cdFx0fTtcblx0XHRcblx0XHRwLnRvdGFsUHJvZ3Jlc3MgPSBmdW5jdGlvbih2YWx1ZSkge1xuXHRcdFx0cmV0dXJuICghYXJndW1lbnRzLmxlbmd0aCkgPyB0aGlzLl90b3RhbFRpbWUgLyB0aGlzLnRvdGFsRHVyYXRpb24oKSA6IHRoaXMudG90YWxUaW1lKCB0aGlzLnRvdGFsRHVyYXRpb24oKSAqIHZhbHVlLCBmYWxzZSk7XG5cdFx0fTtcblx0XHRcblx0XHRwLnRpbWUgPSBmdW5jdGlvbih2YWx1ZSwgc3VwcHJlc3NFdmVudHMpIHtcblx0XHRcdGlmICghYXJndW1lbnRzLmxlbmd0aCkge1xuXHRcdFx0XHRyZXR1cm4gdGhpcy5fdGltZTtcblx0XHRcdH1cblx0XHRcdGlmICh0aGlzLl9kaXJ0eSkge1xuXHRcdFx0XHR0aGlzLnRvdGFsRHVyYXRpb24oKTtcblx0XHRcdH1cblx0XHRcdGlmICh2YWx1ZSA+IHRoaXMuX2R1cmF0aW9uKSB7XG5cdFx0XHRcdHZhbHVlID0gdGhpcy5fZHVyYXRpb247XG5cdFx0XHR9XG5cdFx0XHRpZiAodGhpcy5feW95byAmJiAodGhpcy5fY3ljbGUgJiAxKSAhPT0gMCkge1xuXHRcdFx0XHR2YWx1ZSA9ICh0aGlzLl9kdXJhdGlvbiAtIHZhbHVlKSArICh0aGlzLl9jeWNsZSAqICh0aGlzLl9kdXJhdGlvbiArIHRoaXMuX3JlcGVhdERlbGF5KSk7XG5cdFx0XHR9IGVsc2UgaWYgKHRoaXMuX3JlcGVhdCAhPT0gMCkge1xuXHRcdFx0XHR2YWx1ZSArPSB0aGlzLl9jeWNsZSAqICh0aGlzLl9kdXJhdGlvbiArIHRoaXMuX3JlcGVhdERlbGF5KTtcblx0XHRcdH1cblx0XHRcdHJldHVybiB0aGlzLnRvdGFsVGltZSh2YWx1ZSwgc3VwcHJlc3NFdmVudHMpO1xuXHRcdH07XG5cblx0XHRwLmR1cmF0aW9uID0gZnVuY3Rpb24odmFsdWUpIHtcblx0XHRcdGlmICghYXJndW1lbnRzLmxlbmd0aCkge1xuXHRcdFx0XHRyZXR1cm4gdGhpcy5fZHVyYXRpb247IC8vZG9uJ3Qgc2V0IF9kaXJ0eSA9IGZhbHNlIGJlY2F1c2UgdGhlcmUgY291bGQgYmUgcmVwZWF0cyB0aGF0IGhhdmVuJ3QgYmVlbiBmYWN0b3JlZCBpbnRvIHRoZSBfdG90YWxEdXJhdGlvbiB5ZXQuIE90aGVyd2lzZSwgaWYgeW91IGNyZWF0ZSBhIHJlcGVhdGVkIFR3ZWVuTWF4IGFuZCB0aGVuIGltbWVkaWF0ZWx5IGNoZWNrIGl0cyBkdXJhdGlvbigpLCBpdCB3b3VsZCBjYWNoZSB0aGUgdmFsdWUgYW5kIHRoZSB0b3RhbER1cmF0aW9uIHdvdWxkIG5vdCBiZSBjb3JyZWN0LCB0aHVzIHJlcGVhdHMgd291bGRuJ3QgdGFrZSBlZmZlY3QuXG5cdFx0XHR9XG5cdFx0XHRyZXR1cm4gQW5pbWF0aW9uLnByb3RvdHlwZS5kdXJhdGlvbi5jYWxsKHRoaXMsIHZhbHVlKTtcblx0XHR9O1xuXG5cdFx0cC50b3RhbER1cmF0aW9uID0gZnVuY3Rpb24odmFsdWUpIHtcblx0XHRcdGlmICghYXJndW1lbnRzLmxlbmd0aCkge1xuXHRcdFx0XHRpZiAodGhpcy5fZGlydHkpIHtcblx0XHRcdFx0XHQvL2luc3RlYWQgb2YgSW5maW5pdHksIHdlIHVzZSA5OTk5OTk5OTk5OTkgc28gdGhhdCB3ZSBjYW4gYWNjb21tb2RhdGUgcmV2ZXJzZXNcblx0XHRcdFx0XHR0aGlzLl90b3RhbER1cmF0aW9uID0gKHRoaXMuX3JlcGVhdCA9PT0gLTEpID8gOTk5OTk5OTk5OTk5IDogdGhpcy5fZHVyYXRpb24gKiAodGhpcy5fcmVwZWF0ICsgMSkgKyAodGhpcy5fcmVwZWF0RGVsYXkgKiB0aGlzLl9yZXBlYXQpO1xuXHRcdFx0XHRcdHRoaXMuX2RpcnR5ID0gZmFsc2U7XG5cdFx0XHRcdH1cblx0XHRcdFx0cmV0dXJuIHRoaXMuX3RvdGFsRHVyYXRpb247XG5cdFx0XHR9XG5cdFx0XHRyZXR1cm4gKHRoaXMuX3JlcGVhdCA9PT0gLTEpID8gdGhpcyA6IHRoaXMuZHVyYXRpb24oICh2YWx1ZSAtICh0aGlzLl9yZXBlYXQgKiB0aGlzLl9yZXBlYXREZWxheSkpIC8gKHRoaXMuX3JlcGVhdCArIDEpICk7XG5cdFx0fTtcblx0XHRcblx0XHRwLnJlcGVhdCA9IGZ1bmN0aW9uKHZhbHVlKSB7XG5cdFx0XHRpZiAoIWFyZ3VtZW50cy5sZW5ndGgpIHtcblx0XHRcdFx0cmV0dXJuIHRoaXMuX3JlcGVhdDtcblx0XHRcdH1cblx0XHRcdHRoaXMuX3JlcGVhdCA9IHZhbHVlO1xuXHRcdFx0cmV0dXJuIHRoaXMuX3VuY2FjaGUodHJ1ZSk7XG5cdFx0fTtcblx0XHRcblx0XHRwLnJlcGVhdERlbGF5ID0gZnVuY3Rpb24odmFsdWUpIHtcblx0XHRcdGlmICghYXJndW1lbnRzLmxlbmd0aCkge1xuXHRcdFx0XHRyZXR1cm4gdGhpcy5fcmVwZWF0RGVsYXk7XG5cdFx0XHR9XG5cdFx0XHR0aGlzLl9yZXBlYXREZWxheSA9IHZhbHVlO1xuXHRcdFx0cmV0dXJuIHRoaXMuX3VuY2FjaGUodHJ1ZSk7XG5cdFx0fTtcblx0XHRcblx0XHRwLnlveW8gPSBmdW5jdGlvbih2YWx1ZSkge1xuXHRcdFx0aWYgKCFhcmd1bWVudHMubGVuZ3RoKSB7XG5cdFx0XHRcdHJldHVybiB0aGlzLl95b3lvO1xuXHRcdFx0fVxuXHRcdFx0dGhpcy5feW95byA9IHZhbHVlO1xuXHRcdFx0cmV0dXJuIHRoaXM7XG5cdFx0fTtcblx0XHRcblx0XHRcblx0XHRyZXR1cm4gVHdlZW5NYXg7XG5cdFx0XG5cdH0sIHRydWUpO1xuXG5cblxuXG5cblxuXG5cbi8qXG4gKiAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gKiBUaW1lbGluZUxpdGVcbiAqIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAqL1xuXHRfZ3NTY29wZS5fZ3NEZWZpbmUoXCJUaW1lbGluZUxpdGVcIiwgW1wiY29yZS5BbmltYXRpb25cIixcImNvcmUuU2ltcGxlVGltZWxpbmVcIixcIlR3ZWVuTGl0ZVwiXSwgZnVuY3Rpb24oQW5pbWF0aW9uLCBTaW1wbGVUaW1lbGluZSwgVHdlZW5MaXRlKSB7XG5cblx0XHR2YXIgVGltZWxpbmVMaXRlID0gZnVuY3Rpb24odmFycykge1xuXHRcdFx0XHRTaW1wbGVUaW1lbGluZS5jYWxsKHRoaXMsIHZhcnMpO1xuXHRcdFx0XHR0aGlzLl9sYWJlbHMgPSB7fTtcblx0XHRcdFx0dGhpcy5hdXRvUmVtb3ZlQ2hpbGRyZW4gPSAodGhpcy52YXJzLmF1dG9SZW1vdmVDaGlsZHJlbiA9PT0gdHJ1ZSk7XG5cdFx0XHRcdHRoaXMuc21vb3RoQ2hpbGRUaW1pbmcgPSAodGhpcy52YXJzLnNtb290aENoaWxkVGltaW5nID09PSB0cnVlKTtcblx0XHRcdFx0dGhpcy5fc29ydENoaWxkcmVuID0gdHJ1ZTtcblx0XHRcdFx0dGhpcy5fb25VcGRhdGUgPSB0aGlzLnZhcnMub25VcGRhdGU7XG5cdFx0XHRcdHZhciB2ID0gdGhpcy52YXJzLFxuXHRcdFx0XHRcdHZhbCwgcDtcblx0XHRcdFx0Zm9yIChwIGluIHYpIHtcblx0XHRcdFx0XHR2YWwgPSB2W3BdO1xuXHRcdFx0XHRcdGlmIChfaXNBcnJheSh2YWwpKSBpZiAodmFsLmpvaW4oXCJcIikuaW5kZXhPZihcIntzZWxmfVwiKSAhPT0gLTEpIHtcblx0XHRcdFx0XHRcdHZbcF0gPSB0aGlzLl9zd2FwU2VsZkluUGFyYW1zKHZhbCk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cdFx0XHRcdGlmIChfaXNBcnJheSh2LnR3ZWVucykpIHtcblx0XHRcdFx0XHR0aGlzLmFkZCh2LnR3ZWVucywgMCwgdi5hbGlnbiwgdi5zdGFnZ2VyKTtcblx0XHRcdFx0fVxuXHRcdFx0fSxcblx0XHRcdF90aW55TnVtID0gMC4wMDAwMDAwMDAxLFxuXHRcdFx0VHdlZW5MaXRlSW50ZXJuYWxzID0gVHdlZW5MaXRlLl9pbnRlcm5hbHMsXG5cdFx0XHRfaW50ZXJuYWxzID0gVGltZWxpbmVMaXRlLl9pbnRlcm5hbHMgPSB7fSxcblx0XHRcdF9pc1NlbGVjdG9yID0gVHdlZW5MaXRlSW50ZXJuYWxzLmlzU2VsZWN0b3IsXG5cdFx0XHRfaXNBcnJheSA9IFR3ZWVuTGl0ZUludGVybmFscy5pc0FycmF5LFxuXHRcdFx0X2xhenlUd2VlbnMgPSBUd2VlbkxpdGVJbnRlcm5hbHMubGF6eVR3ZWVucyxcblx0XHRcdF9sYXp5UmVuZGVyID0gVHdlZW5MaXRlSW50ZXJuYWxzLmxhenlSZW5kZXIsXG5cdFx0XHRfZ2xvYmFscyA9IF9nc1Njb3BlLl9nc0RlZmluZS5nbG9iYWxzLFxuXHRcdFx0X2NvcHkgPSBmdW5jdGlvbih2YXJzKSB7XG5cdFx0XHRcdHZhciBjb3B5ID0ge30sIHA7XG5cdFx0XHRcdGZvciAocCBpbiB2YXJzKSB7XG5cdFx0XHRcdFx0Y29weVtwXSA9IHZhcnNbcF07XG5cdFx0XHRcdH1cblx0XHRcdFx0cmV0dXJuIGNvcHk7XG5cdFx0XHR9LFxuXHRcdFx0X2FwcGx5Q3ljbGUgPSBmdW5jdGlvbih2YXJzLCB0YXJnZXRzLCBpKSB7XG5cdFx0XHRcdHZhciBhbHQgPSB2YXJzLmN5Y2xlLFxuXHRcdFx0XHRcdHAsIHZhbDtcblx0XHRcdFx0Zm9yIChwIGluIGFsdCkge1xuXHRcdFx0XHRcdHZhbCA9IGFsdFtwXTtcblx0XHRcdFx0XHR2YXJzW3BdID0gKHR5cGVvZih2YWwpID09PSBcImZ1bmN0aW9uXCIpID8gdmFsLmNhbGwodGFyZ2V0c1tpXSwgaSkgOiB2YWxbaSAlIHZhbC5sZW5ndGhdO1xuXHRcdFx0XHR9XG5cdFx0XHRcdGRlbGV0ZSB2YXJzLmN5Y2xlO1xuXHRcdFx0fSxcblx0XHRcdF9wYXVzZUNhbGxiYWNrID0gX2ludGVybmFscy5wYXVzZUNhbGxiYWNrID0gZnVuY3Rpb24oKSB7fSxcblx0XHRcdF9zbGljZSA9IGZ1bmN0aW9uKGEpIHsgLy9kb24ndCB1c2UgW10uc2xpY2UgYmVjYXVzZSB0aGF0IGRvZXNuJ3Qgd29yayBpbiBJRTggd2l0aCBhIE5vZGVMaXN0IHRoYXQncyByZXR1cm5lZCBieSBxdWVyeVNlbGVjdG9yQWxsKClcblx0XHRcdFx0dmFyIGIgPSBbXSxcblx0XHRcdFx0XHRsID0gYS5sZW5ndGgsXG5cdFx0XHRcdFx0aTtcblx0XHRcdFx0Zm9yIChpID0gMDsgaSAhPT0gbDsgYi5wdXNoKGFbaSsrXSkpO1xuXHRcdFx0XHRyZXR1cm4gYjtcblx0XHRcdH0sXG5cdFx0XHRwID0gVGltZWxpbmVMaXRlLnByb3RvdHlwZSA9IG5ldyBTaW1wbGVUaW1lbGluZSgpO1xuXG5cdFx0VGltZWxpbmVMaXRlLnZlcnNpb24gPSBcIjEuMTguMlwiO1xuXHRcdHAuY29uc3RydWN0b3IgPSBUaW1lbGluZUxpdGU7XG5cdFx0cC5raWxsKCkuX2djID0gcC5fZm9yY2luZ1BsYXloZWFkID0gcC5faGFzUGF1c2UgPSBmYWxzZTtcblxuXHRcdC8qIG1pZ2h0IHVzZSBsYXRlci4uLlxuXHRcdC8vdHJhbnNsYXRlcyBhIGxvY2FsIHRpbWUgaW5zaWRlIGFuIGFuaW1hdGlvbiB0byB0aGUgY29ycmVzcG9uZGluZyB0aW1lIG9uIHRoZSByb290L2dsb2JhbCB0aW1lbGluZSwgZmFjdG9yaW5nIGluIGFsbCBuZXN0aW5nIGFuZCB0aW1lU2NhbGVzLlxuXHRcdGZ1bmN0aW9uIGxvY2FsVG9HbG9iYWwodGltZSwgYW5pbWF0aW9uKSB7XG5cdFx0XHR3aGlsZSAoYW5pbWF0aW9uKSB7XG5cdFx0XHRcdHRpbWUgPSAodGltZSAvIGFuaW1hdGlvbi5fdGltZVNjYWxlKSArIGFuaW1hdGlvbi5fc3RhcnRUaW1lO1xuXHRcdFx0XHRhbmltYXRpb24gPSBhbmltYXRpb24udGltZWxpbmU7XG5cdFx0XHR9XG5cdFx0XHRyZXR1cm4gdGltZTtcblx0XHR9XG5cblx0XHQvL3RyYW5zbGF0ZXMgdGhlIHN1cHBsaWVkIHRpbWUgb24gdGhlIHJvb3QvZ2xvYmFsIHRpbWVsaW5lIGludG8gdGhlIGNvcnJlc3BvbmRpbmcgbG9jYWwgdGltZSBpbnNpZGUgYSBwYXJ0aWN1bGFyIGFuaW1hdGlvbiwgZmFjdG9yaW5nIGluIGFsbCBuZXN0aW5nIGFuZCB0aW1lU2NhbGVzXG5cdFx0ZnVuY3Rpb24gZ2xvYmFsVG9Mb2NhbCh0aW1lLCBhbmltYXRpb24pIHtcblx0XHRcdHZhciBzY2FsZSA9IDE7XG5cdFx0XHR0aW1lIC09IGxvY2FsVG9HbG9iYWwoMCwgYW5pbWF0aW9uKTtcblx0XHRcdHdoaWxlIChhbmltYXRpb24pIHtcblx0XHRcdFx0c2NhbGUgKj0gYW5pbWF0aW9uLl90aW1lU2NhbGU7XG5cdFx0XHRcdGFuaW1hdGlvbiA9IGFuaW1hdGlvbi50aW1lbGluZTtcblx0XHRcdH1cblx0XHRcdHJldHVybiB0aW1lICogc2NhbGU7XG5cdFx0fVxuXHRcdCovXG5cblx0XHRwLnRvID0gZnVuY3Rpb24odGFyZ2V0LCBkdXJhdGlvbiwgdmFycywgcG9zaXRpb24pIHtcblx0XHRcdHZhciBFbmdpbmUgPSAodmFycy5yZXBlYXQgJiYgX2dsb2JhbHMuVHdlZW5NYXgpIHx8IFR3ZWVuTGl0ZTtcblx0XHRcdHJldHVybiBkdXJhdGlvbiA/IHRoaXMuYWRkKCBuZXcgRW5naW5lKHRhcmdldCwgZHVyYXRpb24sIHZhcnMpLCBwb3NpdGlvbikgOiB0aGlzLnNldCh0YXJnZXQsIHZhcnMsIHBvc2l0aW9uKTtcblx0XHR9O1xuXG5cdFx0cC5mcm9tID0gZnVuY3Rpb24odGFyZ2V0LCBkdXJhdGlvbiwgdmFycywgcG9zaXRpb24pIHtcblx0XHRcdHJldHVybiB0aGlzLmFkZCggKCh2YXJzLnJlcGVhdCAmJiBfZ2xvYmFscy5Ud2Vlbk1heCkgfHwgVHdlZW5MaXRlKS5mcm9tKHRhcmdldCwgZHVyYXRpb24sIHZhcnMpLCBwb3NpdGlvbik7XG5cdFx0fTtcblxuXHRcdHAuZnJvbVRvID0gZnVuY3Rpb24odGFyZ2V0LCBkdXJhdGlvbiwgZnJvbVZhcnMsIHRvVmFycywgcG9zaXRpb24pIHtcblx0XHRcdHZhciBFbmdpbmUgPSAodG9WYXJzLnJlcGVhdCAmJiBfZ2xvYmFscy5Ud2Vlbk1heCkgfHwgVHdlZW5MaXRlO1xuXHRcdFx0cmV0dXJuIGR1cmF0aW9uID8gdGhpcy5hZGQoIEVuZ2luZS5mcm9tVG8odGFyZ2V0LCBkdXJhdGlvbiwgZnJvbVZhcnMsIHRvVmFycyksIHBvc2l0aW9uKSA6IHRoaXMuc2V0KHRhcmdldCwgdG9WYXJzLCBwb3NpdGlvbik7XG5cdFx0fTtcblxuXHRcdHAuc3RhZ2dlclRvID0gZnVuY3Rpb24odGFyZ2V0cywgZHVyYXRpb24sIHZhcnMsIHN0YWdnZXIsIHBvc2l0aW9uLCBvbkNvbXBsZXRlQWxsLCBvbkNvbXBsZXRlQWxsUGFyYW1zLCBvbkNvbXBsZXRlQWxsU2NvcGUpIHtcblx0XHRcdHZhciB0bCA9IG5ldyBUaW1lbGluZUxpdGUoe29uQ29tcGxldGU6b25Db21wbGV0ZUFsbCwgb25Db21wbGV0ZVBhcmFtczpvbkNvbXBsZXRlQWxsUGFyYW1zLCBjYWxsYmFja1Njb3BlOm9uQ29tcGxldGVBbGxTY29wZSwgc21vb3RoQ2hpbGRUaW1pbmc6dGhpcy5zbW9vdGhDaGlsZFRpbWluZ30pLFxuXHRcdFx0XHRjeWNsZSA9IHZhcnMuY3ljbGUsXG5cdFx0XHRcdGNvcHksIGk7XG5cdFx0XHRpZiAodHlwZW9mKHRhcmdldHMpID09PSBcInN0cmluZ1wiKSB7XG5cdFx0XHRcdHRhcmdldHMgPSBUd2VlbkxpdGUuc2VsZWN0b3IodGFyZ2V0cykgfHwgdGFyZ2V0cztcblx0XHRcdH1cblx0XHRcdHRhcmdldHMgPSB0YXJnZXRzIHx8IFtdO1xuXHRcdFx0aWYgKF9pc1NlbGVjdG9yKHRhcmdldHMpKSB7IC8vc2Vuc2VzIGlmIHRoZSB0YXJnZXRzIG9iamVjdCBpcyBhIHNlbGVjdG9yLiBJZiBpdCBpcywgd2Ugc2hvdWxkIHRyYW5zbGF0ZSBpdCBpbnRvIGFuIGFycmF5LlxuXHRcdFx0XHR0YXJnZXRzID0gX3NsaWNlKHRhcmdldHMpO1xuXHRcdFx0fVxuXHRcdFx0c3RhZ2dlciA9IHN0YWdnZXIgfHwgMDtcblx0XHRcdGlmIChzdGFnZ2VyIDwgMCkge1xuXHRcdFx0XHR0YXJnZXRzID0gX3NsaWNlKHRhcmdldHMpO1xuXHRcdFx0XHR0YXJnZXRzLnJldmVyc2UoKTtcblx0XHRcdFx0c3RhZ2dlciAqPSAtMTtcblx0XHRcdH1cblx0XHRcdGZvciAoaSA9IDA7IGkgPCB0YXJnZXRzLmxlbmd0aDsgaSsrKSB7XG5cdFx0XHRcdGNvcHkgPSBfY29weSh2YXJzKTtcblx0XHRcdFx0aWYgKGNvcHkuc3RhcnRBdCkge1xuXHRcdFx0XHRcdGNvcHkuc3RhcnRBdCA9IF9jb3B5KGNvcHkuc3RhcnRBdCk7XG5cdFx0XHRcdFx0aWYgKGNvcHkuc3RhcnRBdC5jeWNsZSkge1xuXHRcdFx0XHRcdFx0X2FwcGx5Q3ljbGUoY29weS5zdGFydEF0LCB0YXJnZXRzLCBpKTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblx0XHRcdFx0aWYgKGN5Y2xlKSB7XG5cdFx0XHRcdFx0X2FwcGx5Q3ljbGUoY29weSwgdGFyZ2V0cywgaSk7XG5cdFx0XHRcdH1cblx0XHRcdFx0dGwudG8odGFyZ2V0c1tpXSwgZHVyYXRpb24sIGNvcHksIGkgKiBzdGFnZ2VyKTtcblx0XHRcdH1cblx0XHRcdHJldHVybiB0aGlzLmFkZCh0bCwgcG9zaXRpb24pO1xuXHRcdH07XG5cblx0XHRwLnN0YWdnZXJGcm9tID0gZnVuY3Rpb24odGFyZ2V0cywgZHVyYXRpb24sIHZhcnMsIHN0YWdnZXIsIHBvc2l0aW9uLCBvbkNvbXBsZXRlQWxsLCBvbkNvbXBsZXRlQWxsUGFyYW1zLCBvbkNvbXBsZXRlQWxsU2NvcGUpIHtcblx0XHRcdHZhcnMuaW1tZWRpYXRlUmVuZGVyID0gKHZhcnMuaW1tZWRpYXRlUmVuZGVyICE9IGZhbHNlKTtcblx0XHRcdHZhcnMucnVuQmFja3dhcmRzID0gdHJ1ZTtcblx0XHRcdHJldHVybiB0aGlzLnN0YWdnZXJUbyh0YXJnZXRzLCBkdXJhdGlvbiwgdmFycywgc3RhZ2dlciwgcG9zaXRpb24sIG9uQ29tcGxldGVBbGwsIG9uQ29tcGxldGVBbGxQYXJhbXMsIG9uQ29tcGxldGVBbGxTY29wZSk7XG5cdFx0fTtcblxuXHRcdHAuc3RhZ2dlckZyb21UbyA9IGZ1bmN0aW9uKHRhcmdldHMsIGR1cmF0aW9uLCBmcm9tVmFycywgdG9WYXJzLCBzdGFnZ2VyLCBwb3NpdGlvbiwgb25Db21wbGV0ZUFsbCwgb25Db21wbGV0ZUFsbFBhcmFtcywgb25Db21wbGV0ZUFsbFNjb3BlKSB7XG5cdFx0XHR0b1ZhcnMuc3RhcnRBdCA9IGZyb21WYXJzO1xuXHRcdFx0dG9WYXJzLmltbWVkaWF0ZVJlbmRlciA9ICh0b1ZhcnMuaW1tZWRpYXRlUmVuZGVyICE9IGZhbHNlICYmIGZyb21WYXJzLmltbWVkaWF0ZVJlbmRlciAhPSBmYWxzZSk7XG5cdFx0XHRyZXR1cm4gdGhpcy5zdGFnZ2VyVG8odGFyZ2V0cywgZHVyYXRpb24sIHRvVmFycywgc3RhZ2dlciwgcG9zaXRpb24sIG9uQ29tcGxldGVBbGwsIG9uQ29tcGxldGVBbGxQYXJhbXMsIG9uQ29tcGxldGVBbGxTY29wZSk7XG5cdFx0fTtcblxuXHRcdHAuY2FsbCA9IGZ1bmN0aW9uKGNhbGxiYWNrLCBwYXJhbXMsIHNjb3BlLCBwb3NpdGlvbikge1xuXHRcdFx0cmV0dXJuIHRoaXMuYWRkKCBUd2VlbkxpdGUuZGVsYXllZENhbGwoMCwgY2FsbGJhY2ssIHBhcmFtcywgc2NvcGUpLCBwb3NpdGlvbik7XG5cdFx0fTtcblxuXHRcdHAuc2V0ID0gZnVuY3Rpb24odGFyZ2V0LCB2YXJzLCBwb3NpdGlvbikge1xuXHRcdFx0cG9zaXRpb24gPSB0aGlzLl9wYXJzZVRpbWVPckxhYmVsKHBvc2l0aW9uLCAwLCB0cnVlKTtcblx0XHRcdGlmICh2YXJzLmltbWVkaWF0ZVJlbmRlciA9PSBudWxsKSB7XG5cdFx0XHRcdHZhcnMuaW1tZWRpYXRlUmVuZGVyID0gKHBvc2l0aW9uID09PSB0aGlzLl90aW1lICYmICF0aGlzLl9wYXVzZWQpO1xuXHRcdFx0fVxuXHRcdFx0cmV0dXJuIHRoaXMuYWRkKCBuZXcgVHdlZW5MaXRlKHRhcmdldCwgMCwgdmFycyksIHBvc2l0aW9uKTtcblx0XHR9O1xuXG5cdFx0VGltZWxpbmVMaXRlLmV4cG9ydFJvb3QgPSBmdW5jdGlvbih2YXJzLCBpZ25vcmVEZWxheWVkQ2FsbHMpIHtcblx0XHRcdHZhcnMgPSB2YXJzIHx8IHt9O1xuXHRcdFx0aWYgKHZhcnMuc21vb3RoQ2hpbGRUaW1pbmcgPT0gbnVsbCkge1xuXHRcdFx0XHR2YXJzLnNtb290aENoaWxkVGltaW5nID0gdHJ1ZTtcblx0XHRcdH1cblx0XHRcdHZhciB0bCA9IG5ldyBUaW1lbGluZUxpdGUodmFycyksXG5cdFx0XHRcdHJvb3QgPSB0bC5fdGltZWxpbmUsXG5cdFx0XHRcdHR3ZWVuLCBuZXh0O1xuXHRcdFx0aWYgKGlnbm9yZURlbGF5ZWRDYWxscyA9PSBudWxsKSB7XG5cdFx0XHRcdGlnbm9yZURlbGF5ZWRDYWxscyA9IHRydWU7XG5cdFx0XHR9XG5cdFx0XHRyb290Ll9yZW1vdmUodGwsIHRydWUpO1xuXHRcdFx0dGwuX3N0YXJ0VGltZSA9IDA7XG5cdFx0XHR0bC5fcmF3UHJldlRpbWUgPSB0bC5fdGltZSA9IHRsLl90b3RhbFRpbWUgPSByb290Ll90aW1lO1xuXHRcdFx0dHdlZW4gPSByb290Ll9maXJzdDtcblx0XHRcdHdoaWxlICh0d2Vlbikge1xuXHRcdFx0XHRuZXh0ID0gdHdlZW4uX25leHQ7XG5cdFx0XHRcdGlmICghaWdub3JlRGVsYXllZENhbGxzIHx8ICEodHdlZW4gaW5zdGFuY2VvZiBUd2VlbkxpdGUgJiYgdHdlZW4udGFyZ2V0ID09PSB0d2Vlbi52YXJzLm9uQ29tcGxldGUpKSB7XG5cdFx0XHRcdFx0dGwuYWRkKHR3ZWVuLCB0d2Vlbi5fc3RhcnRUaW1lIC0gdHdlZW4uX2RlbGF5KTtcblx0XHRcdFx0fVxuXHRcdFx0XHR0d2VlbiA9IG5leHQ7XG5cdFx0XHR9XG5cdFx0XHRyb290LmFkZCh0bCwgMCk7XG5cdFx0XHRyZXR1cm4gdGw7XG5cdFx0fTtcblxuXHRcdHAuYWRkID0gZnVuY3Rpb24odmFsdWUsIHBvc2l0aW9uLCBhbGlnbiwgc3RhZ2dlcikge1xuXHRcdFx0dmFyIGN1clRpbWUsIGwsIGksIGNoaWxkLCB0bCwgYmVmb3JlUmF3VGltZTtcblx0XHRcdGlmICh0eXBlb2YocG9zaXRpb24pICE9PSBcIm51bWJlclwiKSB7XG5cdFx0XHRcdHBvc2l0aW9uID0gdGhpcy5fcGFyc2VUaW1lT3JMYWJlbChwb3NpdGlvbiwgMCwgdHJ1ZSwgdmFsdWUpO1xuXHRcdFx0fVxuXHRcdFx0aWYgKCEodmFsdWUgaW5zdGFuY2VvZiBBbmltYXRpb24pKSB7XG5cdFx0XHRcdGlmICgodmFsdWUgaW5zdGFuY2VvZiBBcnJheSkgfHwgKHZhbHVlICYmIHZhbHVlLnB1c2ggJiYgX2lzQXJyYXkodmFsdWUpKSkge1xuXHRcdFx0XHRcdGFsaWduID0gYWxpZ24gfHwgXCJub3JtYWxcIjtcblx0XHRcdFx0XHRzdGFnZ2VyID0gc3RhZ2dlciB8fCAwO1xuXHRcdFx0XHRcdGN1clRpbWUgPSBwb3NpdGlvbjtcblx0XHRcdFx0XHRsID0gdmFsdWUubGVuZ3RoO1xuXHRcdFx0XHRcdGZvciAoaSA9IDA7IGkgPCBsOyBpKyspIHtcblx0XHRcdFx0XHRcdGlmIChfaXNBcnJheShjaGlsZCA9IHZhbHVlW2ldKSkge1xuXHRcdFx0XHRcdFx0XHRjaGlsZCA9IG5ldyBUaW1lbGluZUxpdGUoe3R3ZWVuczpjaGlsZH0pO1xuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0dGhpcy5hZGQoY2hpbGQsIGN1clRpbWUpO1xuXHRcdFx0XHRcdFx0aWYgKHR5cGVvZihjaGlsZCkgIT09IFwic3RyaW5nXCIgJiYgdHlwZW9mKGNoaWxkKSAhPT0gXCJmdW5jdGlvblwiKSB7XG5cdFx0XHRcdFx0XHRcdGlmIChhbGlnbiA9PT0gXCJzZXF1ZW5jZVwiKSB7XG5cdFx0XHRcdFx0XHRcdFx0Y3VyVGltZSA9IGNoaWxkLl9zdGFydFRpbWUgKyAoY2hpbGQudG90YWxEdXJhdGlvbigpIC8gY2hpbGQuX3RpbWVTY2FsZSk7XG5cdFx0XHRcdFx0XHRcdH0gZWxzZSBpZiAoYWxpZ24gPT09IFwic3RhcnRcIikge1xuXHRcdFx0XHRcdFx0XHRcdGNoaWxkLl9zdGFydFRpbWUgLT0gY2hpbGQuZGVsYXkoKTtcblx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0Y3VyVGltZSArPSBzdGFnZ2VyO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHRyZXR1cm4gdGhpcy5fdW5jYWNoZSh0cnVlKTtcblx0XHRcdFx0fSBlbHNlIGlmICh0eXBlb2YodmFsdWUpID09PSBcInN0cmluZ1wiKSB7XG5cdFx0XHRcdFx0cmV0dXJuIHRoaXMuYWRkTGFiZWwodmFsdWUsIHBvc2l0aW9uKTtcblx0XHRcdFx0fSBlbHNlIGlmICh0eXBlb2YodmFsdWUpID09PSBcImZ1bmN0aW9uXCIpIHtcblx0XHRcdFx0XHR2YWx1ZSA9IFR3ZWVuTGl0ZS5kZWxheWVkQ2FsbCgwLCB2YWx1ZSk7XG5cdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0dGhyb3coXCJDYW5ub3QgYWRkIFwiICsgdmFsdWUgKyBcIiBpbnRvIHRoZSB0aW1lbGluZTsgaXQgaXMgbm90IGEgdHdlZW4sIHRpbWVsaW5lLCBmdW5jdGlvbiwgb3Igc3RyaW5nLlwiKTtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXG5cdFx0XHRTaW1wbGVUaW1lbGluZS5wcm90b3R5cGUuYWRkLmNhbGwodGhpcywgdmFsdWUsIHBvc2l0aW9uKTtcblxuXHRcdFx0Ly9pZiB0aGUgdGltZWxpbmUgaGFzIGFscmVhZHkgZW5kZWQgYnV0IHRoZSBpbnNlcnRlZCB0d2Vlbi90aW1lbGluZSBleHRlbmRzIHRoZSBkdXJhdGlvbiwgd2Ugc2hvdWxkIGVuYWJsZSB0aGlzIHRpbWVsaW5lIGFnYWluIHNvIHRoYXQgaXQgcmVuZGVycyBwcm9wZXJseS4gV2Ugc2hvdWxkIGFsc28gYWxpZ24gdGhlIHBsYXloZWFkIHdpdGggdGhlIHBhcmVudCB0aW1lbGluZSdzIHdoZW4gYXBwcm9wcmlhdGUuXG5cdFx0XHRpZiAodGhpcy5fZ2MgfHwgdGhpcy5fdGltZSA9PT0gdGhpcy5fZHVyYXRpb24pIGlmICghdGhpcy5fcGF1c2VkKSBpZiAodGhpcy5fZHVyYXRpb24gPCB0aGlzLmR1cmF0aW9uKCkpIHtcblx0XHRcdFx0Ly9pbiBjYXNlIGFueSBvZiB0aGUgYW5jZXN0b3JzIGhhZCBjb21wbGV0ZWQgYnV0IHNob3VsZCBub3cgYmUgZW5hYmxlZC4uLlxuXHRcdFx0XHR0bCA9IHRoaXM7XG5cdFx0XHRcdGJlZm9yZVJhd1RpbWUgPSAodGwucmF3VGltZSgpID4gdmFsdWUuX3N0YXJ0VGltZSk7IC8vaWYgdGhlIHR3ZWVuIGlzIHBsYWNlZCBvbiB0aGUgdGltZWxpbmUgc28gdGhhdCBpdCBzdGFydHMgQkVGT1JFIHRoZSBjdXJyZW50IHJhd1RpbWUsIHdlIHNob3VsZCBhbGlnbiB0aGUgcGxheWhlYWQgKG1vdmUgdGhlIHRpbWVsaW5lKS4gVGhpcyBpcyBiZWNhdXNlIHNvbWV0aW1lcyB1c2VycyB3aWxsIGNyZWF0ZSBhIHRpbWVsaW5lLCBsZXQgaXQgZmluaXNoLCBhbmQgbXVjaCBsYXRlciBhcHBlbmQgYSB0d2VlbiBhbmQgZXhwZWN0IGl0IHRvIHJ1biBpbnN0ZWFkIG9mIGp1bXBpbmcgdG8gaXRzIGVuZCBzdGF0ZS4gV2hpbGUgdGVjaG5pY2FsbHkgb25lIGNvdWxkIGFyZ3VlIHRoYXQgaXQgc2hvdWxkIGp1bXAgdG8gaXRzIGVuZCBzdGF0ZSwgdGhhdCdzIG5vdCB3aGF0IHVzZXJzIGludHVpdGl2ZWx5IGV4cGVjdC5cblx0XHRcdFx0d2hpbGUgKHRsLl90aW1lbGluZSkge1xuXHRcdFx0XHRcdGlmIChiZWZvcmVSYXdUaW1lICYmIHRsLl90aW1lbGluZS5zbW9vdGhDaGlsZFRpbWluZykge1xuXHRcdFx0XHRcdFx0dGwudG90YWxUaW1lKHRsLl90b3RhbFRpbWUsIHRydWUpOyAvL21vdmVzIHRoZSB0aW1lbGluZSAoc2hpZnRzIGl0cyBzdGFydFRpbWUpIGlmIG5lY2Vzc2FyeSwgYW5kIGFsc28gZW5hYmxlcyBpdC5cblx0XHRcdFx0XHR9IGVsc2UgaWYgKHRsLl9nYykge1xuXHRcdFx0XHRcdFx0dGwuX2VuYWJsZWQodHJ1ZSwgZmFsc2UpO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHR0bCA9IHRsLl90aW1lbGluZTtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXG5cdFx0XHRyZXR1cm4gdGhpcztcblx0XHR9O1xuXG5cdFx0cC5yZW1vdmUgPSBmdW5jdGlvbih2YWx1ZSkge1xuXHRcdFx0aWYgKHZhbHVlIGluc3RhbmNlb2YgQW5pbWF0aW9uKSB7XG5cdFx0XHRcdHRoaXMuX3JlbW92ZSh2YWx1ZSwgZmFsc2UpO1xuXHRcdFx0XHR2YXIgdGwgPSB2YWx1ZS5fdGltZWxpbmUgPSB2YWx1ZS52YXJzLnVzZUZyYW1lcyA/IEFuaW1hdGlvbi5fcm9vdEZyYW1lc1RpbWVsaW5lIDogQW5pbWF0aW9uLl9yb290VGltZWxpbmU7IC8vbm93IHRoYXQgaXQncyByZW1vdmVkLCBkZWZhdWx0IGl0IHRvIHRoZSByb290IHRpbWVsaW5lIHNvIHRoYXQgaWYgaXQgZ2V0cyBwbGF5ZWQgYWdhaW4sIGl0IGRvZXNuJ3QganVtcCBiYWNrIGludG8gdGhpcyB0aW1lbGluZS5cblx0XHRcdFx0dmFsdWUuX3N0YXJ0VGltZSA9ICh2YWx1ZS5fcGF1c2VkID8gdmFsdWUuX3BhdXNlVGltZSA6IHRsLl90aW1lKSAtICgoIXZhbHVlLl9yZXZlcnNlZCA/IHZhbHVlLl90b3RhbFRpbWUgOiB2YWx1ZS50b3RhbER1cmF0aW9uKCkgLSB2YWx1ZS5fdG90YWxUaW1lKSAvIHZhbHVlLl90aW1lU2NhbGUpOyAvL2Vuc3VyZSB0aGF0IGlmIGl0IGdldHMgcGxheWVkIGFnYWluLCB0aGUgdGltaW5nIGlzIGNvcnJlY3QuXG5cdFx0XHRcdHJldHVybiB0aGlzO1xuXHRcdFx0fSBlbHNlIGlmICh2YWx1ZSBpbnN0YW5jZW9mIEFycmF5IHx8ICh2YWx1ZSAmJiB2YWx1ZS5wdXNoICYmIF9pc0FycmF5KHZhbHVlKSkpIHtcblx0XHRcdFx0dmFyIGkgPSB2YWx1ZS5sZW5ndGg7XG5cdFx0XHRcdHdoaWxlICgtLWkgPiAtMSkge1xuXHRcdFx0XHRcdHRoaXMucmVtb3ZlKHZhbHVlW2ldKTtcblx0XHRcdFx0fVxuXHRcdFx0XHRyZXR1cm4gdGhpcztcblx0XHRcdH0gZWxzZSBpZiAodHlwZW9mKHZhbHVlKSA9PT0gXCJzdHJpbmdcIikge1xuXHRcdFx0XHRyZXR1cm4gdGhpcy5yZW1vdmVMYWJlbCh2YWx1ZSk7XG5cdFx0XHR9XG5cdFx0XHRyZXR1cm4gdGhpcy5raWxsKG51bGwsIHZhbHVlKTtcblx0XHR9O1xuXG5cdFx0cC5fcmVtb3ZlID0gZnVuY3Rpb24odHdlZW4sIHNraXBEaXNhYmxlKSB7XG5cdFx0XHRTaW1wbGVUaW1lbGluZS5wcm90b3R5cGUuX3JlbW92ZS5jYWxsKHRoaXMsIHR3ZWVuLCBza2lwRGlzYWJsZSk7XG5cdFx0XHR2YXIgbGFzdCA9IHRoaXMuX2xhc3Q7XG5cdFx0XHRpZiAoIWxhc3QpIHtcblx0XHRcdFx0dGhpcy5fdGltZSA9IHRoaXMuX3RvdGFsVGltZSA9IHRoaXMuX2R1cmF0aW9uID0gdGhpcy5fdG90YWxEdXJhdGlvbiA9IDA7XG5cdFx0XHR9IGVsc2UgaWYgKHRoaXMuX3RpbWUgPiBsYXN0Ll9zdGFydFRpbWUgKyBsYXN0Ll90b3RhbER1cmF0aW9uIC8gbGFzdC5fdGltZVNjYWxlKSB7XG5cdFx0XHRcdHRoaXMuX3RpbWUgPSB0aGlzLmR1cmF0aW9uKCk7XG5cdFx0XHRcdHRoaXMuX3RvdGFsVGltZSA9IHRoaXMuX3RvdGFsRHVyYXRpb247XG5cdFx0XHR9XG5cdFx0XHRyZXR1cm4gdGhpcztcblx0XHR9O1xuXG5cdFx0cC5hcHBlbmQgPSBmdW5jdGlvbih2YWx1ZSwgb2Zmc2V0T3JMYWJlbCkge1xuXHRcdFx0cmV0dXJuIHRoaXMuYWRkKHZhbHVlLCB0aGlzLl9wYXJzZVRpbWVPckxhYmVsKG51bGwsIG9mZnNldE9yTGFiZWwsIHRydWUsIHZhbHVlKSk7XG5cdFx0fTtcblxuXHRcdHAuaW5zZXJ0ID0gcC5pbnNlcnRNdWx0aXBsZSA9IGZ1bmN0aW9uKHZhbHVlLCBwb3NpdGlvbiwgYWxpZ24sIHN0YWdnZXIpIHtcblx0XHRcdHJldHVybiB0aGlzLmFkZCh2YWx1ZSwgcG9zaXRpb24gfHwgMCwgYWxpZ24sIHN0YWdnZXIpO1xuXHRcdH07XG5cblx0XHRwLmFwcGVuZE11bHRpcGxlID0gZnVuY3Rpb24odHdlZW5zLCBvZmZzZXRPckxhYmVsLCBhbGlnbiwgc3RhZ2dlcikge1xuXHRcdFx0cmV0dXJuIHRoaXMuYWRkKHR3ZWVucywgdGhpcy5fcGFyc2VUaW1lT3JMYWJlbChudWxsLCBvZmZzZXRPckxhYmVsLCB0cnVlLCB0d2VlbnMpLCBhbGlnbiwgc3RhZ2dlcik7XG5cdFx0fTtcblxuXHRcdHAuYWRkTGFiZWwgPSBmdW5jdGlvbihsYWJlbCwgcG9zaXRpb24pIHtcblx0XHRcdHRoaXMuX2xhYmVsc1tsYWJlbF0gPSB0aGlzLl9wYXJzZVRpbWVPckxhYmVsKHBvc2l0aW9uKTtcblx0XHRcdHJldHVybiB0aGlzO1xuXHRcdH07XG5cblx0XHRwLmFkZFBhdXNlID0gZnVuY3Rpb24ocG9zaXRpb24sIGNhbGxiYWNrLCBwYXJhbXMsIHNjb3BlKSB7XG5cdFx0XHR2YXIgdCA9IFR3ZWVuTGl0ZS5kZWxheWVkQ2FsbCgwLCBfcGF1c2VDYWxsYmFjaywgcGFyYW1zLCBzY29wZSB8fCB0aGlzKTtcblx0XHRcdHQudmFycy5vbkNvbXBsZXRlID0gdC52YXJzLm9uUmV2ZXJzZUNvbXBsZXRlID0gY2FsbGJhY2s7XG5cdFx0XHR0LmRhdGEgPSBcImlzUGF1c2VcIjtcblx0XHRcdHRoaXMuX2hhc1BhdXNlID0gdHJ1ZTtcblx0XHRcdHJldHVybiB0aGlzLmFkZCh0LCBwb3NpdGlvbik7XG5cdFx0fTtcblxuXHRcdHAucmVtb3ZlTGFiZWwgPSBmdW5jdGlvbihsYWJlbCkge1xuXHRcdFx0ZGVsZXRlIHRoaXMuX2xhYmVsc1tsYWJlbF07XG5cdFx0XHRyZXR1cm4gdGhpcztcblx0XHR9O1xuXG5cdFx0cC5nZXRMYWJlbFRpbWUgPSBmdW5jdGlvbihsYWJlbCkge1xuXHRcdFx0cmV0dXJuICh0aGlzLl9sYWJlbHNbbGFiZWxdICE9IG51bGwpID8gdGhpcy5fbGFiZWxzW2xhYmVsXSA6IC0xO1xuXHRcdH07XG5cblx0XHRwLl9wYXJzZVRpbWVPckxhYmVsID0gZnVuY3Rpb24odGltZU9yTGFiZWwsIG9mZnNldE9yTGFiZWwsIGFwcGVuZElmQWJzZW50LCBpZ25vcmUpIHtcblx0XHRcdHZhciBpO1xuXHRcdFx0Ly9pZiB3ZSdyZSBhYm91dCB0byBhZGQgYSB0d2Vlbi90aW1lbGluZSAob3IgYW4gYXJyYXkgb2YgdGhlbSkgdGhhdCdzIGFscmVhZHkgYSBjaGlsZCBvZiB0aGlzIHRpbWVsaW5lLCB3ZSBzaG91bGQgcmVtb3ZlIGl0IGZpcnN0IHNvIHRoYXQgaXQgZG9lc24ndCBjb250YW1pbmF0ZSB0aGUgZHVyYXRpb24oKS5cblx0XHRcdGlmIChpZ25vcmUgaW5zdGFuY2VvZiBBbmltYXRpb24gJiYgaWdub3JlLnRpbWVsaW5lID09PSB0aGlzKSB7XG5cdFx0XHRcdHRoaXMucmVtb3ZlKGlnbm9yZSk7XG5cdFx0XHR9IGVsc2UgaWYgKGlnbm9yZSAmJiAoKGlnbm9yZSBpbnN0YW5jZW9mIEFycmF5KSB8fCAoaWdub3JlLnB1c2ggJiYgX2lzQXJyYXkoaWdub3JlKSkpKSB7XG5cdFx0XHRcdGkgPSBpZ25vcmUubGVuZ3RoO1xuXHRcdFx0XHR3aGlsZSAoLS1pID4gLTEpIHtcblx0XHRcdFx0XHRpZiAoaWdub3JlW2ldIGluc3RhbmNlb2YgQW5pbWF0aW9uICYmIGlnbm9yZVtpXS50aW1lbGluZSA9PT0gdGhpcykge1xuXHRcdFx0XHRcdFx0dGhpcy5yZW1vdmUoaWdub3JlW2ldKTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHRcdGlmICh0eXBlb2Yob2Zmc2V0T3JMYWJlbCkgPT09IFwic3RyaW5nXCIpIHtcblx0XHRcdFx0cmV0dXJuIHRoaXMuX3BhcnNlVGltZU9yTGFiZWwob2Zmc2V0T3JMYWJlbCwgKGFwcGVuZElmQWJzZW50ICYmIHR5cGVvZih0aW1lT3JMYWJlbCkgPT09IFwibnVtYmVyXCIgJiYgdGhpcy5fbGFiZWxzW29mZnNldE9yTGFiZWxdID09IG51bGwpID8gdGltZU9yTGFiZWwgLSB0aGlzLmR1cmF0aW9uKCkgOiAwLCBhcHBlbmRJZkFic2VudCk7XG5cdFx0XHR9XG5cdFx0XHRvZmZzZXRPckxhYmVsID0gb2Zmc2V0T3JMYWJlbCB8fCAwO1xuXHRcdFx0aWYgKHR5cGVvZih0aW1lT3JMYWJlbCkgPT09IFwic3RyaW5nXCIgJiYgKGlzTmFOKHRpbWVPckxhYmVsKSB8fCB0aGlzLl9sYWJlbHNbdGltZU9yTGFiZWxdICE9IG51bGwpKSB7IC8vaWYgdGhlIHN0cmluZyBpcyBhIG51bWJlciBsaWtlIFwiMVwiLCBjaGVjayB0byBzZWUgaWYgdGhlcmUncyBhIGxhYmVsIHdpdGggdGhhdCBuYW1lLCBvdGhlcndpc2UgaW50ZXJwcmV0IGl0IGFzIGEgbnVtYmVyIChhYnNvbHV0ZSB2YWx1ZSkuXG5cdFx0XHRcdGkgPSB0aW1lT3JMYWJlbC5pbmRleE9mKFwiPVwiKTtcblx0XHRcdFx0aWYgKGkgPT09IC0xKSB7XG5cdFx0XHRcdFx0aWYgKHRoaXMuX2xhYmVsc1t0aW1lT3JMYWJlbF0gPT0gbnVsbCkge1xuXHRcdFx0XHRcdFx0cmV0dXJuIGFwcGVuZElmQWJzZW50ID8gKHRoaXMuX2xhYmVsc1t0aW1lT3JMYWJlbF0gPSB0aGlzLmR1cmF0aW9uKCkgKyBvZmZzZXRPckxhYmVsKSA6IG9mZnNldE9yTGFiZWw7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdHJldHVybiB0aGlzLl9sYWJlbHNbdGltZU9yTGFiZWxdICsgb2Zmc2V0T3JMYWJlbDtcblx0XHRcdFx0fVxuXHRcdFx0XHRvZmZzZXRPckxhYmVsID0gcGFyc2VJbnQodGltZU9yTGFiZWwuY2hhckF0KGktMSkgKyBcIjFcIiwgMTApICogTnVtYmVyKHRpbWVPckxhYmVsLnN1YnN0cihpKzEpKTtcblx0XHRcdFx0dGltZU9yTGFiZWwgPSAoaSA+IDEpID8gdGhpcy5fcGFyc2VUaW1lT3JMYWJlbCh0aW1lT3JMYWJlbC5zdWJzdHIoMCwgaS0xKSwgMCwgYXBwZW5kSWZBYnNlbnQpIDogdGhpcy5kdXJhdGlvbigpO1xuXHRcdFx0fSBlbHNlIGlmICh0aW1lT3JMYWJlbCA9PSBudWxsKSB7XG5cdFx0XHRcdHRpbWVPckxhYmVsID0gdGhpcy5kdXJhdGlvbigpO1xuXHRcdFx0fVxuXHRcdFx0cmV0dXJuIE51bWJlcih0aW1lT3JMYWJlbCkgKyBvZmZzZXRPckxhYmVsO1xuXHRcdH07XG5cblx0XHRwLnNlZWsgPSBmdW5jdGlvbihwb3NpdGlvbiwgc3VwcHJlc3NFdmVudHMpIHtcblx0XHRcdHJldHVybiB0aGlzLnRvdGFsVGltZSgodHlwZW9mKHBvc2l0aW9uKSA9PT0gXCJudW1iZXJcIikgPyBwb3NpdGlvbiA6IHRoaXMuX3BhcnNlVGltZU9yTGFiZWwocG9zaXRpb24pLCAoc3VwcHJlc3NFdmVudHMgIT09IGZhbHNlKSk7XG5cdFx0fTtcblxuXHRcdHAuc3RvcCA9IGZ1bmN0aW9uKCkge1xuXHRcdFx0cmV0dXJuIHRoaXMucGF1c2VkKHRydWUpO1xuXHRcdH07XG5cblx0XHRwLmdvdG9BbmRQbGF5ID0gZnVuY3Rpb24ocG9zaXRpb24sIHN1cHByZXNzRXZlbnRzKSB7XG5cdFx0XHRyZXR1cm4gdGhpcy5wbGF5KHBvc2l0aW9uLCBzdXBwcmVzc0V2ZW50cyk7XG5cdFx0fTtcblxuXHRcdHAuZ290b0FuZFN0b3AgPSBmdW5jdGlvbihwb3NpdGlvbiwgc3VwcHJlc3NFdmVudHMpIHtcblx0XHRcdHJldHVybiB0aGlzLnBhdXNlKHBvc2l0aW9uLCBzdXBwcmVzc0V2ZW50cyk7XG5cdFx0fTtcblxuXHRcdHAucmVuZGVyID0gZnVuY3Rpb24odGltZSwgc3VwcHJlc3NFdmVudHMsIGZvcmNlKSB7XG5cdFx0XHRpZiAodGhpcy5fZ2MpIHtcblx0XHRcdFx0dGhpcy5fZW5hYmxlZCh0cnVlLCBmYWxzZSk7XG5cdFx0XHR9XG5cdFx0XHR2YXIgdG90YWxEdXIgPSAoIXRoaXMuX2RpcnR5KSA/IHRoaXMuX3RvdGFsRHVyYXRpb24gOiB0aGlzLnRvdGFsRHVyYXRpb24oKSxcblx0XHRcdFx0cHJldlRpbWUgPSB0aGlzLl90aW1lLFxuXHRcdFx0XHRwcmV2U3RhcnQgPSB0aGlzLl9zdGFydFRpbWUsXG5cdFx0XHRcdHByZXZUaW1lU2NhbGUgPSB0aGlzLl90aW1lU2NhbGUsXG5cdFx0XHRcdHByZXZQYXVzZWQgPSB0aGlzLl9wYXVzZWQsXG5cdFx0XHRcdHR3ZWVuLCBpc0NvbXBsZXRlLCBuZXh0LCBjYWxsYmFjaywgaW50ZXJuYWxGb3JjZSwgcGF1c2VUd2VlbiwgY3VyVGltZTtcblx0XHRcdGlmICh0aW1lID49IHRvdGFsRHVyIC0gMC4wMDAwMDAxKSB7IC8vdG8gd29yayBhcm91bmQgb2NjYXNpb25hbCBmbG9hdGluZyBwb2ludCBtYXRoIGFydGlmYWN0cy5cblx0XHRcdFx0dGhpcy5fdG90YWxUaW1lID0gdGhpcy5fdGltZSA9IHRvdGFsRHVyO1xuXHRcdFx0XHRpZiAoIXRoaXMuX3JldmVyc2VkKSBpZiAoIXRoaXMuX2hhc1BhdXNlZENoaWxkKCkpIHtcblx0XHRcdFx0XHRpc0NvbXBsZXRlID0gdHJ1ZTtcblx0XHRcdFx0XHRjYWxsYmFjayA9IFwib25Db21wbGV0ZVwiO1xuXHRcdFx0XHRcdGludGVybmFsRm9yY2UgPSAhIXRoaXMuX3RpbWVsaW5lLmF1dG9SZW1vdmVDaGlsZHJlbjsgLy9vdGhlcndpc2UsIGlmIHRoZSBhbmltYXRpb24gaXMgdW5wYXVzZWQvYWN0aXZhdGVkIGFmdGVyIGl0J3MgYWxyZWFkeSBmaW5pc2hlZCwgaXQgZG9lc24ndCBnZXQgcmVtb3ZlZCBmcm9tIHRoZSBwYXJlbnQgdGltZWxpbmUuXG5cdFx0XHRcdFx0aWYgKHRoaXMuX2R1cmF0aW9uID09PSAwKSBpZiAoKHRpbWUgPD0gMCAmJiB0aW1lID49IC0wLjAwMDAwMDEpIHx8IHRoaXMuX3Jhd1ByZXZUaW1lIDwgMCB8fCB0aGlzLl9yYXdQcmV2VGltZSA9PT0gX3RpbnlOdW0pIGlmICh0aGlzLl9yYXdQcmV2VGltZSAhPT0gdGltZSAmJiB0aGlzLl9maXJzdCkge1xuXHRcdFx0XHRcdFx0aW50ZXJuYWxGb3JjZSA9IHRydWU7XG5cdFx0XHRcdFx0XHRpZiAodGhpcy5fcmF3UHJldlRpbWUgPiBfdGlueU51bSkge1xuXHRcdFx0XHRcdFx0XHRjYWxsYmFjayA9IFwib25SZXZlcnNlQ29tcGxldGVcIjtcblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblx0XHRcdFx0dGhpcy5fcmF3UHJldlRpbWUgPSAodGhpcy5fZHVyYXRpb24gfHwgIXN1cHByZXNzRXZlbnRzIHx8IHRpbWUgfHwgdGhpcy5fcmF3UHJldlRpbWUgPT09IHRpbWUpID8gdGltZSA6IF90aW55TnVtOyAvL3doZW4gdGhlIHBsYXloZWFkIGFycml2ZXMgYXQgRVhBQ1RMWSB0aW1lIDAgKHJpZ2h0IG9uIHRvcCkgb2YgYSB6ZXJvLWR1cmF0aW9uIHRpbWVsaW5lIG9yIHR3ZWVuLCB3ZSBuZWVkIHRvIGRpc2Nlcm4gaWYgZXZlbnRzIGFyZSBzdXBwcmVzc2VkIHNvIHRoYXQgd2hlbiB0aGUgcGxheWhlYWQgbW92ZXMgYWdhaW4gKG5leHQgdGltZSksIGl0J2xsIHRyaWdnZXIgdGhlIGNhbGxiYWNrLiBJZiBldmVudHMgYXJlIE5PVCBzdXBwcmVzc2VkLCBvYnZpb3VzbHkgdGhlIGNhbGxiYWNrIHdvdWxkIGJlIHRyaWdnZXJlZCBpbiB0aGlzIHJlbmRlci4gQmFzaWNhbGx5LCB0aGUgY2FsbGJhY2sgc2hvdWxkIGZpcmUgZWl0aGVyIHdoZW4gdGhlIHBsYXloZWFkIEFSUklWRVMgb3IgTEVBVkVTIHRoaXMgZXhhY3Qgc3BvdCwgbm90IGJvdGguIEltYWdpbmUgZG9pbmcgYSB0aW1lbGluZS5zZWVrKDApIGFuZCB0aGVyZSdzIGEgY2FsbGJhY2sgdGhhdCBzaXRzIGF0IDAuIFNpbmNlIGV2ZW50cyBhcmUgc3VwcHJlc3NlZCBvbiB0aGF0IHNlZWsoKSBieSBkZWZhdWx0LCBub3RoaW5nIHdpbGwgZmlyZSwgYnV0IHdoZW4gdGhlIHBsYXloZWFkIG1vdmVzIG9mZiBvZiB0aGF0IHBvc2l0aW9uLCB0aGUgY2FsbGJhY2sgc2hvdWxkIGZpcmUuIFRoaXMgYmVoYXZpb3IgaXMgd2hhdCBwZW9wbGUgaW50dWl0aXZlbHkgZXhwZWN0LiBXZSBzZXQgdGhlIF9yYXdQcmV2VGltZSB0byBiZSBhIHByZWNpc2UgdGlueSBudW1iZXIgdG8gaW5kaWNhdGUgdGhpcyBzY2VuYXJpbyByYXRoZXIgdGhhbiB1c2luZyBhbm90aGVyIHByb3BlcnR5L3ZhcmlhYmxlIHdoaWNoIHdvdWxkIGluY3JlYXNlIG1lbW9yeSB1c2FnZS4gVGhpcyB0ZWNobmlxdWUgaXMgbGVzcyByZWFkYWJsZSwgYnV0IG1vcmUgZWZmaWNpZW50LlxuXHRcdFx0XHR0aW1lID0gdG90YWxEdXIgKyAwLjAwMDE7IC8vdG8gYXZvaWQgb2NjYXNpb25hbCBmbG9hdGluZyBwb2ludCByb3VuZGluZyBlcnJvcnMgLSBzb21ldGltZXMgY2hpbGQgdHdlZW5zL3RpbWVsaW5lcyB3ZXJlIG5vdCBiZWluZyBmdWxseSBjb21wbGV0ZWQgKHRoZWlyIHByb2dyZXNzIG1pZ2h0IGJlIDAuOTk5OTk5OTk5OTk5OTk4IGluc3RlYWQgb2YgMSBiZWNhdXNlIHdoZW4gX3RpbWUgLSB0d2Vlbi5fc3RhcnRUaW1lIGlzIHBlcmZvcm1lZCwgZmxvYXRpbmcgcG9pbnQgZXJyb3JzIHdvdWxkIHJldHVybiBhIHZhbHVlIHRoYXQgd2FzIFNMSUdIVExZIG9mZikuIFRyeSAoOTk5OTk5OTk5OTk5LjcgLSA5OTk5OTk5OTk5OTkpICogMSA9IDAuNjk5OTUxMTcxODc1IGluc3RlYWQgb2YgMC43LlxuXG5cdFx0XHR9IGVsc2UgaWYgKHRpbWUgPCAwLjAwMDAwMDEpIHsgLy90byB3b3JrIGFyb3VuZCBvY2Nhc2lvbmFsIGZsb2F0aW5nIHBvaW50IG1hdGggYXJ0aWZhY3RzLCByb3VuZCBzdXBlciBzbWFsbCB2YWx1ZXMgdG8gMC5cblx0XHRcdFx0dGhpcy5fdG90YWxUaW1lID0gdGhpcy5fdGltZSA9IDA7XG5cdFx0XHRcdGlmIChwcmV2VGltZSAhPT0gMCB8fCAodGhpcy5fZHVyYXRpb24gPT09IDAgJiYgdGhpcy5fcmF3UHJldlRpbWUgIT09IF90aW55TnVtICYmICh0aGlzLl9yYXdQcmV2VGltZSA+IDAgfHwgKHRpbWUgPCAwICYmIHRoaXMuX3Jhd1ByZXZUaW1lID49IDApKSkpIHtcblx0XHRcdFx0XHRjYWxsYmFjayA9IFwib25SZXZlcnNlQ29tcGxldGVcIjtcblx0XHRcdFx0XHRpc0NvbXBsZXRlID0gdGhpcy5fcmV2ZXJzZWQ7XG5cdFx0XHRcdH1cblx0XHRcdFx0aWYgKHRpbWUgPCAwKSB7XG5cdFx0XHRcdFx0dGhpcy5fYWN0aXZlID0gZmFsc2U7XG5cdFx0XHRcdFx0aWYgKHRoaXMuX3RpbWVsaW5lLmF1dG9SZW1vdmVDaGlsZHJlbiAmJiB0aGlzLl9yZXZlcnNlZCkgeyAvL2Vuc3VyZXMgcHJvcGVyIEdDIGlmIGEgdGltZWxpbmUgaXMgcmVzdW1lZCBhZnRlciBpdCdzIGZpbmlzaGVkIHJldmVyc2luZy5cblx0XHRcdFx0XHRcdGludGVybmFsRm9yY2UgPSBpc0NvbXBsZXRlID0gdHJ1ZTtcblx0XHRcdFx0XHRcdGNhbGxiYWNrID0gXCJvblJldmVyc2VDb21wbGV0ZVwiO1xuXHRcdFx0XHRcdH0gZWxzZSBpZiAodGhpcy5fcmF3UHJldlRpbWUgPj0gMCAmJiB0aGlzLl9maXJzdCkgeyAvL3doZW4gZ29pbmcgYmFjayBiZXlvbmQgdGhlIHN0YXJ0LCBmb3JjZSBhIHJlbmRlciBzbyB0aGF0IHplcm8tZHVyYXRpb24gdHdlZW5zIHRoYXQgc2l0IGF0IHRoZSB2ZXJ5IGJlZ2lubmluZyByZW5kZXIgdGhlaXIgc3RhcnQgdmFsdWVzIHByb3Blcmx5LiBPdGhlcndpc2UsIGlmIHRoZSBwYXJlbnQgdGltZWxpbmUncyBwbGF5aGVhZCBsYW5kcyBleGFjdGx5IGF0IHRoaXMgdGltZWxpbmUncyBzdGFydFRpbWUsIGFuZCB0aGVuIG1vdmVzIGJhY2t3YXJkcywgdGhlIHplcm8tZHVyYXRpb24gdHdlZW5zIGF0IHRoZSBiZWdpbm5pbmcgd291bGQgc3RpbGwgYmUgYXQgdGhlaXIgZW5kIHN0YXRlLlxuXHRcdFx0XHRcdFx0aW50ZXJuYWxGb3JjZSA9IHRydWU7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdHRoaXMuX3Jhd1ByZXZUaW1lID0gdGltZTtcblx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHR0aGlzLl9yYXdQcmV2VGltZSA9ICh0aGlzLl9kdXJhdGlvbiB8fCAhc3VwcHJlc3NFdmVudHMgfHwgdGltZSB8fCB0aGlzLl9yYXdQcmV2VGltZSA9PT0gdGltZSkgPyB0aW1lIDogX3RpbnlOdW07IC8vd2hlbiB0aGUgcGxheWhlYWQgYXJyaXZlcyBhdCBFWEFDVExZIHRpbWUgMCAocmlnaHQgb24gdG9wKSBvZiBhIHplcm8tZHVyYXRpb24gdGltZWxpbmUgb3IgdHdlZW4sIHdlIG5lZWQgdG8gZGlzY2VybiBpZiBldmVudHMgYXJlIHN1cHByZXNzZWQgc28gdGhhdCB3aGVuIHRoZSBwbGF5aGVhZCBtb3ZlcyBhZ2FpbiAobmV4dCB0aW1lKSwgaXQnbGwgdHJpZ2dlciB0aGUgY2FsbGJhY2suIElmIGV2ZW50cyBhcmUgTk9UIHN1cHByZXNzZWQsIG9idmlvdXNseSB0aGUgY2FsbGJhY2sgd291bGQgYmUgdHJpZ2dlcmVkIGluIHRoaXMgcmVuZGVyLiBCYXNpY2FsbHksIHRoZSBjYWxsYmFjayBzaG91bGQgZmlyZSBlaXRoZXIgd2hlbiB0aGUgcGxheWhlYWQgQVJSSVZFUyBvciBMRUFWRVMgdGhpcyBleGFjdCBzcG90LCBub3QgYm90aC4gSW1hZ2luZSBkb2luZyBhIHRpbWVsaW5lLnNlZWsoMCkgYW5kIHRoZXJlJ3MgYSBjYWxsYmFjayB0aGF0IHNpdHMgYXQgMC4gU2luY2UgZXZlbnRzIGFyZSBzdXBwcmVzc2VkIG9uIHRoYXQgc2VlaygpIGJ5IGRlZmF1bHQsIG5vdGhpbmcgd2lsbCBmaXJlLCBidXQgd2hlbiB0aGUgcGxheWhlYWQgbW92ZXMgb2ZmIG9mIHRoYXQgcG9zaXRpb24sIHRoZSBjYWxsYmFjayBzaG91bGQgZmlyZS4gVGhpcyBiZWhhdmlvciBpcyB3aGF0IHBlb3BsZSBpbnR1aXRpdmVseSBleHBlY3QuIFdlIHNldCB0aGUgX3Jhd1ByZXZUaW1lIHRvIGJlIGEgcHJlY2lzZSB0aW55IG51bWJlciB0byBpbmRpY2F0ZSB0aGlzIHNjZW5hcmlvIHJhdGhlciB0aGFuIHVzaW5nIGFub3RoZXIgcHJvcGVydHkvdmFyaWFibGUgd2hpY2ggd291bGQgaW5jcmVhc2UgbWVtb3J5IHVzYWdlLiBUaGlzIHRlY2huaXF1ZSBpcyBsZXNzIHJlYWRhYmxlLCBidXQgbW9yZSBlZmZpY2llbnQuXG5cdFx0XHRcdFx0aWYgKHRpbWUgPT09IDAgJiYgaXNDb21wbGV0ZSkgeyAvL2lmIHRoZXJlJ3MgYSB6ZXJvLWR1cmF0aW9uIHR3ZWVuIGF0IHRoZSB2ZXJ5IGJlZ2lubmluZyBvZiBhIHRpbWVsaW5lIGFuZCB0aGUgcGxheWhlYWQgbGFuZHMgRVhBQ1RMWSBhdCB0aW1lIDAsIHRoYXQgdHdlZW4gd2lsbCBjb3JyZWN0bHkgcmVuZGVyIGl0cyBlbmQgdmFsdWVzLCBidXQgd2UgbmVlZCB0byBrZWVwIHRoZSB0aW1lbGluZSBhbGl2ZSBmb3Igb25lIG1vcmUgcmVuZGVyIHNvIHRoYXQgdGhlIGJlZ2lubmluZyB2YWx1ZXMgcmVuZGVyIHByb3Blcmx5IGFzIHRoZSBwYXJlbnQncyBwbGF5aGVhZCBrZWVwcyBtb3ZpbmcgYmV5b25kIHRoZSBiZWdpbmluZy4gSW1hZ2luZSBvYmoueCBzdGFydHMgYXQgMCBhbmQgdGhlbiB3ZSBkbyB0bC5zZXQob2JqLCB7eDoxMDB9KS50byhvYmosIDEsIHt4OjIwMH0pIGFuZCB0aGVuIGxhdGVyIHdlIHRsLnJldmVyc2UoKS4uLnRoZSBnb2FsIGlzIHRvIGhhdmUgb2JqLnggcmV2ZXJ0IHRvIDAuIElmIHRoZSBwbGF5aGVhZCBoYXBwZW5zIHRvIGxhbmQgb24gZXhhY3RseSAwLCB3aXRob3V0IHRoaXMgY2h1bmsgb2YgY29kZSwgaXQnZCBjb21wbGV0ZSB0aGUgdGltZWxpbmUgYW5kIHJlbW92ZSBpdCBmcm9tIHRoZSByZW5kZXJpbmcgcXVldWUgKG5vdCBnb29kKS5cblx0XHRcdFx0XHRcdHR3ZWVuID0gdGhpcy5fZmlyc3Q7XG5cdFx0XHRcdFx0XHR3aGlsZSAodHdlZW4gJiYgdHdlZW4uX3N0YXJ0VGltZSA9PT0gMCkge1xuXHRcdFx0XHRcdFx0XHRpZiAoIXR3ZWVuLl9kdXJhdGlvbikge1xuXHRcdFx0XHRcdFx0XHRcdGlzQ29tcGxldGUgPSBmYWxzZTtcblx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0XHR0d2VlbiA9IHR3ZWVuLl9uZXh0O1xuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHR0aW1lID0gMDsgLy90byBhdm9pZCBvY2Nhc2lvbmFsIGZsb2F0aW5nIHBvaW50IHJvdW5kaW5nIGVycm9ycyAoY291bGQgY2F1c2UgcHJvYmxlbXMgZXNwZWNpYWxseSB3aXRoIHplcm8tZHVyYXRpb24gdHdlZW5zIGF0IHRoZSB2ZXJ5IGJlZ2lubmluZyBvZiB0aGUgdGltZWxpbmUpXG5cdFx0XHRcdFx0aWYgKCF0aGlzLl9pbml0dGVkKSB7XG5cdFx0XHRcdFx0XHRpbnRlcm5hbEZvcmNlID0gdHJ1ZTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblxuXHRcdFx0fSBlbHNlIHtcblxuXHRcdFx0XHRpZiAodGhpcy5faGFzUGF1c2UgJiYgIXRoaXMuX2ZvcmNpbmdQbGF5aGVhZCAmJiAhc3VwcHJlc3NFdmVudHMpIHtcblx0XHRcdFx0XHRpZiAodGltZSA+PSBwcmV2VGltZSkge1xuXHRcdFx0XHRcdFx0dHdlZW4gPSB0aGlzLl9maXJzdDtcblx0XHRcdFx0XHRcdHdoaWxlICh0d2VlbiAmJiB0d2Vlbi5fc3RhcnRUaW1lIDw9IHRpbWUgJiYgIXBhdXNlVHdlZW4pIHtcblx0XHRcdFx0XHRcdFx0aWYgKCF0d2Vlbi5fZHVyYXRpb24pIGlmICh0d2Vlbi5kYXRhID09PSBcImlzUGF1c2VcIiAmJiAhdHdlZW4ucmF0aW8gJiYgISh0d2Vlbi5fc3RhcnRUaW1lID09PSAwICYmIHRoaXMuX3Jhd1ByZXZUaW1lID09PSAwKSkge1xuXHRcdFx0XHRcdFx0XHRcdHBhdXNlVHdlZW4gPSB0d2Vlbjtcblx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0XHR0d2VlbiA9IHR3ZWVuLl9uZXh0O1xuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0XHR0d2VlbiA9IHRoaXMuX2xhc3Q7XG5cdFx0XHRcdFx0XHR3aGlsZSAodHdlZW4gJiYgdHdlZW4uX3N0YXJ0VGltZSA+PSB0aW1lICYmICFwYXVzZVR3ZWVuKSB7XG5cdFx0XHRcdFx0XHRcdGlmICghdHdlZW4uX2R1cmF0aW9uKSBpZiAodHdlZW4uZGF0YSA9PT0gXCJpc1BhdXNlXCIgJiYgdHdlZW4uX3Jhd1ByZXZUaW1lID4gMCkge1xuXHRcdFx0XHRcdFx0XHRcdHBhdXNlVHdlZW4gPSB0d2Vlbjtcblx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0XHR0d2VlbiA9IHR3ZWVuLl9wcmV2O1xuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHRpZiAocGF1c2VUd2Vlbikge1xuXHRcdFx0XHRcdFx0dGhpcy5fdGltZSA9IHRpbWUgPSBwYXVzZVR3ZWVuLl9zdGFydFRpbWU7XG5cdFx0XHRcdFx0XHR0aGlzLl90b3RhbFRpbWUgPSB0aW1lICsgKHRoaXMuX2N5Y2xlICogKHRoaXMuX3RvdGFsRHVyYXRpb24gKyB0aGlzLl9yZXBlYXREZWxheSkpO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXG5cdFx0XHRcdHRoaXMuX3RvdGFsVGltZSA9IHRoaXMuX3RpbWUgPSB0aGlzLl9yYXdQcmV2VGltZSA9IHRpbWU7XG5cdFx0XHR9XG5cdFx0XHRpZiAoKHRoaXMuX3RpbWUgPT09IHByZXZUaW1lIHx8ICF0aGlzLl9maXJzdCkgJiYgIWZvcmNlICYmICFpbnRlcm5hbEZvcmNlICYmICFwYXVzZVR3ZWVuKSB7XG5cdFx0XHRcdHJldHVybjtcblx0XHRcdH0gZWxzZSBpZiAoIXRoaXMuX2luaXR0ZWQpIHtcblx0XHRcdFx0dGhpcy5faW5pdHRlZCA9IHRydWU7XG5cdFx0XHR9XG5cblx0XHRcdGlmICghdGhpcy5fYWN0aXZlKSBpZiAoIXRoaXMuX3BhdXNlZCAmJiB0aGlzLl90aW1lICE9PSBwcmV2VGltZSAmJiB0aW1lID4gMCkge1xuXHRcdFx0XHR0aGlzLl9hY3RpdmUgPSB0cnVlOyAgLy9zbyB0aGF0IGlmIHRoZSB1c2VyIHJlbmRlcnMgdGhlIHRpbWVsaW5lIChhcyBvcHBvc2VkIHRvIHRoZSBwYXJlbnQgdGltZWxpbmUgcmVuZGVyaW5nIGl0KSwgaXQgaXMgZm9yY2VkIHRvIHJlLXJlbmRlciBhbmQgYWxpZ24gaXQgd2l0aCB0aGUgcHJvcGVyIHRpbWUvZnJhbWUgb24gdGhlIG5leHQgcmVuZGVyaW5nIGN5Y2xlLiBNYXliZSB0aGUgdGltZWxpbmUgYWxyZWFkeSBmaW5pc2hlZCBidXQgdGhlIHVzZXIgbWFudWFsbHkgcmUtcmVuZGVycyBpdCBhcyBoYWxmd2F5IGRvbmUsIGZvciBleGFtcGxlLlxuXHRcdFx0fVxuXG5cdFx0XHRpZiAocHJldlRpbWUgPT09IDApIGlmICh0aGlzLnZhcnMub25TdGFydCkgaWYgKHRoaXMuX3RpbWUgIT09IDApIGlmICghc3VwcHJlc3NFdmVudHMpIHtcblx0XHRcdFx0dGhpcy5fY2FsbGJhY2soXCJvblN0YXJ0XCIpO1xuXHRcdFx0fVxuXG5cdFx0XHRjdXJUaW1lID0gdGhpcy5fdGltZTtcblx0XHRcdGlmIChjdXJUaW1lID49IHByZXZUaW1lKSB7XG5cdFx0XHRcdHR3ZWVuID0gdGhpcy5fZmlyc3Q7XG5cdFx0XHRcdHdoaWxlICh0d2Vlbikge1xuXHRcdFx0XHRcdG5leHQgPSB0d2Vlbi5fbmV4dDsgLy9yZWNvcmQgaXQgaGVyZSBiZWNhdXNlIHRoZSB2YWx1ZSBjb3VsZCBjaGFuZ2UgYWZ0ZXIgcmVuZGVyaW5nLi4uXG5cdFx0XHRcdFx0aWYgKGN1clRpbWUgIT09IHRoaXMuX3RpbWUgfHwgKHRoaXMuX3BhdXNlZCAmJiAhcHJldlBhdXNlZCkpIHsgLy9pbiBjYXNlIGEgdHdlZW4gcGF1c2VzIG9yIHNlZWtzIHRoZSB0aW1lbGluZSB3aGVuIHJlbmRlcmluZywgbGlrZSBpbnNpZGUgb2YgYW4gb25VcGRhdGUvb25Db21wbGV0ZVxuXHRcdFx0XHRcdFx0YnJlYWs7XG5cdFx0XHRcdFx0fSBlbHNlIGlmICh0d2Vlbi5fYWN0aXZlIHx8ICh0d2Vlbi5fc3RhcnRUaW1lIDw9IGN1clRpbWUgJiYgIXR3ZWVuLl9wYXVzZWQgJiYgIXR3ZWVuLl9nYykpIHtcblx0XHRcdFx0XHRcdGlmIChwYXVzZVR3ZWVuID09PSB0d2Vlbikge1xuXHRcdFx0XHRcdFx0XHR0aGlzLnBhdXNlKCk7XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRpZiAoIXR3ZWVuLl9yZXZlcnNlZCkge1xuXHRcdFx0XHRcdFx0XHR0d2Vlbi5yZW5kZXIoKHRpbWUgLSB0d2Vlbi5fc3RhcnRUaW1lKSAqIHR3ZWVuLl90aW1lU2NhbGUsIHN1cHByZXNzRXZlbnRzLCBmb3JjZSk7XG5cdFx0XHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdFx0XHR0d2Vlbi5yZW5kZXIoKCghdHdlZW4uX2RpcnR5KSA/IHR3ZWVuLl90b3RhbER1cmF0aW9uIDogdHdlZW4udG90YWxEdXJhdGlvbigpKSAtICgodGltZSAtIHR3ZWVuLl9zdGFydFRpbWUpICogdHdlZW4uX3RpbWVTY2FsZSksIHN1cHByZXNzRXZlbnRzLCBmb3JjZSk7XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdHR3ZWVuID0gbmV4dDtcblx0XHRcdFx0fVxuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0dHdlZW4gPSB0aGlzLl9sYXN0O1xuXHRcdFx0XHR3aGlsZSAodHdlZW4pIHtcblx0XHRcdFx0XHRuZXh0ID0gdHdlZW4uX3ByZXY7IC8vcmVjb3JkIGl0IGhlcmUgYmVjYXVzZSB0aGUgdmFsdWUgY291bGQgY2hhbmdlIGFmdGVyIHJlbmRlcmluZy4uLlxuXHRcdFx0XHRcdGlmIChjdXJUaW1lICE9PSB0aGlzLl90aW1lIHx8ICh0aGlzLl9wYXVzZWQgJiYgIXByZXZQYXVzZWQpKSB7IC8vaW4gY2FzZSBhIHR3ZWVuIHBhdXNlcyBvciBzZWVrcyB0aGUgdGltZWxpbmUgd2hlbiByZW5kZXJpbmcsIGxpa2UgaW5zaWRlIG9mIGFuIG9uVXBkYXRlL29uQ29tcGxldGVcblx0XHRcdFx0XHRcdGJyZWFrO1xuXHRcdFx0XHRcdH0gZWxzZSBpZiAodHdlZW4uX2FjdGl2ZSB8fCAodHdlZW4uX3N0YXJ0VGltZSA8PSBwcmV2VGltZSAmJiAhdHdlZW4uX3BhdXNlZCAmJiAhdHdlZW4uX2djKSkge1xuXHRcdFx0XHRcdFx0aWYgKHBhdXNlVHdlZW4gPT09IHR3ZWVuKSB7XG5cdFx0XHRcdFx0XHRcdHBhdXNlVHdlZW4gPSB0d2Vlbi5fcHJldjsgLy90aGUgbGlua2VkIGxpc3QgaXMgb3JnYW5pemVkIGJ5IF9zdGFydFRpbWUsIHRodXMgaXQncyBwb3NzaWJsZSB0aGF0IGEgdHdlZW4gY291bGQgc3RhcnQgQkVGT1JFIHRoZSBwYXVzZSBhbmQgZW5kIGFmdGVyIGl0LCBpbiB3aGljaCBjYXNlIGl0IHdvdWxkIGJlIHBvc2l0aW9uZWQgYmVmb3JlIHRoZSBwYXVzZSB0d2VlbiBpbiB0aGUgbGlua2VkIGxpc3QsIGJ1dCB3ZSBzaG91bGQgcmVuZGVyIGl0IGJlZm9yZSB3ZSBwYXVzZSgpIHRoZSB0aW1lbGluZSBhbmQgY2Vhc2UgcmVuZGVyaW5nLiBUaGlzIGlzIG9ubHkgYSBjb25jZXJuIHdoZW4gZ29pbmcgaW4gcmV2ZXJzZS5cblx0XHRcdFx0XHRcdFx0d2hpbGUgKHBhdXNlVHdlZW4gJiYgcGF1c2VUd2Vlbi5lbmRUaW1lKCkgPiB0aGlzLl90aW1lKSB7XG5cdFx0XHRcdFx0XHRcdFx0cGF1c2VUd2Vlbi5yZW5kZXIoIChwYXVzZVR3ZWVuLl9yZXZlcnNlZCA/IHBhdXNlVHdlZW4udG90YWxEdXJhdGlvbigpIC0gKCh0aW1lIC0gcGF1c2VUd2Vlbi5fc3RhcnRUaW1lKSAqIHBhdXNlVHdlZW4uX3RpbWVTY2FsZSkgOiAodGltZSAtIHBhdXNlVHdlZW4uX3N0YXJ0VGltZSkgKiBwYXVzZVR3ZWVuLl90aW1lU2NhbGUpLCBzdXBwcmVzc0V2ZW50cywgZm9yY2UpO1xuXHRcdFx0XHRcdFx0XHRcdHBhdXNlVHdlZW4gPSBwYXVzZVR3ZWVuLl9wcmV2O1xuXHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRcdHBhdXNlVHdlZW4gPSBudWxsO1xuXHRcdFx0XHRcdFx0XHR0aGlzLnBhdXNlKCk7XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRpZiAoIXR3ZWVuLl9yZXZlcnNlZCkge1xuXHRcdFx0XHRcdFx0XHR0d2Vlbi5yZW5kZXIoKHRpbWUgLSB0d2Vlbi5fc3RhcnRUaW1lKSAqIHR3ZWVuLl90aW1lU2NhbGUsIHN1cHByZXNzRXZlbnRzLCBmb3JjZSk7XG5cdFx0XHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdFx0XHR0d2Vlbi5yZW5kZXIoKCghdHdlZW4uX2RpcnR5KSA/IHR3ZWVuLl90b3RhbER1cmF0aW9uIDogdHdlZW4udG90YWxEdXJhdGlvbigpKSAtICgodGltZSAtIHR3ZWVuLl9zdGFydFRpbWUpICogdHdlZW4uX3RpbWVTY2FsZSksIHN1cHByZXNzRXZlbnRzLCBmb3JjZSk7XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdHR3ZWVuID0gbmV4dDtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXG5cdFx0XHRpZiAodGhpcy5fb25VcGRhdGUpIGlmICghc3VwcHJlc3NFdmVudHMpIHtcblx0XHRcdFx0aWYgKF9sYXp5VHdlZW5zLmxlbmd0aCkgeyAvL2luIGNhc2UgcmVuZGVyaW5nIGNhdXNlZCBhbnkgdHdlZW5zIHRvIGxhenktaW5pdCwgd2Ugc2hvdWxkIHJlbmRlciB0aGVtIGJlY2F1c2UgdHlwaWNhbGx5IHdoZW4gYSB0aW1lbGluZSBmaW5pc2hlcywgdXNlcnMgZXhwZWN0IHRoaW5ncyB0byBoYXZlIHJlbmRlcmVkIGZ1bGx5LiBJbWFnaW5lIGFuIG9uVXBkYXRlIG9uIGEgdGltZWxpbmUgdGhhdCByZXBvcnRzL2NoZWNrcyB0d2VlbmVkIHZhbHVlcy5cblx0XHRcdFx0XHRfbGF6eVJlbmRlcigpO1xuXHRcdFx0XHR9XG5cdFx0XHRcdHRoaXMuX2NhbGxiYWNrKFwib25VcGRhdGVcIik7XG5cdFx0XHR9XG5cblx0XHRcdGlmIChjYWxsYmFjaykgaWYgKCF0aGlzLl9nYykgaWYgKHByZXZTdGFydCA9PT0gdGhpcy5fc3RhcnRUaW1lIHx8IHByZXZUaW1lU2NhbGUgIT09IHRoaXMuX3RpbWVTY2FsZSkgaWYgKHRoaXMuX3RpbWUgPT09IDAgfHwgdG90YWxEdXIgPj0gdGhpcy50b3RhbER1cmF0aW9uKCkpIHsgLy9pZiBvbmUgb2YgdGhlIHR3ZWVucyB0aGF0IHdhcyByZW5kZXJlZCBhbHRlcmVkIHRoaXMgdGltZWxpbmUncyBzdGFydFRpbWUgKGxpa2UgaWYgYW4gb25Db21wbGV0ZSByZXZlcnNlZCB0aGUgdGltZWxpbmUpLCBpdCBwcm9iYWJseSBpc24ndCBjb21wbGV0ZS4gSWYgaXQgaXMsIGRvbid0IHdvcnJ5LCBiZWNhdXNlIHdoYXRldmVyIGNhbGwgYWx0ZXJlZCB0aGUgc3RhcnRUaW1lIHdvdWxkIGNvbXBsZXRlIGlmIGl0IHdhcyBuZWNlc3NhcnkgYXQgdGhlIG5ldyB0aW1lLiBUaGUgb25seSBleGNlcHRpb24gaXMgdGhlIHRpbWVTY2FsZSBwcm9wZXJ0eS4gQWxzbyBjaGVjayBfZ2MgYmVjYXVzZSB0aGVyZSdzIGEgY2hhbmNlIHRoYXQga2lsbCgpIGNvdWxkIGJlIGNhbGxlZCBpbiBhbiBvblVwZGF0ZVxuXHRcdFx0XHRpZiAoaXNDb21wbGV0ZSkge1xuXHRcdFx0XHRcdGlmIChfbGF6eVR3ZWVucy5sZW5ndGgpIHsgLy9pbiBjYXNlIHJlbmRlcmluZyBjYXVzZWQgYW55IHR3ZWVucyB0byBsYXp5LWluaXQsIHdlIHNob3VsZCByZW5kZXIgdGhlbSBiZWNhdXNlIHR5cGljYWxseSB3aGVuIGEgdGltZWxpbmUgZmluaXNoZXMsIHVzZXJzIGV4cGVjdCB0aGluZ3MgdG8gaGF2ZSByZW5kZXJlZCBmdWxseS4gSW1hZ2luZSBhbiBvbkNvbXBsZXRlIG9uIGEgdGltZWxpbmUgdGhhdCByZXBvcnRzL2NoZWNrcyB0d2VlbmVkIHZhbHVlcy5cblx0XHRcdFx0XHRcdF9sYXp5UmVuZGVyKCk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdGlmICh0aGlzLl90aW1lbGluZS5hdXRvUmVtb3ZlQ2hpbGRyZW4pIHtcblx0XHRcdFx0XHRcdHRoaXMuX2VuYWJsZWQoZmFsc2UsIGZhbHNlKTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0dGhpcy5fYWN0aXZlID0gZmFsc2U7XG5cdFx0XHRcdH1cblx0XHRcdFx0aWYgKCFzdXBwcmVzc0V2ZW50cyAmJiB0aGlzLnZhcnNbY2FsbGJhY2tdKSB7XG5cdFx0XHRcdFx0dGhpcy5fY2FsbGJhY2soY2FsbGJhY2spO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fTtcblxuXHRcdHAuX2hhc1BhdXNlZENoaWxkID0gZnVuY3Rpb24oKSB7XG5cdFx0XHR2YXIgdHdlZW4gPSB0aGlzLl9maXJzdDtcblx0XHRcdHdoaWxlICh0d2Vlbikge1xuXHRcdFx0XHRpZiAodHdlZW4uX3BhdXNlZCB8fCAoKHR3ZWVuIGluc3RhbmNlb2YgVGltZWxpbmVMaXRlKSAmJiB0d2Vlbi5faGFzUGF1c2VkQ2hpbGQoKSkpIHtcblx0XHRcdFx0XHRyZXR1cm4gdHJ1ZTtcblx0XHRcdFx0fVxuXHRcdFx0XHR0d2VlbiA9IHR3ZWVuLl9uZXh0O1xuXHRcdFx0fVxuXHRcdFx0cmV0dXJuIGZhbHNlO1xuXHRcdH07XG5cblx0XHRwLmdldENoaWxkcmVuID0gZnVuY3Rpb24obmVzdGVkLCB0d2VlbnMsIHRpbWVsaW5lcywgaWdub3JlQmVmb3JlVGltZSkge1xuXHRcdFx0aWdub3JlQmVmb3JlVGltZSA9IGlnbm9yZUJlZm9yZVRpbWUgfHwgLTk5OTk5OTk5OTk7XG5cdFx0XHR2YXIgYSA9IFtdLFxuXHRcdFx0XHR0d2VlbiA9IHRoaXMuX2ZpcnN0LFxuXHRcdFx0XHRjbnQgPSAwO1xuXHRcdFx0d2hpbGUgKHR3ZWVuKSB7XG5cdFx0XHRcdGlmICh0d2Vlbi5fc3RhcnRUaW1lIDwgaWdub3JlQmVmb3JlVGltZSkge1xuXHRcdFx0XHRcdC8vZG8gbm90aGluZ1xuXHRcdFx0XHR9IGVsc2UgaWYgKHR3ZWVuIGluc3RhbmNlb2YgVHdlZW5MaXRlKSB7XG5cdFx0XHRcdFx0aWYgKHR3ZWVucyAhPT0gZmFsc2UpIHtcblx0XHRcdFx0XHRcdGFbY250KytdID0gdHdlZW47XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdGlmICh0aW1lbGluZXMgIT09IGZhbHNlKSB7XG5cdFx0XHRcdFx0XHRhW2NudCsrXSA9IHR3ZWVuO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHRpZiAobmVzdGVkICE9PSBmYWxzZSkge1xuXHRcdFx0XHRcdFx0YSA9IGEuY29uY2F0KHR3ZWVuLmdldENoaWxkcmVuKHRydWUsIHR3ZWVucywgdGltZWxpbmVzKSk7XG5cdFx0XHRcdFx0XHRjbnQgPSBhLmxlbmd0aDtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblx0XHRcdFx0dHdlZW4gPSB0d2Vlbi5fbmV4dDtcblx0XHRcdH1cblx0XHRcdHJldHVybiBhO1xuXHRcdH07XG5cblx0XHRwLmdldFR3ZWVuc09mID0gZnVuY3Rpb24odGFyZ2V0LCBuZXN0ZWQpIHtcblx0XHRcdHZhciBkaXNhYmxlZCA9IHRoaXMuX2djLFxuXHRcdFx0XHRhID0gW10sXG5cdFx0XHRcdGNudCA9IDAsXG5cdFx0XHRcdHR3ZWVucywgaTtcblx0XHRcdGlmIChkaXNhYmxlZCkge1xuXHRcdFx0XHR0aGlzLl9lbmFibGVkKHRydWUsIHRydWUpOyAvL2dldFR3ZWVuc09mKCkgZmlsdGVycyBvdXQgZGlzYWJsZWQgdHdlZW5zLCBhbmQgd2UgaGF2ZSB0byBtYXJrIHRoZW0gYXMgX2djID0gdHJ1ZSB3aGVuIHRoZSB0aW1lbGluZSBjb21wbGV0ZXMgaW4gb3JkZXIgdG8gYWxsb3cgY2xlYW4gZ2FyYmFnZSBjb2xsZWN0aW9uLCBzbyB0ZW1wb3JhcmlseSByZS1lbmFibGUgdGhlIHRpbWVsaW5lIGhlcmUuXG5cdFx0XHR9XG5cdFx0XHR0d2VlbnMgPSBUd2VlbkxpdGUuZ2V0VHdlZW5zT2YodGFyZ2V0KTtcblx0XHRcdGkgPSB0d2VlbnMubGVuZ3RoO1xuXHRcdFx0d2hpbGUgKC0taSA+IC0xKSB7XG5cdFx0XHRcdGlmICh0d2VlbnNbaV0udGltZWxpbmUgPT09IHRoaXMgfHwgKG5lc3RlZCAmJiB0aGlzLl9jb250YWlucyh0d2VlbnNbaV0pKSkge1xuXHRcdFx0XHRcdGFbY250KytdID0gdHdlZW5zW2ldO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0XHRpZiAoZGlzYWJsZWQpIHtcblx0XHRcdFx0dGhpcy5fZW5hYmxlZChmYWxzZSwgdHJ1ZSk7XG5cdFx0XHR9XG5cdFx0XHRyZXR1cm4gYTtcblx0XHR9O1xuXG5cdFx0cC5yZWNlbnQgPSBmdW5jdGlvbigpIHtcblx0XHRcdHJldHVybiB0aGlzLl9yZWNlbnQ7XG5cdFx0fTtcblxuXHRcdHAuX2NvbnRhaW5zID0gZnVuY3Rpb24odHdlZW4pIHtcblx0XHRcdHZhciB0bCA9IHR3ZWVuLnRpbWVsaW5lO1xuXHRcdFx0d2hpbGUgKHRsKSB7XG5cdFx0XHRcdGlmICh0bCA9PT0gdGhpcykge1xuXHRcdFx0XHRcdHJldHVybiB0cnVlO1xuXHRcdFx0XHR9XG5cdFx0XHRcdHRsID0gdGwudGltZWxpbmU7XG5cdFx0XHR9XG5cdFx0XHRyZXR1cm4gZmFsc2U7XG5cdFx0fTtcblxuXHRcdHAuc2hpZnRDaGlsZHJlbiA9IGZ1bmN0aW9uKGFtb3VudCwgYWRqdXN0TGFiZWxzLCBpZ25vcmVCZWZvcmVUaW1lKSB7XG5cdFx0XHRpZ25vcmVCZWZvcmVUaW1lID0gaWdub3JlQmVmb3JlVGltZSB8fCAwO1xuXHRcdFx0dmFyIHR3ZWVuID0gdGhpcy5fZmlyc3QsXG5cdFx0XHRcdGxhYmVscyA9IHRoaXMuX2xhYmVscyxcblx0XHRcdFx0cDtcblx0XHRcdHdoaWxlICh0d2Vlbikge1xuXHRcdFx0XHRpZiAodHdlZW4uX3N0YXJ0VGltZSA+PSBpZ25vcmVCZWZvcmVUaW1lKSB7XG5cdFx0XHRcdFx0dHdlZW4uX3N0YXJ0VGltZSArPSBhbW91bnQ7XG5cdFx0XHRcdH1cblx0XHRcdFx0dHdlZW4gPSB0d2Vlbi5fbmV4dDtcblx0XHRcdH1cblx0XHRcdGlmIChhZGp1c3RMYWJlbHMpIHtcblx0XHRcdFx0Zm9yIChwIGluIGxhYmVscykge1xuXHRcdFx0XHRcdGlmIChsYWJlbHNbcF0gPj0gaWdub3JlQmVmb3JlVGltZSkge1xuXHRcdFx0XHRcdFx0bGFiZWxzW3BdICs9IGFtb3VudDtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHRcdHJldHVybiB0aGlzLl91bmNhY2hlKHRydWUpO1xuXHRcdH07XG5cblx0XHRwLl9raWxsID0gZnVuY3Rpb24odmFycywgdGFyZ2V0KSB7XG5cdFx0XHRpZiAoIXZhcnMgJiYgIXRhcmdldCkge1xuXHRcdFx0XHRyZXR1cm4gdGhpcy5fZW5hYmxlZChmYWxzZSwgZmFsc2UpO1xuXHRcdFx0fVxuXHRcdFx0dmFyIHR3ZWVucyA9ICghdGFyZ2V0KSA/IHRoaXMuZ2V0Q2hpbGRyZW4odHJ1ZSwgdHJ1ZSwgZmFsc2UpIDogdGhpcy5nZXRUd2VlbnNPZih0YXJnZXQpLFxuXHRcdFx0XHRpID0gdHdlZW5zLmxlbmd0aCxcblx0XHRcdFx0Y2hhbmdlZCA9IGZhbHNlO1xuXHRcdFx0d2hpbGUgKC0taSA+IC0xKSB7XG5cdFx0XHRcdGlmICh0d2VlbnNbaV0uX2tpbGwodmFycywgdGFyZ2V0KSkge1xuXHRcdFx0XHRcdGNoYW5nZWQgPSB0cnVlO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0XHRyZXR1cm4gY2hhbmdlZDtcblx0XHR9O1xuXG5cdFx0cC5jbGVhciA9IGZ1bmN0aW9uKGxhYmVscykge1xuXHRcdFx0dmFyIHR3ZWVucyA9IHRoaXMuZ2V0Q2hpbGRyZW4oZmFsc2UsIHRydWUsIHRydWUpLFxuXHRcdFx0XHRpID0gdHdlZW5zLmxlbmd0aDtcblx0XHRcdHRoaXMuX3RpbWUgPSB0aGlzLl90b3RhbFRpbWUgPSAwO1xuXHRcdFx0d2hpbGUgKC0taSA+IC0xKSB7XG5cdFx0XHRcdHR3ZWVuc1tpXS5fZW5hYmxlZChmYWxzZSwgZmFsc2UpO1xuXHRcdFx0fVxuXHRcdFx0aWYgKGxhYmVscyAhPT0gZmFsc2UpIHtcblx0XHRcdFx0dGhpcy5fbGFiZWxzID0ge307XG5cdFx0XHR9XG5cdFx0XHRyZXR1cm4gdGhpcy5fdW5jYWNoZSh0cnVlKTtcblx0XHR9O1xuXG5cdFx0cC5pbnZhbGlkYXRlID0gZnVuY3Rpb24oKSB7XG5cdFx0XHR2YXIgdHdlZW4gPSB0aGlzLl9maXJzdDtcblx0XHRcdHdoaWxlICh0d2Vlbikge1xuXHRcdFx0XHR0d2Vlbi5pbnZhbGlkYXRlKCk7XG5cdFx0XHRcdHR3ZWVuID0gdHdlZW4uX25leHQ7XG5cdFx0XHR9XG5cdFx0XHRyZXR1cm4gQW5pbWF0aW9uLnByb3RvdHlwZS5pbnZhbGlkYXRlLmNhbGwodGhpcyk7O1xuXHRcdH07XG5cblx0XHRwLl9lbmFibGVkID0gZnVuY3Rpb24oZW5hYmxlZCwgaWdub3JlVGltZWxpbmUpIHtcblx0XHRcdGlmIChlbmFibGVkID09PSB0aGlzLl9nYykge1xuXHRcdFx0XHR2YXIgdHdlZW4gPSB0aGlzLl9maXJzdDtcblx0XHRcdFx0d2hpbGUgKHR3ZWVuKSB7XG5cdFx0XHRcdFx0dHdlZW4uX2VuYWJsZWQoZW5hYmxlZCwgdHJ1ZSk7XG5cdFx0XHRcdFx0dHdlZW4gPSB0d2Vlbi5fbmV4dDtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdFx0cmV0dXJuIFNpbXBsZVRpbWVsaW5lLnByb3RvdHlwZS5fZW5hYmxlZC5jYWxsKHRoaXMsIGVuYWJsZWQsIGlnbm9yZVRpbWVsaW5lKTtcblx0XHR9O1xuXG5cdFx0cC50b3RhbFRpbWUgPSBmdW5jdGlvbih0aW1lLCBzdXBwcmVzc0V2ZW50cywgdW5jYXBwZWQpIHtcblx0XHRcdHRoaXMuX2ZvcmNpbmdQbGF5aGVhZCA9IHRydWU7XG5cdFx0XHR2YXIgdmFsID0gQW5pbWF0aW9uLnByb3RvdHlwZS50b3RhbFRpbWUuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcblx0XHRcdHRoaXMuX2ZvcmNpbmdQbGF5aGVhZCA9IGZhbHNlO1xuXHRcdFx0cmV0dXJuIHZhbDtcblx0XHR9O1xuXG5cdFx0cC5kdXJhdGlvbiA9IGZ1bmN0aW9uKHZhbHVlKSB7XG5cdFx0XHRpZiAoIWFyZ3VtZW50cy5sZW5ndGgpIHtcblx0XHRcdFx0aWYgKHRoaXMuX2RpcnR5KSB7XG5cdFx0XHRcdFx0dGhpcy50b3RhbER1cmF0aW9uKCk7IC8vanVzdCB0cmlnZ2VycyByZWNhbGN1bGF0aW9uXG5cdFx0XHRcdH1cblx0XHRcdFx0cmV0dXJuIHRoaXMuX2R1cmF0aW9uO1xuXHRcdFx0fVxuXHRcdFx0aWYgKHRoaXMuZHVyYXRpb24oKSAhPT0gMCAmJiB2YWx1ZSAhPT0gMCkge1xuXHRcdFx0XHR0aGlzLnRpbWVTY2FsZSh0aGlzLl9kdXJhdGlvbiAvIHZhbHVlKTtcblx0XHRcdH1cblx0XHRcdHJldHVybiB0aGlzO1xuXHRcdH07XG5cblx0XHRwLnRvdGFsRHVyYXRpb24gPSBmdW5jdGlvbih2YWx1ZSkge1xuXHRcdFx0aWYgKCFhcmd1bWVudHMubGVuZ3RoKSB7XG5cdFx0XHRcdGlmICh0aGlzLl9kaXJ0eSkge1xuXHRcdFx0XHRcdHZhciBtYXggPSAwLFxuXHRcdFx0XHRcdFx0dHdlZW4gPSB0aGlzLl9sYXN0LFxuXHRcdFx0XHRcdFx0cHJldlN0YXJ0ID0gOTk5OTk5OTk5OTk5LFxuXHRcdFx0XHRcdFx0cHJldiwgZW5kO1xuXHRcdFx0XHRcdHdoaWxlICh0d2Vlbikge1xuXHRcdFx0XHRcdFx0cHJldiA9IHR3ZWVuLl9wcmV2OyAvL3JlY29yZCBpdCBoZXJlIGluIGNhc2UgdGhlIHR3ZWVuIGNoYW5nZXMgcG9zaXRpb24gaW4gdGhlIHNlcXVlbmNlLi4uXG5cdFx0XHRcdFx0XHRpZiAodHdlZW4uX2RpcnR5KSB7XG5cdFx0XHRcdFx0XHRcdHR3ZWVuLnRvdGFsRHVyYXRpb24oKTsgLy9jb3VsZCBjaGFuZ2UgdGhlIHR3ZWVuLl9zdGFydFRpbWUsIHNvIG1ha2Ugc3VyZSB0aGUgdHdlZW4ncyBjYWNoZSBpcyBjbGVhbiBiZWZvcmUgYW5hbHl6aW5nIGl0LlxuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0aWYgKHR3ZWVuLl9zdGFydFRpbWUgPiBwcmV2U3RhcnQgJiYgdGhpcy5fc29ydENoaWxkcmVuICYmICF0d2Vlbi5fcGF1c2VkKSB7IC8vaW4gY2FzZSBvbmUgb2YgdGhlIHR3ZWVucyBzaGlmdGVkIG91dCBvZiBvcmRlciwgaXQgbmVlZHMgdG8gYmUgcmUtaW5zZXJ0ZWQgaW50byB0aGUgY29ycmVjdCBwb3NpdGlvbiBpbiB0aGUgc2VxdWVuY2Vcblx0XHRcdFx0XHRcdFx0dGhpcy5hZGQodHdlZW4sIHR3ZWVuLl9zdGFydFRpbWUgLSB0d2Vlbi5fZGVsYXkpO1xuXHRcdFx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRcdFx0cHJldlN0YXJ0ID0gdHdlZW4uX3N0YXJ0VGltZTtcblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdGlmICh0d2Vlbi5fc3RhcnRUaW1lIDwgMCAmJiAhdHdlZW4uX3BhdXNlZCkgeyAvL2NoaWxkcmVuIGFyZW4ndCBhbGxvd2VkIHRvIGhhdmUgbmVnYXRpdmUgc3RhcnRUaW1lcyB1bmxlc3Mgc21vb3RoQ2hpbGRUaW1pbmcgaXMgdHJ1ZSwgc28gYWRqdXN0IGhlcmUgaWYgb25lIGlzIGZvdW5kLlxuXHRcdFx0XHRcdFx0XHRtYXggLT0gdHdlZW4uX3N0YXJ0VGltZTtcblx0XHRcdFx0XHRcdFx0aWYgKHRoaXMuX3RpbWVsaW5lLnNtb290aENoaWxkVGltaW5nKSB7XG5cdFx0XHRcdFx0XHRcdFx0dGhpcy5fc3RhcnRUaW1lICs9IHR3ZWVuLl9zdGFydFRpbWUgLyB0aGlzLl90aW1lU2NhbGU7XG5cdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdFx0dGhpcy5zaGlmdENoaWxkcmVuKC10d2Vlbi5fc3RhcnRUaW1lLCBmYWxzZSwgLTk5OTk5OTk5OTkpO1xuXHRcdFx0XHRcdFx0XHRwcmV2U3RhcnQgPSAwO1xuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0ZW5kID0gdHdlZW4uX3N0YXJ0VGltZSArICh0d2Vlbi5fdG90YWxEdXJhdGlvbiAvIHR3ZWVuLl90aW1lU2NhbGUpO1xuXHRcdFx0XHRcdFx0aWYgKGVuZCA+IG1heCkge1xuXHRcdFx0XHRcdFx0XHRtYXggPSBlbmQ7XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHR0d2VlbiA9IHByZXY7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdHRoaXMuX2R1cmF0aW9uID0gdGhpcy5fdG90YWxEdXJhdGlvbiA9IG1heDtcblx0XHRcdFx0XHR0aGlzLl9kaXJ0eSA9IGZhbHNlO1xuXHRcdFx0XHR9XG5cdFx0XHRcdHJldHVybiB0aGlzLl90b3RhbER1cmF0aW9uO1xuXHRcdFx0fVxuXHRcdFx0cmV0dXJuICh2YWx1ZSAmJiB0aGlzLnRvdGFsRHVyYXRpb24oKSkgPyB0aGlzLnRpbWVTY2FsZSh0aGlzLl90b3RhbER1cmF0aW9uIC8gdmFsdWUpIDogdGhpcztcblx0XHR9O1xuXG5cdFx0cC5wYXVzZWQgPSBmdW5jdGlvbih2YWx1ZSkge1xuXHRcdFx0aWYgKCF2YWx1ZSkgeyAvL2lmIHRoZXJlJ3MgYSBwYXVzZSBkaXJlY3RseSBhdCB0aGUgc3BvdCBmcm9tIHdoZXJlIHdlJ3JlIHVucGF1c2luZywgc2tpcCBpdC5cblx0XHRcdFx0dmFyIHR3ZWVuID0gdGhpcy5fZmlyc3QsXG5cdFx0XHRcdFx0dGltZSA9IHRoaXMuX3RpbWU7XG5cdFx0XHRcdHdoaWxlICh0d2Vlbikge1xuXHRcdFx0XHRcdGlmICh0d2Vlbi5fc3RhcnRUaW1lID09PSB0aW1lICYmIHR3ZWVuLmRhdGEgPT09IFwiaXNQYXVzZVwiKSB7XG5cdFx0XHRcdFx0XHR0d2Vlbi5fcmF3UHJldlRpbWUgPSAwOyAvL3JlbWVtYmVyLCBfcmF3UHJldlRpbWUgaXMgaG93IHplcm8tZHVyYXRpb24gdHdlZW5zL2NhbGxiYWNrcyBzZW5zZSBkaXJlY3Rpb25hbGl0eSBhbmQgZGV0ZXJtaW5lIHdoZXRoZXIgb3Igbm90IHRvIGZpcmUuIElmIF9yYXdQcmV2VGltZSBpcyB0aGUgc2FtZSBhcyBfc3RhcnRUaW1lIG9uIHRoZSBuZXh0IHJlbmRlciwgaXQgd29uJ3QgZmlyZS5cblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0dHdlZW4gPSB0d2Vlbi5fbmV4dDtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdFx0cmV0dXJuIEFuaW1hdGlvbi5wcm90b3R5cGUucGF1c2VkLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG5cdFx0fTtcblxuXHRcdHAudXNlc0ZyYW1lcyA9IGZ1bmN0aW9uKCkge1xuXHRcdFx0dmFyIHRsID0gdGhpcy5fdGltZWxpbmU7XG5cdFx0XHR3aGlsZSAodGwuX3RpbWVsaW5lKSB7XG5cdFx0XHRcdHRsID0gdGwuX3RpbWVsaW5lO1xuXHRcdFx0fVxuXHRcdFx0cmV0dXJuICh0bCA9PT0gQW5pbWF0aW9uLl9yb290RnJhbWVzVGltZWxpbmUpO1xuXHRcdH07XG5cblx0XHRwLnJhd1RpbWUgPSBmdW5jdGlvbigpIHtcblx0XHRcdHJldHVybiB0aGlzLl9wYXVzZWQgPyB0aGlzLl90b3RhbFRpbWUgOiAodGhpcy5fdGltZWxpbmUucmF3VGltZSgpIC0gdGhpcy5fc3RhcnRUaW1lKSAqIHRoaXMuX3RpbWVTY2FsZTtcblx0XHR9O1xuXG5cdFx0cmV0dXJuIFRpbWVsaW5lTGl0ZTtcblxuXHR9LCB0cnVlKTtcblxuXG5cblxuXG5cblxuXG5cdFxuXHRcblx0XG5cdFxuXHRcbi8qXG4gKiAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gKiBUaW1lbGluZU1heFxuICogLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICovXG5cdF9nc1Njb3BlLl9nc0RlZmluZShcIlRpbWVsaW5lTWF4XCIsIFtcIlRpbWVsaW5lTGl0ZVwiLFwiVHdlZW5MaXRlXCIsXCJlYXNpbmcuRWFzZVwiXSwgZnVuY3Rpb24oVGltZWxpbmVMaXRlLCBUd2VlbkxpdGUsIEVhc2UpIHtcblxuXHRcdHZhciBUaW1lbGluZU1heCA9IGZ1bmN0aW9uKHZhcnMpIHtcblx0XHRcdFx0VGltZWxpbmVMaXRlLmNhbGwodGhpcywgdmFycyk7XG5cdFx0XHRcdHRoaXMuX3JlcGVhdCA9IHRoaXMudmFycy5yZXBlYXQgfHwgMDtcblx0XHRcdFx0dGhpcy5fcmVwZWF0RGVsYXkgPSB0aGlzLnZhcnMucmVwZWF0RGVsYXkgfHwgMDtcblx0XHRcdFx0dGhpcy5fY3ljbGUgPSAwO1xuXHRcdFx0XHR0aGlzLl95b3lvID0gKHRoaXMudmFycy55b3lvID09PSB0cnVlKTtcblx0XHRcdFx0dGhpcy5fZGlydHkgPSB0cnVlO1xuXHRcdFx0fSxcblx0XHRcdF90aW55TnVtID0gMC4wMDAwMDAwMDAxLFxuXHRcdFx0VHdlZW5MaXRlSW50ZXJuYWxzID0gVHdlZW5MaXRlLl9pbnRlcm5hbHMsXG5cdFx0XHRfbGF6eVR3ZWVucyA9IFR3ZWVuTGl0ZUludGVybmFscy5sYXp5VHdlZW5zLFxuXHRcdFx0X2xhenlSZW5kZXIgPSBUd2VlbkxpdGVJbnRlcm5hbHMubGF6eVJlbmRlcixcblx0XHRcdF9lYXNlTm9uZSA9IG5ldyBFYXNlKG51bGwsIG51bGwsIDEsIDApLFxuXHRcdFx0cCA9IFRpbWVsaW5lTWF4LnByb3RvdHlwZSA9IG5ldyBUaW1lbGluZUxpdGUoKTtcblxuXHRcdHAuY29uc3RydWN0b3IgPSBUaW1lbGluZU1heDtcblx0XHRwLmtpbGwoKS5fZ2MgPSBmYWxzZTtcblx0XHRUaW1lbGluZU1heC52ZXJzaW9uID0gXCIxLjE4LjJcIjtcblxuXHRcdHAuaW52YWxpZGF0ZSA9IGZ1bmN0aW9uKCkge1xuXHRcdFx0dGhpcy5feW95byA9ICh0aGlzLnZhcnMueW95byA9PT0gdHJ1ZSk7XG5cdFx0XHR0aGlzLl9yZXBlYXQgPSB0aGlzLnZhcnMucmVwZWF0IHx8IDA7XG5cdFx0XHR0aGlzLl9yZXBlYXREZWxheSA9IHRoaXMudmFycy5yZXBlYXREZWxheSB8fCAwO1xuXHRcdFx0dGhpcy5fdW5jYWNoZSh0cnVlKTtcblx0XHRcdHJldHVybiBUaW1lbGluZUxpdGUucHJvdG90eXBlLmludmFsaWRhdGUuY2FsbCh0aGlzKTtcblx0XHR9O1xuXG5cdFx0cC5hZGRDYWxsYmFjayA9IGZ1bmN0aW9uKGNhbGxiYWNrLCBwb3NpdGlvbiwgcGFyYW1zLCBzY29wZSkge1xuXHRcdFx0cmV0dXJuIHRoaXMuYWRkKCBUd2VlbkxpdGUuZGVsYXllZENhbGwoMCwgY2FsbGJhY2ssIHBhcmFtcywgc2NvcGUpLCBwb3NpdGlvbik7XG5cdFx0fTtcblxuXHRcdHAucmVtb3ZlQ2FsbGJhY2sgPSBmdW5jdGlvbihjYWxsYmFjaywgcG9zaXRpb24pIHtcblx0XHRcdGlmIChjYWxsYmFjaykge1xuXHRcdFx0XHRpZiAocG9zaXRpb24gPT0gbnVsbCkge1xuXHRcdFx0XHRcdHRoaXMuX2tpbGwobnVsbCwgY2FsbGJhY2spO1xuXHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdHZhciBhID0gdGhpcy5nZXRUd2VlbnNPZihjYWxsYmFjaywgZmFsc2UpLFxuXHRcdFx0XHRcdFx0aSA9IGEubGVuZ3RoLFxuXHRcdFx0XHRcdFx0dGltZSA9IHRoaXMuX3BhcnNlVGltZU9yTGFiZWwocG9zaXRpb24pO1xuXHRcdFx0XHRcdHdoaWxlICgtLWkgPiAtMSkge1xuXHRcdFx0XHRcdFx0aWYgKGFbaV0uX3N0YXJ0VGltZSA9PT0gdGltZSkge1xuXHRcdFx0XHRcdFx0XHRhW2ldLl9lbmFibGVkKGZhbHNlLCBmYWxzZSk7XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0XHRyZXR1cm4gdGhpcztcblx0XHR9O1xuXG5cdFx0cC5yZW1vdmVQYXVzZSA9IGZ1bmN0aW9uKHBvc2l0aW9uKSB7XG5cdFx0XHRyZXR1cm4gdGhpcy5yZW1vdmVDYWxsYmFjayhUaW1lbGluZUxpdGUuX2ludGVybmFscy5wYXVzZUNhbGxiYWNrLCBwb3NpdGlvbik7XG5cdFx0fTtcblxuXHRcdHAudHdlZW5UbyA9IGZ1bmN0aW9uKHBvc2l0aW9uLCB2YXJzKSB7XG5cdFx0XHR2YXJzID0gdmFycyB8fCB7fTtcblx0XHRcdHZhciBjb3B5ID0ge2Vhc2U6X2Vhc2VOb25lLCB1c2VGcmFtZXM6dGhpcy51c2VzRnJhbWVzKCksIGltbWVkaWF0ZVJlbmRlcjpmYWxzZX0sXG5cdFx0XHRcdGR1cmF0aW9uLCBwLCB0O1xuXHRcdFx0Zm9yIChwIGluIHZhcnMpIHtcblx0XHRcdFx0Y29weVtwXSA9IHZhcnNbcF07XG5cdFx0XHR9XG5cdFx0XHRjb3B5LnRpbWUgPSB0aGlzLl9wYXJzZVRpbWVPckxhYmVsKHBvc2l0aW9uKTtcblx0XHRcdGR1cmF0aW9uID0gKE1hdGguYWJzKE51bWJlcihjb3B5LnRpbWUpIC0gdGhpcy5fdGltZSkgLyB0aGlzLl90aW1lU2NhbGUpIHx8IDAuMDAxO1xuXHRcdFx0dCA9IG5ldyBUd2VlbkxpdGUodGhpcywgZHVyYXRpb24sIGNvcHkpO1xuXHRcdFx0Y29weS5vblN0YXJ0ID0gZnVuY3Rpb24oKSB7XG5cdFx0XHRcdHQudGFyZ2V0LnBhdXNlZCh0cnVlKTtcblx0XHRcdFx0aWYgKHQudmFycy50aW1lICE9PSB0LnRhcmdldC50aW1lKCkgJiYgZHVyYXRpb24gPT09IHQuZHVyYXRpb24oKSkgeyAvL2Rvbid0IG1ha2UgdGhlIGR1cmF0aW9uIHplcm8gLSBpZiBpdCdzIHN1cHBvc2VkIHRvIGJlIHplcm8sIGRvbid0IHdvcnJ5IGJlY2F1c2UgaXQncyBhbHJlYWR5IGluaXR0aW5nIHRoZSB0d2VlbiBhbmQgd2lsbCBjb21wbGV0ZSBpbW1lZGlhdGVseSwgZWZmZWN0aXZlbHkgbWFraW5nIHRoZSBkdXJhdGlvbiB6ZXJvIGFueXdheS4gSWYgd2UgbWFrZSBkdXJhdGlvbiB6ZXJvLCB0aGUgdHdlZW4gd29uJ3QgcnVuIGF0IGFsbC5cblx0XHRcdFx0XHR0LmR1cmF0aW9uKCBNYXRoLmFicyggdC52YXJzLnRpbWUgLSB0LnRhcmdldC50aW1lKCkpIC8gdC50YXJnZXQuX3RpbWVTY2FsZSApO1xuXHRcdFx0XHR9XG5cdFx0XHRcdGlmICh2YXJzLm9uU3RhcnQpIHsgLy9pbiBjYXNlIHRoZSB1c2VyIGhhZCBhbiBvblN0YXJ0IGluIHRoZSB2YXJzIC0gd2UgZG9uJ3Qgd2FudCB0byBvdmVyd3JpdGUgaXQuXG5cdFx0XHRcdFx0dC5fY2FsbGJhY2soXCJvblN0YXJ0XCIpO1xuXHRcdFx0XHR9XG5cdFx0XHR9O1xuXHRcdFx0cmV0dXJuIHQ7XG5cdFx0fTtcblxuXHRcdHAudHdlZW5Gcm9tVG8gPSBmdW5jdGlvbihmcm9tUG9zaXRpb24sIHRvUG9zaXRpb24sIHZhcnMpIHtcblx0XHRcdHZhcnMgPSB2YXJzIHx8IHt9O1xuXHRcdFx0ZnJvbVBvc2l0aW9uID0gdGhpcy5fcGFyc2VUaW1lT3JMYWJlbChmcm9tUG9zaXRpb24pO1xuXHRcdFx0dmFycy5zdGFydEF0ID0ge29uQ29tcGxldGU6dGhpcy5zZWVrLCBvbkNvbXBsZXRlUGFyYW1zOltmcm9tUG9zaXRpb25dLCBjYWxsYmFja1Njb3BlOnRoaXN9O1xuXHRcdFx0dmFycy5pbW1lZGlhdGVSZW5kZXIgPSAodmFycy5pbW1lZGlhdGVSZW5kZXIgIT09IGZhbHNlKTtcblx0XHRcdHZhciB0ID0gdGhpcy50d2VlblRvKHRvUG9zaXRpb24sIHZhcnMpO1xuXHRcdFx0cmV0dXJuIHQuZHVyYXRpb24oKE1hdGguYWJzKCB0LnZhcnMudGltZSAtIGZyb21Qb3NpdGlvbikgLyB0aGlzLl90aW1lU2NhbGUpIHx8IDAuMDAxKTtcblx0XHR9O1xuXG5cdFx0cC5yZW5kZXIgPSBmdW5jdGlvbih0aW1lLCBzdXBwcmVzc0V2ZW50cywgZm9yY2UpIHtcblx0XHRcdGlmICh0aGlzLl9nYykge1xuXHRcdFx0XHR0aGlzLl9lbmFibGVkKHRydWUsIGZhbHNlKTtcblx0XHRcdH1cblx0XHRcdHZhciB0b3RhbER1ciA9ICghdGhpcy5fZGlydHkpID8gdGhpcy5fdG90YWxEdXJhdGlvbiA6IHRoaXMudG90YWxEdXJhdGlvbigpLFxuXHRcdFx0XHRkdXIgPSB0aGlzLl9kdXJhdGlvbixcblx0XHRcdFx0cHJldlRpbWUgPSB0aGlzLl90aW1lLFxuXHRcdFx0XHRwcmV2VG90YWxUaW1lID0gdGhpcy5fdG90YWxUaW1lLFxuXHRcdFx0XHRwcmV2U3RhcnQgPSB0aGlzLl9zdGFydFRpbWUsXG5cdFx0XHRcdHByZXZUaW1lU2NhbGUgPSB0aGlzLl90aW1lU2NhbGUsXG5cdFx0XHRcdHByZXZSYXdQcmV2VGltZSA9IHRoaXMuX3Jhd1ByZXZUaW1lLFxuXHRcdFx0XHRwcmV2UGF1c2VkID0gdGhpcy5fcGF1c2VkLFxuXHRcdFx0XHRwcmV2Q3ljbGUgPSB0aGlzLl9jeWNsZSxcblx0XHRcdFx0dHdlZW4sIGlzQ29tcGxldGUsIG5leHQsIGNhbGxiYWNrLCBpbnRlcm5hbEZvcmNlLCBjeWNsZUR1cmF0aW9uLCBwYXVzZVR3ZWVuLCBjdXJUaW1lO1xuXHRcdFx0aWYgKHRpbWUgPj0gdG90YWxEdXIgLSAwLjAwMDAwMDEpIHsgLy90byB3b3JrIGFyb3VuZCBvY2Nhc2lvbmFsIGZsb2F0aW5nIHBvaW50IG1hdGggYXJ0aWZhY3RzLlxuXHRcdFx0XHRpZiAoIXRoaXMuX2xvY2tlZCkge1xuXHRcdFx0XHRcdHRoaXMuX3RvdGFsVGltZSA9IHRvdGFsRHVyO1xuXHRcdFx0XHRcdHRoaXMuX2N5Y2xlID0gdGhpcy5fcmVwZWF0O1xuXHRcdFx0XHR9XG5cdFx0XHRcdGlmICghdGhpcy5fcmV2ZXJzZWQpIGlmICghdGhpcy5faGFzUGF1c2VkQ2hpbGQoKSkge1xuXHRcdFx0XHRcdGlzQ29tcGxldGUgPSB0cnVlO1xuXHRcdFx0XHRcdGNhbGxiYWNrID0gXCJvbkNvbXBsZXRlXCI7XG5cdFx0XHRcdFx0aW50ZXJuYWxGb3JjZSA9ICEhdGhpcy5fdGltZWxpbmUuYXV0b1JlbW92ZUNoaWxkcmVuOyAvL290aGVyd2lzZSwgaWYgdGhlIGFuaW1hdGlvbiBpcyB1bnBhdXNlZC9hY3RpdmF0ZWQgYWZ0ZXIgaXQncyBhbHJlYWR5IGZpbmlzaGVkLCBpdCBkb2Vzbid0IGdldCByZW1vdmVkIGZyb20gdGhlIHBhcmVudCB0aW1lbGluZS5cblx0XHRcdFx0XHRpZiAodGhpcy5fZHVyYXRpb24gPT09IDApIGlmICgodGltZSA8PSAwICYmIHRpbWUgPj0gLTAuMDAwMDAwMSkgfHwgcHJldlJhd1ByZXZUaW1lIDwgMCB8fCBwcmV2UmF3UHJldlRpbWUgPT09IF90aW55TnVtKSBpZiAocHJldlJhd1ByZXZUaW1lICE9PSB0aW1lICYmIHRoaXMuX2ZpcnN0KSB7XG5cdFx0XHRcdFx0XHRpbnRlcm5hbEZvcmNlID0gdHJ1ZTtcblx0XHRcdFx0XHRcdGlmIChwcmV2UmF3UHJldlRpbWUgPiBfdGlueU51bSkge1xuXHRcdFx0XHRcdFx0XHRjYWxsYmFjayA9IFwib25SZXZlcnNlQ29tcGxldGVcIjtcblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblx0XHRcdFx0dGhpcy5fcmF3UHJldlRpbWUgPSAodGhpcy5fZHVyYXRpb24gfHwgIXN1cHByZXNzRXZlbnRzIHx8IHRpbWUgfHwgdGhpcy5fcmF3UHJldlRpbWUgPT09IHRpbWUpID8gdGltZSA6IF90aW55TnVtOyAvL3doZW4gdGhlIHBsYXloZWFkIGFycml2ZXMgYXQgRVhBQ1RMWSB0aW1lIDAgKHJpZ2h0IG9uIHRvcCkgb2YgYSB6ZXJvLWR1cmF0aW9uIHRpbWVsaW5lIG9yIHR3ZWVuLCB3ZSBuZWVkIHRvIGRpc2Nlcm4gaWYgZXZlbnRzIGFyZSBzdXBwcmVzc2VkIHNvIHRoYXQgd2hlbiB0aGUgcGxheWhlYWQgbW92ZXMgYWdhaW4gKG5leHQgdGltZSksIGl0J2xsIHRyaWdnZXIgdGhlIGNhbGxiYWNrLiBJZiBldmVudHMgYXJlIE5PVCBzdXBwcmVzc2VkLCBvYnZpb3VzbHkgdGhlIGNhbGxiYWNrIHdvdWxkIGJlIHRyaWdnZXJlZCBpbiB0aGlzIHJlbmRlci4gQmFzaWNhbGx5LCB0aGUgY2FsbGJhY2sgc2hvdWxkIGZpcmUgZWl0aGVyIHdoZW4gdGhlIHBsYXloZWFkIEFSUklWRVMgb3IgTEVBVkVTIHRoaXMgZXhhY3Qgc3BvdCwgbm90IGJvdGguIEltYWdpbmUgZG9pbmcgYSB0aW1lbGluZS5zZWVrKDApIGFuZCB0aGVyZSdzIGEgY2FsbGJhY2sgdGhhdCBzaXRzIGF0IDAuIFNpbmNlIGV2ZW50cyBhcmUgc3VwcHJlc3NlZCBvbiB0aGF0IHNlZWsoKSBieSBkZWZhdWx0LCBub3RoaW5nIHdpbGwgZmlyZSwgYnV0IHdoZW4gdGhlIHBsYXloZWFkIG1vdmVzIG9mZiBvZiB0aGF0IHBvc2l0aW9uLCB0aGUgY2FsbGJhY2sgc2hvdWxkIGZpcmUuIFRoaXMgYmVoYXZpb3IgaXMgd2hhdCBwZW9wbGUgaW50dWl0aXZlbHkgZXhwZWN0LiBXZSBzZXQgdGhlIF9yYXdQcmV2VGltZSB0byBiZSBhIHByZWNpc2UgdGlueSBudW1iZXIgdG8gaW5kaWNhdGUgdGhpcyBzY2VuYXJpbyByYXRoZXIgdGhhbiB1c2luZyBhbm90aGVyIHByb3BlcnR5L3ZhcmlhYmxlIHdoaWNoIHdvdWxkIGluY3JlYXNlIG1lbW9yeSB1c2FnZS4gVGhpcyB0ZWNobmlxdWUgaXMgbGVzcyByZWFkYWJsZSwgYnV0IG1vcmUgZWZmaWNpZW50LlxuXHRcdFx0XHRpZiAodGhpcy5feW95byAmJiAodGhpcy5fY3ljbGUgJiAxKSAhPT0gMCkge1xuXHRcdFx0XHRcdHRoaXMuX3RpbWUgPSB0aW1lID0gMDtcblx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHR0aGlzLl90aW1lID0gZHVyO1xuXHRcdFx0XHRcdHRpbWUgPSBkdXIgKyAwLjAwMDE7IC8vdG8gYXZvaWQgb2NjYXNpb25hbCBmbG9hdGluZyBwb2ludCByb3VuZGluZyBlcnJvcnMgLSBzb21ldGltZXMgY2hpbGQgdHdlZW5zL3RpbWVsaW5lcyB3ZXJlIG5vdCBiZWluZyBmdWxseSBjb21wbGV0ZWQgKHRoZWlyIHByb2dyZXNzIG1pZ2h0IGJlIDAuOTk5OTk5OTk5OTk5OTk4IGluc3RlYWQgb2YgMSBiZWNhdXNlIHdoZW4gX3RpbWUgLSB0d2Vlbi5fc3RhcnRUaW1lIGlzIHBlcmZvcm1lZCwgZmxvYXRpbmcgcG9pbnQgZXJyb3JzIHdvdWxkIHJldHVybiBhIHZhbHVlIHRoYXQgd2FzIFNMSUdIVExZIG9mZikuIFRyeSAoOTk5OTk5OTk5OTk5LjcgLSA5OTk5OTk5OTk5OTkpICogMSA9IDAuNjk5OTUxMTcxODc1IGluc3RlYWQgb2YgMC43LiBXZSBjYW5ub3QgZG8gbGVzcyB0aGVuIDAuMDAwMSBiZWNhdXNlIHRoZSBzYW1lIGlzc3VlIGNhbiBvY2N1ciB3aGVuIHRoZSBkdXJhdGlvbiBpcyBleHRyZW1lbHkgbGFyZ2UgbGlrZSA5OTk5OTk5OTk5OTkgaW4gd2hpY2ggY2FzZSBhZGRpbmcgMC4wMDAwMDAwMSwgZm9yIGV4YW1wbGUsIGNhdXNlcyBpdCB0byBhY3QgbGlrZSBub3RoaW5nIHdhcyBhZGRlZC5cblx0XHRcdFx0fVxuXG5cdFx0XHR9IGVsc2UgaWYgKHRpbWUgPCAwLjAwMDAwMDEpIHsgLy90byB3b3JrIGFyb3VuZCBvY2Nhc2lvbmFsIGZsb2F0aW5nIHBvaW50IG1hdGggYXJ0aWZhY3RzLCByb3VuZCBzdXBlciBzbWFsbCB2YWx1ZXMgdG8gMC5cblx0XHRcdFx0aWYgKCF0aGlzLl9sb2NrZWQpIHtcblx0XHRcdFx0XHR0aGlzLl90b3RhbFRpbWUgPSB0aGlzLl9jeWNsZSA9IDA7XG5cdFx0XHRcdH1cblx0XHRcdFx0dGhpcy5fdGltZSA9IDA7XG5cdFx0XHRcdGlmIChwcmV2VGltZSAhPT0gMCB8fCAoZHVyID09PSAwICYmIHByZXZSYXdQcmV2VGltZSAhPT0gX3RpbnlOdW0gJiYgKHByZXZSYXdQcmV2VGltZSA+IDAgfHwgKHRpbWUgPCAwICYmIHByZXZSYXdQcmV2VGltZSA+PSAwKSkgJiYgIXRoaXMuX2xvY2tlZCkpIHsgLy9lZGdlIGNhc2UgZm9yIGNoZWNraW5nIHRpbWUgPCAwICYmIHByZXZSYXdQcmV2VGltZSA+PSAwOiBhIHplcm8tZHVyYXRpb24gZnJvbVRvKCkgdHdlZW4gaW5zaWRlIGEgemVyby1kdXJhdGlvbiB0aW1lbGluZSAoeWVhaCwgdmVyeSByYXJlKVxuXHRcdFx0XHRcdGNhbGxiYWNrID0gXCJvblJldmVyc2VDb21wbGV0ZVwiO1xuXHRcdFx0XHRcdGlzQ29tcGxldGUgPSB0aGlzLl9yZXZlcnNlZDtcblx0XHRcdFx0fVxuXHRcdFx0XHRpZiAodGltZSA8IDApIHtcblx0XHRcdFx0XHR0aGlzLl9hY3RpdmUgPSBmYWxzZTtcblx0XHRcdFx0XHRpZiAodGhpcy5fdGltZWxpbmUuYXV0b1JlbW92ZUNoaWxkcmVuICYmIHRoaXMuX3JldmVyc2VkKSB7XG5cdFx0XHRcdFx0XHRpbnRlcm5hbEZvcmNlID0gaXNDb21wbGV0ZSA9IHRydWU7XG5cdFx0XHRcdFx0XHRjYWxsYmFjayA9IFwib25SZXZlcnNlQ29tcGxldGVcIjtcblx0XHRcdFx0XHR9IGVsc2UgaWYgKHByZXZSYXdQcmV2VGltZSA+PSAwICYmIHRoaXMuX2ZpcnN0KSB7IC8vd2hlbiBnb2luZyBiYWNrIGJleW9uZCB0aGUgc3RhcnQsIGZvcmNlIGEgcmVuZGVyIHNvIHRoYXQgemVyby1kdXJhdGlvbiB0d2VlbnMgdGhhdCBzaXQgYXQgdGhlIHZlcnkgYmVnaW5uaW5nIHJlbmRlciB0aGVpciBzdGFydCB2YWx1ZXMgcHJvcGVybHkuIE90aGVyd2lzZSwgaWYgdGhlIHBhcmVudCB0aW1lbGluZSdzIHBsYXloZWFkIGxhbmRzIGV4YWN0bHkgYXQgdGhpcyB0aW1lbGluZSdzIHN0YXJ0VGltZSwgYW5kIHRoZW4gbW92ZXMgYmFja3dhcmRzLCB0aGUgemVyby1kdXJhdGlvbiB0d2VlbnMgYXQgdGhlIGJlZ2lubmluZyB3b3VsZCBzdGlsbCBiZSBhdCB0aGVpciBlbmQgc3RhdGUuXG5cdFx0XHRcdFx0XHRpbnRlcm5hbEZvcmNlID0gdHJ1ZTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0dGhpcy5fcmF3UHJldlRpbWUgPSB0aW1lO1xuXHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdHRoaXMuX3Jhd1ByZXZUaW1lID0gKGR1ciB8fCAhc3VwcHJlc3NFdmVudHMgfHwgdGltZSB8fCB0aGlzLl9yYXdQcmV2VGltZSA9PT0gdGltZSkgPyB0aW1lIDogX3RpbnlOdW07IC8vd2hlbiB0aGUgcGxheWhlYWQgYXJyaXZlcyBhdCBFWEFDVExZIHRpbWUgMCAocmlnaHQgb24gdG9wKSBvZiBhIHplcm8tZHVyYXRpb24gdGltZWxpbmUgb3IgdHdlZW4sIHdlIG5lZWQgdG8gZGlzY2VybiBpZiBldmVudHMgYXJlIHN1cHByZXNzZWQgc28gdGhhdCB3aGVuIHRoZSBwbGF5aGVhZCBtb3ZlcyBhZ2FpbiAobmV4dCB0aW1lKSwgaXQnbGwgdHJpZ2dlciB0aGUgY2FsbGJhY2suIElmIGV2ZW50cyBhcmUgTk9UIHN1cHByZXNzZWQsIG9idmlvdXNseSB0aGUgY2FsbGJhY2sgd291bGQgYmUgdHJpZ2dlcmVkIGluIHRoaXMgcmVuZGVyLiBCYXNpY2FsbHksIHRoZSBjYWxsYmFjayBzaG91bGQgZmlyZSBlaXRoZXIgd2hlbiB0aGUgcGxheWhlYWQgQVJSSVZFUyBvciBMRUFWRVMgdGhpcyBleGFjdCBzcG90LCBub3QgYm90aC4gSW1hZ2luZSBkb2luZyBhIHRpbWVsaW5lLnNlZWsoMCkgYW5kIHRoZXJlJ3MgYSBjYWxsYmFjayB0aGF0IHNpdHMgYXQgMC4gU2luY2UgZXZlbnRzIGFyZSBzdXBwcmVzc2VkIG9uIHRoYXQgc2VlaygpIGJ5IGRlZmF1bHQsIG5vdGhpbmcgd2lsbCBmaXJlLCBidXQgd2hlbiB0aGUgcGxheWhlYWQgbW92ZXMgb2ZmIG9mIHRoYXQgcG9zaXRpb24sIHRoZSBjYWxsYmFjayBzaG91bGQgZmlyZS4gVGhpcyBiZWhhdmlvciBpcyB3aGF0IHBlb3BsZSBpbnR1aXRpdmVseSBleHBlY3QuIFdlIHNldCB0aGUgX3Jhd1ByZXZUaW1lIHRvIGJlIGEgcHJlY2lzZSB0aW55IG51bWJlciB0byBpbmRpY2F0ZSB0aGlzIHNjZW5hcmlvIHJhdGhlciB0aGFuIHVzaW5nIGFub3RoZXIgcHJvcGVydHkvdmFyaWFibGUgd2hpY2ggd291bGQgaW5jcmVhc2UgbWVtb3J5IHVzYWdlLiBUaGlzIHRlY2huaXF1ZSBpcyBsZXNzIHJlYWRhYmxlLCBidXQgbW9yZSBlZmZpY2llbnQuXG5cdFx0XHRcdFx0aWYgKHRpbWUgPT09IDAgJiYgaXNDb21wbGV0ZSkgeyAvL2lmIHRoZXJlJ3MgYSB6ZXJvLWR1cmF0aW9uIHR3ZWVuIGF0IHRoZSB2ZXJ5IGJlZ2lubmluZyBvZiBhIHRpbWVsaW5lIGFuZCB0aGUgcGxheWhlYWQgbGFuZHMgRVhBQ1RMWSBhdCB0aW1lIDAsIHRoYXQgdHdlZW4gd2lsbCBjb3JyZWN0bHkgcmVuZGVyIGl0cyBlbmQgdmFsdWVzLCBidXQgd2UgbmVlZCB0byBrZWVwIHRoZSB0aW1lbGluZSBhbGl2ZSBmb3Igb25lIG1vcmUgcmVuZGVyIHNvIHRoYXQgdGhlIGJlZ2lubmluZyB2YWx1ZXMgcmVuZGVyIHByb3Blcmx5IGFzIHRoZSBwYXJlbnQncyBwbGF5aGVhZCBrZWVwcyBtb3ZpbmcgYmV5b25kIHRoZSBiZWdpbmluZy4gSW1hZ2luZSBvYmoueCBzdGFydHMgYXQgMCBhbmQgdGhlbiB3ZSBkbyB0bC5zZXQob2JqLCB7eDoxMDB9KS50byhvYmosIDEsIHt4OjIwMH0pIGFuZCB0aGVuIGxhdGVyIHdlIHRsLnJldmVyc2UoKS4uLnRoZSBnb2FsIGlzIHRvIGhhdmUgb2JqLnggcmV2ZXJ0IHRvIDAuIElmIHRoZSBwbGF5aGVhZCBoYXBwZW5zIHRvIGxhbmQgb24gZXhhY3RseSAwLCB3aXRob3V0IHRoaXMgY2h1bmsgb2YgY29kZSwgaXQnZCBjb21wbGV0ZSB0aGUgdGltZWxpbmUgYW5kIHJlbW92ZSBpdCBmcm9tIHRoZSByZW5kZXJpbmcgcXVldWUgKG5vdCBnb29kKS5cblx0XHRcdFx0XHRcdHR3ZWVuID0gdGhpcy5fZmlyc3Q7XG5cdFx0XHRcdFx0XHR3aGlsZSAodHdlZW4gJiYgdHdlZW4uX3N0YXJ0VGltZSA9PT0gMCkge1xuXHRcdFx0XHRcdFx0XHRpZiAoIXR3ZWVuLl9kdXJhdGlvbikge1xuXHRcdFx0XHRcdFx0XHRcdGlzQ29tcGxldGUgPSBmYWxzZTtcblx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0XHR0d2VlbiA9IHR3ZWVuLl9uZXh0O1xuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHR0aW1lID0gMDsgLy90byBhdm9pZCBvY2Nhc2lvbmFsIGZsb2F0aW5nIHBvaW50IHJvdW5kaW5nIGVycm9ycyAoY291bGQgY2F1c2UgcHJvYmxlbXMgZXNwZWNpYWxseSB3aXRoIHplcm8tZHVyYXRpb24gdHdlZW5zIGF0IHRoZSB2ZXJ5IGJlZ2lubmluZyBvZiB0aGUgdGltZWxpbmUpXG5cdFx0XHRcdFx0aWYgKCF0aGlzLl9pbml0dGVkKSB7XG5cdFx0XHRcdFx0XHRpbnRlcm5hbEZvcmNlID0gdHJ1ZTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblxuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0aWYgKGR1ciA9PT0gMCAmJiBwcmV2UmF3UHJldlRpbWUgPCAwKSB7IC8vd2l0aG91dCB0aGlzLCB6ZXJvLWR1cmF0aW9uIHJlcGVhdGluZyB0aW1lbGluZXMgKGxpa2Ugd2l0aCBhIHNpbXBsZSBjYWxsYmFjayBuZXN0ZWQgYXQgdGhlIHZlcnkgYmVnaW5uaW5nIGFuZCBhIHJlcGVhdERlbGF5KSB3b3VsZG4ndCByZW5kZXIgdGhlIGZpcnN0IHRpbWUgdGhyb3VnaC5cblx0XHRcdFx0XHRpbnRlcm5hbEZvcmNlID0gdHJ1ZTtcblx0XHRcdFx0fVxuXHRcdFx0XHR0aGlzLl90aW1lID0gdGhpcy5fcmF3UHJldlRpbWUgPSB0aW1lO1xuXHRcdFx0XHRpZiAoIXRoaXMuX2xvY2tlZCkge1xuXHRcdFx0XHRcdHRoaXMuX3RvdGFsVGltZSA9IHRpbWU7XG5cdFx0XHRcdFx0aWYgKHRoaXMuX3JlcGVhdCAhPT0gMCkge1xuXHRcdFx0XHRcdFx0Y3ljbGVEdXJhdGlvbiA9IGR1ciArIHRoaXMuX3JlcGVhdERlbGF5O1xuXHRcdFx0XHRcdFx0dGhpcy5fY3ljbGUgPSAodGhpcy5fdG90YWxUaW1lIC8gY3ljbGVEdXJhdGlvbikgPj4gMDsgLy9vcmlnaW5hbGx5IF90b3RhbFRpbWUgJSBjeWNsZUR1cmF0aW9uIGJ1dCBmbG9hdGluZyBwb2ludCBlcnJvcnMgY2F1c2VkIHByb2JsZW1zLCBzbyBJIG5vcm1hbGl6ZWQgaXQuICg0ICUgMC44IHNob3VsZCBiZSAwIGJ1dCBpdCBnZXRzIHJlcG9ydGVkIGFzIDAuNzk5OTk5OTkhKVxuXHRcdFx0XHRcdFx0aWYgKHRoaXMuX2N5Y2xlICE9PSAwKSBpZiAodGhpcy5fY3ljbGUgPT09IHRoaXMuX3RvdGFsVGltZSAvIGN5Y2xlRHVyYXRpb24pIHtcblx0XHRcdFx0XHRcdFx0dGhpcy5fY3ljbGUtLTsgLy9vdGhlcndpc2Ugd2hlbiByZW5kZXJlZCBleGFjdGx5IGF0IHRoZSBlbmQgdGltZSwgaXQgd2lsbCBhY3QgYXMgdGhvdWdoIGl0IGlzIHJlcGVhdGluZyAoYXQgdGhlIGJlZ2lubmluZylcblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdHRoaXMuX3RpbWUgPSB0aGlzLl90b3RhbFRpbWUgLSAodGhpcy5fY3ljbGUgKiBjeWNsZUR1cmF0aW9uKTtcblx0XHRcdFx0XHRcdGlmICh0aGlzLl95b3lvKSBpZiAoKHRoaXMuX2N5Y2xlICYgMSkgIT09IDApIHtcblx0XHRcdFx0XHRcdFx0dGhpcy5fdGltZSA9IGR1ciAtIHRoaXMuX3RpbWU7XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRpZiAodGhpcy5fdGltZSA+IGR1cikge1xuXHRcdFx0XHRcdFx0XHR0aGlzLl90aW1lID0gZHVyO1xuXHRcdFx0XHRcdFx0XHR0aW1lID0gZHVyICsgMC4wMDAxOyAvL3RvIGF2b2lkIG9jY2FzaW9uYWwgZmxvYXRpbmcgcG9pbnQgcm91bmRpbmcgZXJyb3Jcblx0XHRcdFx0XHRcdH0gZWxzZSBpZiAodGhpcy5fdGltZSA8IDApIHtcblx0XHRcdFx0XHRcdFx0dGhpcy5fdGltZSA9IHRpbWUgPSAwO1xuXHRcdFx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRcdFx0dGltZSA9IHRoaXMuX3RpbWU7XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cblx0XHRcdFx0aWYgKHRoaXMuX2hhc1BhdXNlICYmICF0aGlzLl9mb3JjaW5nUGxheWhlYWQgJiYgIXN1cHByZXNzRXZlbnRzKSB7XG5cdFx0XHRcdFx0dGltZSA9IHRoaXMuX3RpbWU7XG5cdFx0XHRcdFx0aWYgKHRpbWUgPj0gcHJldlRpbWUpIHtcblx0XHRcdFx0XHRcdHR3ZWVuID0gdGhpcy5fZmlyc3Q7XG5cdFx0XHRcdFx0XHR3aGlsZSAodHdlZW4gJiYgdHdlZW4uX3N0YXJ0VGltZSA8PSB0aW1lICYmICFwYXVzZVR3ZWVuKSB7XG5cdFx0XHRcdFx0XHRcdGlmICghdHdlZW4uX2R1cmF0aW9uKSBpZiAodHdlZW4uZGF0YSA9PT0gXCJpc1BhdXNlXCIgJiYgIXR3ZWVuLnJhdGlvICYmICEodHdlZW4uX3N0YXJ0VGltZSA9PT0gMCAmJiB0aGlzLl9yYXdQcmV2VGltZSA9PT0gMCkpIHtcblx0XHRcdFx0XHRcdFx0XHRwYXVzZVR3ZWVuID0gdHdlZW47XG5cdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdFx0dHdlZW4gPSB0d2Vlbi5fbmV4dDtcblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdFx0dHdlZW4gPSB0aGlzLl9sYXN0O1xuXHRcdFx0XHRcdFx0d2hpbGUgKHR3ZWVuICYmIHR3ZWVuLl9zdGFydFRpbWUgPj0gdGltZSAmJiAhcGF1c2VUd2Vlbikge1xuXHRcdFx0XHRcdFx0XHRpZiAoIXR3ZWVuLl9kdXJhdGlvbikgaWYgKHR3ZWVuLmRhdGEgPT09IFwiaXNQYXVzZVwiICYmIHR3ZWVuLl9yYXdQcmV2VGltZSA+IDApIHtcblx0XHRcdFx0XHRcdFx0XHRwYXVzZVR3ZWVuID0gdHdlZW47XG5cdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdFx0dHdlZW4gPSB0d2Vlbi5fcHJldjtcblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0aWYgKHBhdXNlVHdlZW4pIHtcblx0XHRcdFx0XHRcdHRoaXMuX3RpbWUgPSB0aW1lID0gcGF1c2VUd2Vlbi5fc3RhcnRUaW1lO1xuXHRcdFx0XHRcdFx0dGhpcy5fdG90YWxUaW1lID0gdGltZSArICh0aGlzLl9jeWNsZSAqICh0aGlzLl90b3RhbER1cmF0aW9uICsgdGhpcy5fcmVwZWF0RGVsYXkpKTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblxuXHRcdFx0fVxuXG5cdFx0XHRpZiAodGhpcy5fY3ljbGUgIT09IHByZXZDeWNsZSkgaWYgKCF0aGlzLl9sb2NrZWQpIHtcblx0XHRcdFx0Lypcblx0XHRcdFx0bWFrZSBzdXJlIGNoaWxkcmVuIGF0IHRoZSBlbmQvYmVnaW5uaW5nIG9mIHRoZSB0aW1lbGluZSBhcmUgcmVuZGVyZWQgcHJvcGVybHkuIElmLCBmb3IgZXhhbXBsZSxcblx0XHRcdFx0YSAzLXNlY29uZCBsb25nIHRpbWVsaW5lIHJlbmRlcmVkIGF0IDIuOSBzZWNvbmRzIHByZXZpb3VzbHksIGFuZCBub3cgcmVuZGVycyBhdCAzLjIgc2Vjb25kcyAod2hpY2hcblx0XHRcdFx0d291bGQgZ2V0IHRyYW5zYXRlZCB0byAyLjggc2Vjb25kcyBpZiB0aGUgdGltZWxpbmUgeW95b3Mgb3IgMC4yIHNlY29uZHMgaWYgaXQganVzdCByZXBlYXRzKSwgdGhlcmVcblx0XHRcdFx0Y291bGQgYmUgYSBjYWxsYmFjayBvciBhIHNob3J0IHR3ZWVuIHRoYXQncyBhdCAyLjk1IG9yIDMgc2Vjb25kcyBpbiB3aGljaCB3b3VsZG4ndCByZW5kZXIuIFNvXG5cdFx0XHRcdHdlIG5lZWQgdG8gcHVzaCB0aGUgdGltZWxpbmUgdG8gdGhlIGVuZCAoYW5kL29yIGJlZ2lubmluZyBkZXBlbmRpbmcgb24gaXRzIHlveW8gdmFsdWUpLiBBbHNvIHdlIG11c3Rcblx0XHRcdFx0ZW5zdXJlIHRoYXQgemVyby1kdXJhdGlvbiB0d2VlbnMgYXQgdGhlIHZlcnkgYmVnaW5uaW5nIG9yIGVuZCBvZiB0aGUgVGltZWxpbmVNYXggd29yay5cblx0XHRcdFx0Ki9cblx0XHRcdFx0dmFyIGJhY2t3YXJkcyA9ICh0aGlzLl95b3lvICYmIChwcmV2Q3ljbGUgJiAxKSAhPT0gMCksXG5cdFx0XHRcdFx0d3JhcCA9IChiYWNrd2FyZHMgPT09ICh0aGlzLl95b3lvICYmICh0aGlzLl9jeWNsZSAmIDEpICE9PSAwKSksXG5cdFx0XHRcdFx0cmVjVG90YWxUaW1lID0gdGhpcy5fdG90YWxUaW1lLFxuXHRcdFx0XHRcdHJlY0N5Y2xlID0gdGhpcy5fY3ljbGUsXG5cdFx0XHRcdFx0cmVjUmF3UHJldlRpbWUgPSB0aGlzLl9yYXdQcmV2VGltZSxcblx0XHRcdFx0XHRyZWNUaW1lID0gdGhpcy5fdGltZTtcblxuXHRcdFx0XHR0aGlzLl90b3RhbFRpbWUgPSBwcmV2Q3ljbGUgKiBkdXI7XG5cdFx0XHRcdGlmICh0aGlzLl9jeWNsZSA8IHByZXZDeWNsZSkge1xuXHRcdFx0XHRcdGJhY2t3YXJkcyA9ICFiYWNrd2FyZHM7XG5cdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0dGhpcy5fdG90YWxUaW1lICs9IGR1cjtcblx0XHRcdFx0fVxuXHRcdFx0XHR0aGlzLl90aW1lID0gcHJldlRpbWU7IC8vdGVtcG9yYXJpbHkgcmV2ZXJ0IF90aW1lIHNvIHRoYXQgcmVuZGVyKCkgcmVuZGVycyB0aGUgY2hpbGRyZW4gaW4gdGhlIGNvcnJlY3Qgb3JkZXIuIFdpdGhvdXQgdGhpcywgdHdlZW5zIHdvbid0IHJld2luZCBjb3JyZWN0bHkuIFdlIGNvdWxkIGFyaGljdGVjdCB0aGluZ3MgaW4gYSBcImNsZWFuZXJcIiB3YXkgYnkgc3BsaXR0aW5nIG91dCB0aGUgcmVuZGVyaW5nIHF1ZXVlIGludG8gYSBzZXBhcmF0ZSBtZXRob2QgYnV0IGZvciBwZXJmb3JtYW5jZSByZWFzb25zLCB3ZSBrZXB0IGl0IGFsbCBpbnNpZGUgdGhpcyBtZXRob2QuXG5cblx0XHRcdFx0dGhpcy5fcmF3UHJldlRpbWUgPSAoZHVyID09PSAwKSA/IHByZXZSYXdQcmV2VGltZSAtIDAuMDAwMSA6IHByZXZSYXdQcmV2VGltZTtcblx0XHRcdFx0dGhpcy5fY3ljbGUgPSBwcmV2Q3ljbGU7XG5cdFx0XHRcdHRoaXMuX2xvY2tlZCA9IHRydWU7IC8vcHJldmVudHMgY2hhbmdlcyB0byB0b3RhbFRpbWUgYW5kIHNraXBzIHJlcGVhdC95b3lvIGJlaGF2aW9yIHdoZW4gd2UgcmVjdXJzaXZlbHkgY2FsbCByZW5kZXIoKVxuXHRcdFx0XHRwcmV2VGltZSA9IChiYWNrd2FyZHMpID8gMCA6IGR1cjtcblx0XHRcdFx0dGhpcy5yZW5kZXIocHJldlRpbWUsIHN1cHByZXNzRXZlbnRzLCAoZHVyID09PSAwKSk7XG5cdFx0XHRcdGlmICghc3VwcHJlc3NFdmVudHMpIGlmICghdGhpcy5fZ2MpIHtcblx0XHRcdFx0XHRpZiAodGhpcy52YXJzLm9uUmVwZWF0KSB7XG5cdFx0XHRcdFx0XHR0aGlzLl9jYWxsYmFjayhcIm9uUmVwZWF0XCIpO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXHRcdFx0XHRpZiAocHJldlRpbWUgIT09IHRoaXMuX3RpbWUpIHsgLy9pbiBjYXNlIHRoZXJlJ3MgYSBjYWxsYmFjayBsaWtlIG9uQ29tcGxldGUgaW4gYSBuZXN0ZWQgdHdlZW4vdGltZWxpbmUgdGhhdCBjaGFuZ2VzIHRoZSBwbGF5aGVhZCBwb3NpdGlvbiwgbGlrZSB2aWEgc2VlaygpLCB3ZSBzaG91bGQganVzdCBhYm9ydC5cblx0XHRcdFx0XHRyZXR1cm47XG5cdFx0XHRcdH1cblx0XHRcdFx0aWYgKHdyYXApIHtcblx0XHRcdFx0XHRwcmV2VGltZSA9IChiYWNrd2FyZHMpID8gZHVyICsgMC4wMDAxIDogLTAuMDAwMTtcblx0XHRcdFx0XHR0aGlzLnJlbmRlcihwcmV2VGltZSwgdHJ1ZSwgZmFsc2UpO1xuXHRcdFx0XHR9XG5cdFx0XHRcdHRoaXMuX2xvY2tlZCA9IGZhbHNlO1xuXHRcdFx0XHRpZiAodGhpcy5fcGF1c2VkICYmICFwcmV2UGF1c2VkKSB7IC8vaWYgdGhlIHJlbmRlcigpIHRyaWdnZXJlZCBjYWxsYmFjayB0aGF0IHBhdXNlZCB0aGlzIHRpbWVsaW5lLCB3ZSBzaG91bGQgYWJvcnQgKHZlcnkgcmFyZSwgYnV0IHBvc3NpYmxlKVxuXHRcdFx0XHRcdHJldHVybjtcblx0XHRcdFx0fVxuXHRcdFx0XHR0aGlzLl90aW1lID0gcmVjVGltZTtcblx0XHRcdFx0dGhpcy5fdG90YWxUaW1lID0gcmVjVG90YWxUaW1lO1xuXHRcdFx0XHR0aGlzLl9jeWNsZSA9IHJlY0N5Y2xlO1xuXHRcdFx0XHR0aGlzLl9yYXdQcmV2VGltZSA9IHJlY1Jhd1ByZXZUaW1lO1xuXHRcdFx0fVxuXG5cdFx0XHRpZiAoKHRoaXMuX3RpbWUgPT09IHByZXZUaW1lIHx8ICF0aGlzLl9maXJzdCkgJiYgIWZvcmNlICYmICFpbnRlcm5hbEZvcmNlICYmICFwYXVzZVR3ZWVuKSB7XG5cdFx0XHRcdGlmIChwcmV2VG90YWxUaW1lICE9PSB0aGlzLl90b3RhbFRpbWUpIGlmICh0aGlzLl9vblVwZGF0ZSkgaWYgKCFzdXBwcmVzc0V2ZW50cykgeyAvL3NvIHRoYXQgb25VcGRhdGUgZmlyZXMgZXZlbiBkdXJpbmcgdGhlIHJlcGVhdERlbGF5IC0gYXMgbG9uZyBhcyB0aGUgdG90YWxUaW1lIGNoYW5nZWQsIHdlIHNob3VsZCB0cmlnZ2VyIG9uVXBkYXRlLlxuXHRcdFx0XHRcdHRoaXMuX2NhbGxiYWNrKFwib25VcGRhdGVcIik7XG5cdFx0XHRcdH1cblx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0fSBlbHNlIGlmICghdGhpcy5faW5pdHRlZCkge1xuXHRcdFx0XHR0aGlzLl9pbml0dGVkID0gdHJ1ZTtcblx0XHRcdH1cblxuXHRcdFx0aWYgKCF0aGlzLl9hY3RpdmUpIGlmICghdGhpcy5fcGF1c2VkICYmIHRoaXMuX3RvdGFsVGltZSAhPT0gcHJldlRvdGFsVGltZSAmJiB0aW1lID4gMCkge1xuXHRcdFx0XHR0aGlzLl9hY3RpdmUgPSB0cnVlOyAgLy9zbyB0aGF0IGlmIHRoZSB1c2VyIHJlbmRlcnMgdGhlIHRpbWVsaW5lIChhcyBvcHBvc2VkIHRvIHRoZSBwYXJlbnQgdGltZWxpbmUgcmVuZGVyaW5nIGl0KSwgaXQgaXMgZm9yY2VkIHRvIHJlLXJlbmRlciBhbmQgYWxpZ24gaXQgd2l0aCB0aGUgcHJvcGVyIHRpbWUvZnJhbWUgb24gdGhlIG5leHQgcmVuZGVyaW5nIGN5Y2xlLiBNYXliZSB0aGUgdGltZWxpbmUgYWxyZWFkeSBmaW5pc2hlZCBidXQgdGhlIHVzZXIgbWFudWFsbHkgcmUtcmVuZGVycyBpdCBhcyBoYWxmd2F5IGRvbmUsIGZvciBleGFtcGxlLlxuXHRcdFx0fVxuXG5cdFx0XHRpZiAocHJldlRvdGFsVGltZSA9PT0gMCkgaWYgKHRoaXMudmFycy5vblN0YXJ0KSBpZiAodGhpcy5fdG90YWxUaW1lICE9PSAwKSBpZiAoIXN1cHByZXNzRXZlbnRzKSB7XG5cdFx0XHRcdHRoaXMuX2NhbGxiYWNrKFwib25TdGFydFwiKTtcblx0XHRcdH1cblxuXHRcdFx0Y3VyVGltZSA9IHRoaXMuX3RpbWU7XG5cdFx0XHRpZiAoY3VyVGltZSA+PSBwcmV2VGltZSkge1xuXHRcdFx0XHR0d2VlbiA9IHRoaXMuX2ZpcnN0O1xuXHRcdFx0XHR3aGlsZSAodHdlZW4pIHtcblx0XHRcdFx0XHRuZXh0ID0gdHdlZW4uX25leHQ7IC8vcmVjb3JkIGl0IGhlcmUgYmVjYXVzZSB0aGUgdmFsdWUgY291bGQgY2hhbmdlIGFmdGVyIHJlbmRlcmluZy4uLlxuXHRcdFx0XHRcdGlmIChjdXJUaW1lICE9PSB0aGlzLl90aW1lIHx8ICh0aGlzLl9wYXVzZWQgJiYgIXByZXZQYXVzZWQpKSB7IC8vaW4gY2FzZSBhIHR3ZWVuIHBhdXNlcyBvciBzZWVrcyB0aGUgdGltZWxpbmUgd2hlbiByZW5kZXJpbmcsIGxpa2UgaW5zaWRlIG9mIGFuIG9uVXBkYXRlL29uQ29tcGxldGVcblx0XHRcdFx0XHRcdGJyZWFrO1xuXHRcdFx0XHRcdH0gZWxzZSBpZiAodHdlZW4uX2FjdGl2ZSB8fCAodHdlZW4uX3N0YXJ0VGltZSA8PSB0aGlzLl90aW1lICYmICF0d2Vlbi5fcGF1c2VkICYmICF0d2Vlbi5fZ2MpKSB7XG5cdFx0XHRcdFx0XHRpZiAocGF1c2VUd2VlbiA9PT0gdHdlZW4pIHtcblx0XHRcdFx0XHRcdFx0dGhpcy5wYXVzZSgpO1xuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0aWYgKCF0d2Vlbi5fcmV2ZXJzZWQpIHtcblx0XHRcdFx0XHRcdFx0dHdlZW4ucmVuZGVyKCh0aW1lIC0gdHdlZW4uX3N0YXJ0VGltZSkgKiB0d2Vlbi5fdGltZVNjYWxlLCBzdXBwcmVzc0V2ZW50cywgZm9yY2UpO1xuXHRcdFx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRcdFx0dHdlZW4ucmVuZGVyKCgoIXR3ZWVuLl9kaXJ0eSkgPyB0d2Vlbi5fdG90YWxEdXJhdGlvbiA6IHR3ZWVuLnRvdGFsRHVyYXRpb24oKSkgLSAoKHRpbWUgLSB0d2Vlbi5fc3RhcnRUaW1lKSAqIHR3ZWVuLl90aW1lU2NhbGUpLCBzdXBwcmVzc0V2ZW50cywgZm9yY2UpO1xuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHR0d2VlbiA9IG5leHQ7XG5cdFx0XHRcdH1cblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdHR3ZWVuID0gdGhpcy5fbGFzdDtcblx0XHRcdFx0d2hpbGUgKHR3ZWVuKSB7XG5cdFx0XHRcdFx0bmV4dCA9IHR3ZWVuLl9wcmV2OyAvL3JlY29yZCBpdCBoZXJlIGJlY2F1c2UgdGhlIHZhbHVlIGNvdWxkIGNoYW5nZSBhZnRlciByZW5kZXJpbmcuLi5cblx0XHRcdFx0XHRpZiAoY3VyVGltZSAhPT0gdGhpcy5fdGltZSB8fCAodGhpcy5fcGF1c2VkICYmICFwcmV2UGF1c2VkKSkgeyAvL2luIGNhc2UgYSB0d2VlbiBwYXVzZXMgb3Igc2Vla3MgdGhlIHRpbWVsaW5lIHdoZW4gcmVuZGVyaW5nLCBsaWtlIGluc2lkZSBvZiBhbiBvblVwZGF0ZS9vbkNvbXBsZXRlXG5cdFx0XHRcdFx0XHRicmVhaztcblx0XHRcdFx0XHR9IGVsc2UgaWYgKHR3ZWVuLl9hY3RpdmUgfHwgKHR3ZWVuLl9zdGFydFRpbWUgPD0gcHJldlRpbWUgJiYgIXR3ZWVuLl9wYXVzZWQgJiYgIXR3ZWVuLl9nYykpIHtcblx0XHRcdFx0XHRcdGlmIChwYXVzZVR3ZWVuID09PSB0d2Vlbikge1xuXHRcdFx0XHRcdFx0XHRwYXVzZVR3ZWVuID0gdHdlZW4uX3ByZXY7IC8vdGhlIGxpbmtlZCBsaXN0IGlzIG9yZ2FuaXplZCBieSBfc3RhcnRUaW1lLCB0aHVzIGl0J3MgcG9zc2libGUgdGhhdCBhIHR3ZWVuIGNvdWxkIHN0YXJ0IEJFRk9SRSB0aGUgcGF1c2UgYW5kIGVuZCBhZnRlciBpdCwgaW4gd2hpY2ggY2FzZSBpdCB3b3VsZCBiZSBwb3NpdGlvbmVkIGJlZm9yZSB0aGUgcGF1c2UgdHdlZW4gaW4gdGhlIGxpbmtlZCBsaXN0LCBidXQgd2Ugc2hvdWxkIHJlbmRlciBpdCBiZWZvcmUgd2UgcGF1c2UoKSB0aGUgdGltZWxpbmUgYW5kIGNlYXNlIHJlbmRlcmluZy4gVGhpcyBpcyBvbmx5IGEgY29uY2VybiB3aGVuIGdvaW5nIGluIHJldmVyc2UuXG5cdFx0XHRcdFx0XHRcdHdoaWxlIChwYXVzZVR3ZWVuICYmIHBhdXNlVHdlZW4uZW5kVGltZSgpID4gdGhpcy5fdGltZSkge1xuXHRcdFx0XHRcdFx0XHRcdHBhdXNlVHdlZW4ucmVuZGVyKCAocGF1c2VUd2Vlbi5fcmV2ZXJzZWQgPyBwYXVzZVR3ZWVuLnRvdGFsRHVyYXRpb24oKSAtICgodGltZSAtIHBhdXNlVHdlZW4uX3N0YXJ0VGltZSkgKiBwYXVzZVR3ZWVuLl90aW1lU2NhbGUpIDogKHRpbWUgLSBwYXVzZVR3ZWVuLl9zdGFydFRpbWUpICogcGF1c2VUd2Vlbi5fdGltZVNjYWxlKSwgc3VwcHJlc3NFdmVudHMsIGZvcmNlKTtcblx0XHRcdFx0XHRcdFx0XHRwYXVzZVR3ZWVuID0gcGF1c2VUd2Vlbi5fcHJldjtcblx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0XHRwYXVzZVR3ZWVuID0gbnVsbDtcblx0XHRcdFx0XHRcdFx0dGhpcy5wYXVzZSgpO1xuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0aWYgKCF0d2Vlbi5fcmV2ZXJzZWQpIHtcblx0XHRcdFx0XHRcdFx0dHdlZW4ucmVuZGVyKCh0aW1lIC0gdHdlZW4uX3N0YXJ0VGltZSkgKiB0d2Vlbi5fdGltZVNjYWxlLCBzdXBwcmVzc0V2ZW50cywgZm9yY2UpO1xuXHRcdFx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRcdFx0dHdlZW4ucmVuZGVyKCgoIXR3ZWVuLl9kaXJ0eSkgPyB0d2Vlbi5fdG90YWxEdXJhdGlvbiA6IHR3ZWVuLnRvdGFsRHVyYXRpb24oKSkgLSAoKHRpbWUgLSB0d2Vlbi5fc3RhcnRUaW1lKSAqIHR3ZWVuLl90aW1lU2NhbGUpLCBzdXBwcmVzc0V2ZW50cywgZm9yY2UpO1xuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHR0d2VlbiA9IG5leHQ7XG5cdFx0XHRcdH1cblx0XHRcdH1cblxuXHRcdFx0aWYgKHRoaXMuX29uVXBkYXRlKSBpZiAoIXN1cHByZXNzRXZlbnRzKSB7XG5cdFx0XHRcdGlmIChfbGF6eVR3ZWVucy5sZW5ndGgpIHsgLy9pbiBjYXNlIHJlbmRlcmluZyBjYXVzZWQgYW55IHR3ZWVucyB0byBsYXp5LWluaXQsIHdlIHNob3VsZCByZW5kZXIgdGhlbSBiZWNhdXNlIHR5cGljYWxseSB3aGVuIGEgdGltZWxpbmUgZmluaXNoZXMsIHVzZXJzIGV4cGVjdCB0aGluZ3MgdG8gaGF2ZSByZW5kZXJlZCBmdWxseS4gSW1hZ2luZSBhbiBvblVwZGF0ZSBvbiBhIHRpbWVsaW5lIHRoYXQgcmVwb3J0cy9jaGVja3MgdHdlZW5lZCB2YWx1ZXMuXG5cdFx0XHRcdFx0X2xhenlSZW5kZXIoKTtcblx0XHRcdFx0fVxuXHRcdFx0XHR0aGlzLl9jYWxsYmFjayhcIm9uVXBkYXRlXCIpO1xuXHRcdFx0fVxuXHRcdFx0aWYgKGNhbGxiYWNrKSBpZiAoIXRoaXMuX2xvY2tlZCkgaWYgKCF0aGlzLl9nYykgaWYgKHByZXZTdGFydCA9PT0gdGhpcy5fc3RhcnRUaW1lIHx8IHByZXZUaW1lU2NhbGUgIT09IHRoaXMuX3RpbWVTY2FsZSkgaWYgKHRoaXMuX3RpbWUgPT09IDAgfHwgdG90YWxEdXIgPj0gdGhpcy50b3RhbER1cmF0aW9uKCkpIHsgLy9pZiBvbmUgb2YgdGhlIHR3ZWVucyB0aGF0IHdhcyByZW5kZXJlZCBhbHRlcmVkIHRoaXMgdGltZWxpbmUncyBzdGFydFRpbWUgKGxpa2UgaWYgYW4gb25Db21wbGV0ZSByZXZlcnNlZCB0aGUgdGltZWxpbmUpLCBpdCBwcm9iYWJseSBpc24ndCBjb21wbGV0ZS4gSWYgaXQgaXMsIGRvbid0IHdvcnJ5LCBiZWNhdXNlIHdoYXRldmVyIGNhbGwgYWx0ZXJlZCB0aGUgc3RhcnRUaW1lIHdvdWxkIGNvbXBsZXRlIGlmIGl0IHdhcyBuZWNlc3NhcnkgYXQgdGhlIG5ldyB0aW1lLiBUaGUgb25seSBleGNlcHRpb24gaXMgdGhlIHRpbWVTY2FsZSBwcm9wZXJ0eS4gQWxzbyBjaGVjayBfZ2MgYmVjYXVzZSB0aGVyZSdzIGEgY2hhbmNlIHRoYXQga2lsbCgpIGNvdWxkIGJlIGNhbGxlZCBpbiBhbiBvblVwZGF0ZVxuXHRcdFx0XHRpZiAoaXNDb21wbGV0ZSkge1xuXHRcdFx0XHRcdGlmIChfbGF6eVR3ZWVucy5sZW5ndGgpIHsgLy9pbiBjYXNlIHJlbmRlcmluZyBjYXVzZWQgYW55IHR3ZWVucyB0byBsYXp5LWluaXQsIHdlIHNob3VsZCByZW5kZXIgdGhlbSBiZWNhdXNlIHR5cGljYWxseSB3aGVuIGEgdGltZWxpbmUgZmluaXNoZXMsIHVzZXJzIGV4cGVjdCB0aGluZ3MgdG8gaGF2ZSByZW5kZXJlZCBmdWxseS4gSW1hZ2luZSBhbiBvbkNvbXBsZXRlIG9uIGEgdGltZWxpbmUgdGhhdCByZXBvcnRzL2NoZWNrcyB0d2VlbmVkIHZhbHVlcy5cblx0XHRcdFx0XHRcdF9sYXp5UmVuZGVyKCk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdGlmICh0aGlzLl90aW1lbGluZS5hdXRvUmVtb3ZlQ2hpbGRyZW4pIHtcblx0XHRcdFx0XHRcdHRoaXMuX2VuYWJsZWQoZmFsc2UsIGZhbHNlKTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0dGhpcy5fYWN0aXZlID0gZmFsc2U7XG5cdFx0XHRcdH1cblx0XHRcdFx0aWYgKCFzdXBwcmVzc0V2ZW50cyAmJiB0aGlzLnZhcnNbY2FsbGJhY2tdKSB7XG5cdFx0XHRcdFx0dGhpcy5fY2FsbGJhY2soY2FsbGJhY2spO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fTtcblxuXHRcdHAuZ2V0QWN0aXZlID0gZnVuY3Rpb24obmVzdGVkLCB0d2VlbnMsIHRpbWVsaW5lcykge1xuXHRcdFx0aWYgKG5lc3RlZCA9PSBudWxsKSB7XG5cdFx0XHRcdG5lc3RlZCA9IHRydWU7XG5cdFx0XHR9XG5cdFx0XHRpZiAodHdlZW5zID09IG51bGwpIHtcblx0XHRcdFx0dHdlZW5zID0gdHJ1ZTtcblx0XHRcdH1cblx0XHRcdGlmICh0aW1lbGluZXMgPT0gbnVsbCkge1xuXHRcdFx0XHR0aW1lbGluZXMgPSBmYWxzZTtcblx0XHRcdH1cblx0XHRcdHZhciBhID0gW10sXG5cdFx0XHRcdGFsbCA9IHRoaXMuZ2V0Q2hpbGRyZW4obmVzdGVkLCB0d2VlbnMsIHRpbWVsaW5lcyksXG5cdFx0XHRcdGNudCA9IDAsXG5cdFx0XHRcdGwgPSBhbGwubGVuZ3RoLFxuXHRcdFx0XHRpLCB0d2Vlbjtcblx0XHRcdGZvciAoaSA9IDA7IGkgPCBsOyBpKyspIHtcblx0XHRcdFx0dHdlZW4gPSBhbGxbaV07XG5cdFx0XHRcdGlmICh0d2Vlbi5pc0FjdGl2ZSgpKSB7XG5cdFx0XHRcdFx0YVtjbnQrK10gPSB0d2Vlbjtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdFx0cmV0dXJuIGE7XG5cdFx0fTtcblxuXG5cdFx0cC5nZXRMYWJlbEFmdGVyID0gZnVuY3Rpb24odGltZSkge1xuXHRcdFx0aWYgKCF0aW1lKSBpZiAodGltZSAhPT0gMCkgeyAvL2Zhc3RlciB0aGFuIGlzTmFuKClcblx0XHRcdFx0dGltZSA9IHRoaXMuX3RpbWU7XG5cdFx0XHR9XG5cdFx0XHR2YXIgbGFiZWxzID0gdGhpcy5nZXRMYWJlbHNBcnJheSgpLFxuXHRcdFx0XHRsID0gbGFiZWxzLmxlbmd0aCxcblx0XHRcdFx0aTtcblx0XHRcdGZvciAoaSA9IDA7IGkgPCBsOyBpKyspIHtcblx0XHRcdFx0aWYgKGxhYmVsc1tpXS50aW1lID4gdGltZSkge1xuXHRcdFx0XHRcdHJldHVybiBsYWJlbHNbaV0ubmFtZTtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdFx0cmV0dXJuIG51bGw7XG5cdFx0fTtcblxuXHRcdHAuZ2V0TGFiZWxCZWZvcmUgPSBmdW5jdGlvbih0aW1lKSB7XG5cdFx0XHRpZiAodGltZSA9PSBudWxsKSB7XG5cdFx0XHRcdHRpbWUgPSB0aGlzLl90aW1lO1xuXHRcdFx0fVxuXHRcdFx0dmFyIGxhYmVscyA9IHRoaXMuZ2V0TGFiZWxzQXJyYXkoKSxcblx0XHRcdFx0aSA9IGxhYmVscy5sZW5ndGg7XG5cdFx0XHR3aGlsZSAoLS1pID4gLTEpIHtcblx0XHRcdFx0aWYgKGxhYmVsc1tpXS50aW1lIDwgdGltZSkge1xuXHRcdFx0XHRcdHJldHVybiBsYWJlbHNbaV0ubmFtZTtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdFx0cmV0dXJuIG51bGw7XG5cdFx0fTtcblxuXHRcdHAuZ2V0TGFiZWxzQXJyYXkgPSBmdW5jdGlvbigpIHtcblx0XHRcdHZhciBhID0gW10sXG5cdFx0XHRcdGNudCA9IDAsXG5cdFx0XHRcdHA7XG5cdFx0XHRmb3IgKHAgaW4gdGhpcy5fbGFiZWxzKSB7XG5cdFx0XHRcdGFbY250KytdID0ge3RpbWU6dGhpcy5fbGFiZWxzW3BdLCBuYW1lOnB9O1xuXHRcdFx0fVxuXHRcdFx0YS5zb3J0KGZ1bmN0aW9uKGEsYikge1xuXHRcdFx0XHRyZXR1cm4gYS50aW1lIC0gYi50aW1lO1xuXHRcdFx0fSk7XG5cdFx0XHRyZXR1cm4gYTtcblx0XHR9O1xuXG5cbi8vLS0tLSBHRVRURVJTIC8gU0VUVEVSUyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cblx0XHRwLnByb2dyZXNzID0gZnVuY3Rpb24odmFsdWUsIHN1cHByZXNzRXZlbnRzKSB7XG5cdFx0XHRyZXR1cm4gKCFhcmd1bWVudHMubGVuZ3RoKSA/IHRoaXMuX3RpbWUgLyB0aGlzLmR1cmF0aW9uKCkgOiB0aGlzLnRvdGFsVGltZSggdGhpcy5kdXJhdGlvbigpICogKCh0aGlzLl95b3lvICYmICh0aGlzLl9jeWNsZSAmIDEpICE9PSAwKSA/IDEgLSB2YWx1ZSA6IHZhbHVlKSArICh0aGlzLl9jeWNsZSAqICh0aGlzLl9kdXJhdGlvbiArIHRoaXMuX3JlcGVhdERlbGF5KSksIHN1cHByZXNzRXZlbnRzKTtcblx0XHR9O1xuXG5cdFx0cC50b3RhbFByb2dyZXNzID0gZnVuY3Rpb24odmFsdWUsIHN1cHByZXNzRXZlbnRzKSB7XG5cdFx0XHRyZXR1cm4gKCFhcmd1bWVudHMubGVuZ3RoKSA/IHRoaXMuX3RvdGFsVGltZSAvIHRoaXMudG90YWxEdXJhdGlvbigpIDogdGhpcy50b3RhbFRpbWUoIHRoaXMudG90YWxEdXJhdGlvbigpICogdmFsdWUsIHN1cHByZXNzRXZlbnRzKTtcblx0XHR9O1xuXG5cdFx0cC50b3RhbER1cmF0aW9uID0gZnVuY3Rpb24odmFsdWUpIHtcblx0XHRcdGlmICghYXJndW1lbnRzLmxlbmd0aCkge1xuXHRcdFx0XHRpZiAodGhpcy5fZGlydHkpIHtcblx0XHRcdFx0XHRUaW1lbGluZUxpdGUucHJvdG90eXBlLnRvdGFsRHVyYXRpb24uY2FsbCh0aGlzKTsgLy9qdXN0IGZvcmNlcyByZWZyZXNoXG5cdFx0XHRcdFx0Ly9JbnN0ZWFkIG9mIEluZmluaXR5LCB3ZSB1c2UgOTk5OTk5OTk5OTk5IHNvIHRoYXQgd2UgY2FuIGFjY29tbW9kYXRlIHJldmVyc2VzLlxuXHRcdFx0XHRcdHRoaXMuX3RvdGFsRHVyYXRpb24gPSAodGhpcy5fcmVwZWF0ID09PSAtMSkgPyA5OTk5OTk5OTk5OTkgOiB0aGlzLl9kdXJhdGlvbiAqICh0aGlzLl9yZXBlYXQgKyAxKSArICh0aGlzLl9yZXBlYXREZWxheSAqIHRoaXMuX3JlcGVhdCk7XG5cdFx0XHRcdH1cblx0XHRcdFx0cmV0dXJuIHRoaXMuX3RvdGFsRHVyYXRpb247XG5cdFx0XHR9XG5cdFx0XHRyZXR1cm4gKHRoaXMuX3JlcGVhdCA9PT0gLTEgfHwgIXZhbHVlKSA/IHRoaXMgOiB0aGlzLnRpbWVTY2FsZSggdGhpcy50b3RhbER1cmF0aW9uKCkgLyB2YWx1ZSApO1xuXHRcdH07XG5cblx0XHRwLnRpbWUgPSBmdW5jdGlvbih2YWx1ZSwgc3VwcHJlc3NFdmVudHMpIHtcblx0XHRcdGlmICghYXJndW1lbnRzLmxlbmd0aCkge1xuXHRcdFx0XHRyZXR1cm4gdGhpcy5fdGltZTtcblx0XHRcdH1cblx0XHRcdGlmICh0aGlzLl9kaXJ0eSkge1xuXHRcdFx0XHR0aGlzLnRvdGFsRHVyYXRpb24oKTtcblx0XHRcdH1cblx0XHRcdGlmICh2YWx1ZSA+IHRoaXMuX2R1cmF0aW9uKSB7XG5cdFx0XHRcdHZhbHVlID0gdGhpcy5fZHVyYXRpb247XG5cdFx0XHR9XG5cdFx0XHRpZiAodGhpcy5feW95byAmJiAodGhpcy5fY3ljbGUgJiAxKSAhPT0gMCkge1xuXHRcdFx0XHR2YWx1ZSA9ICh0aGlzLl9kdXJhdGlvbiAtIHZhbHVlKSArICh0aGlzLl9jeWNsZSAqICh0aGlzLl9kdXJhdGlvbiArIHRoaXMuX3JlcGVhdERlbGF5KSk7XG5cdFx0XHR9IGVsc2UgaWYgKHRoaXMuX3JlcGVhdCAhPT0gMCkge1xuXHRcdFx0XHR2YWx1ZSArPSB0aGlzLl9jeWNsZSAqICh0aGlzLl9kdXJhdGlvbiArIHRoaXMuX3JlcGVhdERlbGF5KTtcblx0XHRcdH1cblx0XHRcdHJldHVybiB0aGlzLnRvdGFsVGltZSh2YWx1ZSwgc3VwcHJlc3NFdmVudHMpO1xuXHRcdH07XG5cblx0XHRwLnJlcGVhdCA9IGZ1bmN0aW9uKHZhbHVlKSB7XG5cdFx0XHRpZiAoIWFyZ3VtZW50cy5sZW5ndGgpIHtcblx0XHRcdFx0cmV0dXJuIHRoaXMuX3JlcGVhdDtcblx0XHRcdH1cblx0XHRcdHRoaXMuX3JlcGVhdCA9IHZhbHVlO1xuXHRcdFx0cmV0dXJuIHRoaXMuX3VuY2FjaGUodHJ1ZSk7XG5cdFx0fTtcblxuXHRcdHAucmVwZWF0RGVsYXkgPSBmdW5jdGlvbih2YWx1ZSkge1xuXHRcdFx0aWYgKCFhcmd1bWVudHMubGVuZ3RoKSB7XG5cdFx0XHRcdHJldHVybiB0aGlzLl9yZXBlYXREZWxheTtcblx0XHRcdH1cblx0XHRcdHRoaXMuX3JlcGVhdERlbGF5ID0gdmFsdWU7XG5cdFx0XHRyZXR1cm4gdGhpcy5fdW5jYWNoZSh0cnVlKTtcblx0XHR9O1xuXG5cdFx0cC55b3lvID0gZnVuY3Rpb24odmFsdWUpIHtcblx0XHRcdGlmICghYXJndW1lbnRzLmxlbmd0aCkge1xuXHRcdFx0XHRyZXR1cm4gdGhpcy5feW95bztcblx0XHRcdH1cblx0XHRcdHRoaXMuX3lveW8gPSB2YWx1ZTtcblx0XHRcdHJldHVybiB0aGlzO1xuXHRcdH07XG5cblx0XHRwLmN1cnJlbnRMYWJlbCA9IGZ1bmN0aW9uKHZhbHVlKSB7XG5cdFx0XHRpZiAoIWFyZ3VtZW50cy5sZW5ndGgpIHtcblx0XHRcdFx0cmV0dXJuIHRoaXMuZ2V0TGFiZWxCZWZvcmUodGhpcy5fdGltZSArIDAuMDAwMDAwMDEpO1xuXHRcdFx0fVxuXHRcdFx0cmV0dXJuIHRoaXMuc2Vlayh2YWx1ZSwgdHJ1ZSk7XG5cdFx0fTtcblxuXHRcdHJldHVybiBUaW1lbGluZU1heDtcblxuXHR9LCB0cnVlKTtcblx0XG5cblxuXG5cblx0XG5cdFxuXHRcblx0XG5cdFxuXHRcblx0XG4vKlxuICogLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICogQmV6aWVyUGx1Z2luXG4gKiAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gKi9cblx0KGZ1bmN0aW9uKCkge1xuXG5cdFx0dmFyIF9SQUQyREVHID0gMTgwIC8gTWF0aC5QSSxcblx0XHRcdF9yMSA9IFtdLFxuXHRcdFx0X3IyID0gW10sXG5cdFx0XHRfcjMgPSBbXSxcblx0XHRcdF9jb3JQcm9wcyA9IHt9LFxuXHRcdFx0X2dsb2JhbHMgPSBfZ3NTY29wZS5fZ3NEZWZpbmUuZ2xvYmFscyxcblx0XHRcdFNlZ21lbnQgPSBmdW5jdGlvbihhLCBiLCBjLCBkKSB7XG5cdFx0XHRcdHRoaXMuYSA9IGE7XG5cdFx0XHRcdHRoaXMuYiA9IGI7XG5cdFx0XHRcdHRoaXMuYyA9IGM7XG5cdFx0XHRcdHRoaXMuZCA9IGQ7XG5cdFx0XHRcdHRoaXMuZGEgPSBkIC0gYTtcblx0XHRcdFx0dGhpcy5jYSA9IGMgLSBhO1xuXHRcdFx0XHR0aGlzLmJhID0gYiAtIGE7XG5cdFx0XHR9LFxuXHRcdFx0X2NvcnJlbGF0ZSA9IFwiLHgseSx6LGxlZnQsdG9wLHJpZ2h0LGJvdHRvbSxtYXJnaW5Ub3AsbWFyZ2luTGVmdCxtYXJnaW5SaWdodCxtYXJnaW5Cb3R0b20scGFkZGluZ0xlZnQscGFkZGluZ1RvcCxwYWRkaW5nUmlnaHQscGFkZGluZ0JvdHRvbSxiYWNrZ3JvdW5kUG9zaXRpb24sYmFja2dyb3VuZFBvc2l0aW9uX3ksXCIsXG5cdFx0XHRjdWJpY1RvUXVhZHJhdGljID0gZnVuY3Rpb24oYSwgYiwgYywgZCkge1xuXHRcdFx0XHR2YXIgcTEgPSB7YTphfSxcblx0XHRcdFx0XHRxMiA9IHt9LFxuXHRcdFx0XHRcdHEzID0ge30sXG5cdFx0XHRcdFx0cTQgPSB7YzpkfSxcblx0XHRcdFx0XHRtYWIgPSAoYSArIGIpIC8gMixcblx0XHRcdFx0XHRtYmMgPSAoYiArIGMpIC8gMixcblx0XHRcdFx0XHRtY2QgPSAoYyArIGQpIC8gMixcblx0XHRcdFx0XHRtYWJjID0gKG1hYiArIG1iYykgLyAyLFxuXHRcdFx0XHRcdG1iY2QgPSAobWJjICsgbWNkKSAvIDIsXG5cdFx0XHRcdFx0bTggPSAobWJjZCAtIG1hYmMpIC8gODtcblx0XHRcdFx0cTEuYiA9IG1hYiArIChhIC0gbWFiKSAvIDQ7XG5cdFx0XHRcdHEyLmIgPSBtYWJjICsgbTg7XG5cdFx0XHRcdHExLmMgPSBxMi5hID0gKHExLmIgKyBxMi5iKSAvIDI7XG5cdFx0XHRcdHEyLmMgPSBxMy5hID0gKG1hYmMgKyBtYmNkKSAvIDI7XG5cdFx0XHRcdHEzLmIgPSBtYmNkIC0gbTg7XG5cdFx0XHRcdHE0LmIgPSBtY2QgKyAoZCAtIG1jZCkgLyA0O1xuXHRcdFx0XHRxMy5jID0gcTQuYSA9IChxMy5iICsgcTQuYikgLyAyO1xuXHRcdFx0XHRyZXR1cm4gW3ExLCBxMiwgcTMsIHE0XTtcblx0XHRcdH0sXG5cdFx0XHRfY2FsY3VsYXRlQ29udHJvbFBvaW50cyA9IGZ1bmN0aW9uKGEsIGN1cnZpbmVzcywgcXVhZCwgYmFzaWMsIGNvcnJlbGF0ZSkge1xuXHRcdFx0XHR2YXIgbCA9IGEubGVuZ3RoIC0gMSxcblx0XHRcdFx0XHRpaSA9IDAsXG5cdFx0XHRcdFx0Y3AxID0gYVswXS5hLFxuXHRcdFx0XHRcdGksIHAxLCBwMiwgcDMsIHNlZywgbTEsIG0yLCBtbSwgY3AyLCBxYiwgcjEsIHIyLCB0bDtcblx0XHRcdFx0Zm9yIChpID0gMDsgaSA8IGw7IGkrKykge1xuXHRcdFx0XHRcdHNlZyA9IGFbaWldO1xuXHRcdFx0XHRcdHAxID0gc2VnLmE7XG5cdFx0XHRcdFx0cDIgPSBzZWcuZDtcblx0XHRcdFx0XHRwMyA9IGFbaWkrMV0uZDtcblxuXHRcdFx0XHRcdGlmIChjb3JyZWxhdGUpIHtcblx0XHRcdFx0XHRcdHIxID0gX3IxW2ldO1xuXHRcdFx0XHRcdFx0cjIgPSBfcjJbaV07XG5cdFx0XHRcdFx0XHR0bCA9ICgocjIgKyByMSkgKiBjdXJ2aW5lc3MgKiAwLjI1KSAvIChiYXNpYyA/IDAuNSA6IF9yM1tpXSB8fCAwLjUpO1xuXHRcdFx0XHRcdFx0bTEgPSBwMiAtIChwMiAtIHAxKSAqIChiYXNpYyA/IGN1cnZpbmVzcyAqIDAuNSA6IChyMSAhPT0gMCA/IHRsIC8gcjEgOiAwKSk7XG5cdFx0XHRcdFx0XHRtMiA9IHAyICsgKHAzIC0gcDIpICogKGJhc2ljID8gY3VydmluZXNzICogMC41IDogKHIyICE9PSAwID8gdGwgLyByMiA6IDApKTtcblx0XHRcdFx0XHRcdG1tID0gcDIgLSAobTEgKyAoKChtMiAtIG0xKSAqICgocjEgKiAzIC8gKHIxICsgcjIpKSArIDAuNSkgLyA0KSB8fCAwKSk7XG5cdFx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRcdG0xID0gcDIgLSAocDIgLSBwMSkgKiBjdXJ2aW5lc3MgKiAwLjU7XG5cdFx0XHRcdFx0XHRtMiA9IHAyICsgKHAzIC0gcDIpICogY3VydmluZXNzICogMC41O1xuXHRcdFx0XHRcdFx0bW0gPSBwMiAtIChtMSArIG0yKSAvIDI7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdG0xICs9IG1tO1xuXHRcdFx0XHRcdG0yICs9IG1tO1xuXG5cdFx0XHRcdFx0c2VnLmMgPSBjcDIgPSBtMTtcblx0XHRcdFx0XHRpZiAoaSAhPT0gMCkge1xuXHRcdFx0XHRcdFx0c2VnLmIgPSBjcDE7XG5cdFx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRcdHNlZy5iID0gY3AxID0gc2VnLmEgKyAoc2VnLmMgLSBzZWcuYSkgKiAwLjY7IC8vaW5zdGVhZCBvZiBwbGFjaW5nIGIgb24gYSBleGFjdGx5LCB3ZSBtb3ZlIGl0IGlubGluZSB3aXRoIGMgc28gdGhhdCBpZiB0aGUgdXNlciBzcGVjaWZpZXMgYW4gZWFzZSBsaWtlIEJhY2suZWFzZUluIG9yIEVsYXN0aWMuZWFzZUluIHdoaWNoIGdvZXMgQkVZT05EIHRoZSBiZWdpbm5pbmcsIGl0IHdpbGwgZG8gc28gc21vb3RobHkuXG5cdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0c2VnLmRhID0gcDIgLSBwMTtcblx0XHRcdFx0XHRzZWcuY2EgPSBjcDIgLSBwMTtcblx0XHRcdFx0XHRzZWcuYmEgPSBjcDEgLSBwMTtcblxuXHRcdFx0XHRcdGlmIChxdWFkKSB7XG5cdFx0XHRcdFx0XHRxYiA9IGN1YmljVG9RdWFkcmF0aWMocDEsIGNwMSwgY3AyLCBwMik7XG5cdFx0XHRcdFx0XHRhLnNwbGljZShpaSwgMSwgcWJbMF0sIHFiWzFdLCBxYlsyXSwgcWJbM10pO1xuXHRcdFx0XHRcdFx0aWkgKz0gNDtcblx0XHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdFx0aWkrKztcblx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHRjcDEgPSBtMjtcblx0XHRcdFx0fVxuXHRcdFx0XHRzZWcgPSBhW2lpXTtcblx0XHRcdFx0c2VnLmIgPSBjcDE7XG5cdFx0XHRcdHNlZy5jID0gY3AxICsgKHNlZy5kIC0gY3AxKSAqIDAuNDsgLy9pbnN0ZWFkIG9mIHBsYWNpbmcgYyBvbiBkIGV4YWN0bHksIHdlIG1vdmUgaXQgaW5saW5lIHdpdGggYiBzbyB0aGF0IGlmIHRoZSB1c2VyIHNwZWNpZmllcyBhbiBlYXNlIGxpa2UgQmFjay5lYXNlT3V0IG9yIEVsYXN0aWMuZWFzZU91dCB3aGljaCBnb2VzIEJFWU9ORCB0aGUgZW5kLCBpdCB3aWxsIGRvIHNvIHNtb290aGx5LlxuXHRcdFx0XHRzZWcuZGEgPSBzZWcuZCAtIHNlZy5hO1xuXHRcdFx0XHRzZWcuY2EgPSBzZWcuYyAtIHNlZy5hO1xuXHRcdFx0XHRzZWcuYmEgPSBjcDEgLSBzZWcuYTtcblx0XHRcdFx0aWYgKHF1YWQpIHtcblx0XHRcdFx0XHRxYiA9IGN1YmljVG9RdWFkcmF0aWMoc2VnLmEsIGNwMSwgc2VnLmMsIHNlZy5kKTtcblx0XHRcdFx0XHRhLnNwbGljZShpaSwgMSwgcWJbMF0sIHFiWzFdLCBxYlsyXSwgcWJbM10pO1xuXHRcdFx0XHR9XG5cdFx0XHR9LFxuXHRcdFx0X3BhcnNlQW5jaG9ycyA9IGZ1bmN0aW9uKHZhbHVlcywgcCwgY29ycmVsYXRlLCBwcmVwZW5kKSB7XG5cdFx0XHRcdHZhciBhID0gW10sXG5cdFx0XHRcdFx0bCwgaSwgcDEsIHAyLCBwMywgdG1wO1xuXHRcdFx0XHRpZiAocHJlcGVuZCkge1xuXHRcdFx0XHRcdHZhbHVlcyA9IFtwcmVwZW5kXS5jb25jYXQodmFsdWVzKTtcblx0XHRcdFx0XHRpID0gdmFsdWVzLmxlbmd0aDtcblx0XHRcdFx0XHR3aGlsZSAoLS1pID4gLTEpIHtcblx0XHRcdFx0XHRcdGlmICh0eXBlb2YoICh0bXAgPSB2YWx1ZXNbaV1bcF0pICkgPT09IFwic3RyaW5nXCIpIGlmICh0bXAuY2hhckF0KDEpID09PSBcIj1cIikge1xuXHRcdFx0XHRcdFx0XHR2YWx1ZXNbaV1bcF0gPSBwcmVwZW5kW3BdICsgTnVtYmVyKHRtcC5jaGFyQXQoMCkgKyB0bXAuc3Vic3RyKDIpKTsgLy9hY2NvbW1vZGF0ZSByZWxhdGl2ZSB2YWx1ZXMuIERvIGl0IGlubGluZSBpbnN0ZWFkIG9mIGJyZWFraW5nIGl0IG91dCBpbnRvIGEgZnVuY3Rpb24gZm9yIHNwZWVkIHJlYXNvbnNcblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblx0XHRcdFx0bCA9IHZhbHVlcy5sZW5ndGggLSAyO1xuXHRcdFx0XHRpZiAobCA8IDApIHtcblx0XHRcdFx0XHRhWzBdID0gbmV3IFNlZ21lbnQodmFsdWVzWzBdW3BdLCAwLCAwLCB2YWx1ZXNbKGwgPCAtMSkgPyAwIDogMV1bcF0pO1xuXHRcdFx0XHRcdHJldHVybiBhO1xuXHRcdFx0XHR9XG5cdFx0XHRcdGZvciAoaSA9IDA7IGkgPCBsOyBpKyspIHtcblx0XHRcdFx0XHRwMSA9IHZhbHVlc1tpXVtwXTtcblx0XHRcdFx0XHRwMiA9IHZhbHVlc1tpKzFdW3BdO1xuXHRcdFx0XHRcdGFbaV0gPSBuZXcgU2VnbWVudChwMSwgMCwgMCwgcDIpO1xuXHRcdFx0XHRcdGlmIChjb3JyZWxhdGUpIHtcblx0XHRcdFx0XHRcdHAzID0gdmFsdWVzW2krMl1bcF07XG5cdFx0XHRcdFx0XHRfcjFbaV0gPSAoX3IxW2ldIHx8IDApICsgKHAyIC0gcDEpICogKHAyIC0gcDEpO1xuXHRcdFx0XHRcdFx0X3IyW2ldID0gKF9yMltpXSB8fCAwKSArIChwMyAtIHAyKSAqIChwMyAtIHAyKTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblx0XHRcdFx0YVtpXSA9IG5ldyBTZWdtZW50KHZhbHVlc1tpXVtwXSwgMCwgMCwgdmFsdWVzW2krMV1bcF0pO1xuXHRcdFx0XHRyZXR1cm4gYTtcblx0XHRcdH0sXG5cdFx0XHRiZXppZXJUaHJvdWdoID0gZnVuY3Rpb24odmFsdWVzLCBjdXJ2aW5lc3MsIHF1YWRyYXRpYywgYmFzaWMsIGNvcnJlbGF0ZSwgcHJlcGVuZCkge1xuXHRcdFx0XHR2YXIgb2JqID0ge30sXG5cdFx0XHRcdFx0cHJvcHMgPSBbXSxcblx0XHRcdFx0XHRmaXJzdCA9IHByZXBlbmQgfHwgdmFsdWVzWzBdLFxuXHRcdFx0XHRcdGksIHAsIGEsIGosIHIsIGwsIHNlYW1sZXNzLCBsYXN0O1xuXHRcdFx0XHRjb3JyZWxhdGUgPSAodHlwZW9mKGNvcnJlbGF0ZSkgPT09IFwic3RyaW5nXCIpID8gXCIsXCIrY29ycmVsYXRlK1wiLFwiIDogX2NvcnJlbGF0ZTtcblx0XHRcdFx0aWYgKGN1cnZpbmVzcyA9PSBudWxsKSB7XG5cdFx0XHRcdFx0Y3VydmluZXNzID0gMTtcblx0XHRcdFx0fVxuXHRcdFx0XHRmb3IgKHAgaW4gdmFsdWVzWzBdKSB7XG5cdFx0XHRcdFx0cHJvcHMucHVzaChwKTtcblx0XHRcdFx0fVxuXHRcdFx0XHQvL2NoZWNrIHRvIHNlZSBpZiB0aGUgbGFzdCBhbmQgZmlyc3QgdmFsdWVzIGFyZSBpZGVudGljYWwgKHdlbGwsIHdpdGhpbiAwLjA1KS4gSWYgc28sIG1ha2Ugc2VhbWxlc3MgYnkgYXBwZW5kaW5nIHRoZSBzZWNvbmQgZWxlbWVudCB0byB0aGUgdmVyeSBlbmQgb2YgdGhlIHZhbHVlcyBhcnJheSBhbmQgdGhlIDJuZC10by1sYXN0IGVsZW1lbnQgdG8gdGhlIHZlcnkgYmVnaW5uaW5nICh3ZSdsbCByZW1vdmUgdGhvc2Ugc2VnbWVudHMgbGF0ZXIpXG5cdFx0XHRcdGlmICh2YWx1ZXMubGVuZ3RoID4gMSkge1xuXHRcdFx0XHRcdGxhc3QgPSB2YWx1ZXNbdmFsdWVzLmxlbmd0aCAtIDFdO1xuXHRcdFx0XHRcdHNlYW1sZXNzID0gdHJ1ZTtcblx0XHRcdFx0XHRpID0gcHJvcHMubGVuZ3RoO1xuXHRcdFx0XHRcdHdoaWxlICgtLWkgPiAtMSkge1xuXHRcdFx0XHRcdFx0cCA9IHByb3BzW2ldO1xuXHRcdFx0XHRcdFx0aWYgKE1hdGguYWJzKGZpcnN0W3BdIC0gbGFzdFtwXSkgPiAwLjA1KSB7IC8vYnVpbGQgaW4gYSB0b2xlcmFuY2Ugb2YgKy8tMC4wNSB0byBhY2NvbW1vZGF0ZSByb3VuZGluZyBlcnJvcnMuIEZvciBleGFtcGxlLCBpZiB5b3Ugc2V0IGFuIG9iamVjdCdzIHBvc2l0aW9uIHRvIDQuOTQ1LCBGbGFzaCB3aWxsIG1ha2UgaXQgNC45XG5cdFx0XHRcdFx0XHRcdHNlYW1sZXNzID0gZmFsc2U7XG5cdFx0XHRcdFx0XHRcdGJyZWFrO1xuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHRpZiAoc2VhbWxlc3MpIHtcblx0XHRcdFx0XHRcdHZhbHVlcyA9IHZhbHVlcy5jb25jYXQoKTsgLy9kdXBsaWNhdGUgdGhlIGFycmF5IHRvIGF2b2lkIGNvbnRhbWluYXRpbmcgdGhlIG9yaWdpbmFsIHdoaWNoIHRoZSB1c2VyIG1heSBiZSByZXVzaW5nIGZvciBvdGhlciB0d2VlbnNcblx0XHRcdFx0XHRcdGlmIChwcmVwZW5kKSB7XG5cdFx0XHRcdFx0XHRcdHZhbHVlcy51bnNoaWZ0KHByZXBlbmQpO1xuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0dmFsdWVzLnB1c2godmFsdWVzWzFdKTtcblx0XHRcdFx0XHRcdHByZXBlbmQgPSB2YWx1ZXNbdmFsdWVzLmxlbmd0aCAtIDNdO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXHRcdFx0XHRfcjEubGVuZ3RoID0gX3IyLmxlbmd0aCA9IF9yMy5sZW5ndGggPSAwO1xuXHRcdFx0XHRpID0gcHJvcHMubGVuZ3RoO1xuXHRcdFx0XHR3aGlsZSAoLS1pID4gLTEpIHtcblx0XHRcdFx0XHRwID0gcHJvcHNbaV07XG5cdFx0XHRcdFx0X2NvclByb3BzW3BdID0gKGNvcnJlbGF0ZS5pbmRleE9mKFwiLFwiK3ArXCIsXCIpICE9PSAtMSk7XG5cdFx0XHRcdFx0b2JqW3BdID0gX3BhcnNlQW5jaG9ycyh2YWx1ZXMsIHAsIF9jb3JQcm9wc1twXSwgcHJlcGVuZCk7XG5cdFx0XHRcdH1cblx0XHRcdFx0aSA9IF9yMS5sZW5ndGg7XG5cdFx0XHRcdHdoaWxlICgtLWkgPiAtMSkge1xuXHRcdFx0XHRcdF9yMVtpXSA9IE1hdGguc3FydChfcjFbaV0pO1xuXHRcdFx0XHRcdF9yMltpXSA9IE1hdGguc3FydChfcjJbaV0pO1xuXHRcdFx0XHR9XG5cdFx0XHRcdGlmICghYmFzaWMpIHtcblx0XHRcdFx0XHRpID0gcHJvcHMubGVuZ3RoO1xuXHRcdFx0XHRcdHdoaWxlICgtLWkgPiAtMSkge1xuXHRcdFx0XHRcdFx0aWYgKF9jb3JQcm9wc1twXSkge1xuXHRcdFx0XHRcdFx0XHRhID0gb2JqW3Byb3BzW2ldXTtcblx0XHRcdFx0XHRcdFx0bCA9IGEubGVuZ3RoIC0gMTtcblx0XHRcdFx0XHRcdFx0Zm9yIChqID0gMDsgaiA8IGw7IGorKykge1xuXHRcdFx0XHRcdFx0XHRcdHIgPSBhW2orMV0uZGEgLyBfcjJbal0gKyBhW2pdLmRhIC8gX3IxW2pdO1xuXHRcdFx0XHRcdFx0XHRcdF9yM1tqXSA9IChfcjNbal0gfHwgMCkgKyByICogcjtcblx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHRpID0gX3IzLmxlbmd0aDtcblx0XHRcdFx0XHR3aGlsZSAoLS1pID4gLTEpIHtcblx0XHRcdFx0XHRcdF9yM1tpXSA9IE1hdGguc3FydChfcjNbaV0pO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXHRcdFx0XHRpID0gcHJvcHMubGVuZ3RoO1xuXHRcdFx0XHRqID0gcXVhZHJhdGljID8gNCA6IDE7XG5cdFx0XHRcdHdoaWxlICgtLWkgPiAtMSkge1xuXHRcdFx0XHRcdHAgPSBwcm9wc1tpXTtcblx0XHRcdFx0XHRhID0gb2JqW3BdO1xuXHRcdFx0XHRcdF9jYWxjdWxhdGVDb250cm9sUG9pbnRzKGEsIGN1cnZpbmVzcywgcXVhZHJhdGljLCBiYXNpYywgX2NvclByb3BzW3BdKTsgLy90aGlzIG1ldGhvZCByZXF1aXJlcyB0aGF0IF9wYXJzZUFuY2hvcnMoKSBhbmQgX3NldFNlZ21lbnRSYXRpb3MoKSByYW4gZmlyc3Qgc28gdGhhdCBfcjEsIF9yMiwgYW5kIF9yMyB2YWx1ZXMgYXJlIHBvcHVsYXRlZCBmb3IgYWxsIHByb3BlcnRpZXNcblx0XHRcdFx0XHRpZiAoc2VhbWxlc3MpIHtcblx0XHRcdFx0XHRcdGEuc3BsaWNlKDAsIGopO1xuXHRcdFx0XHRcdFx0YS5zcGxpY2UoYS5sZW5ndGggLSBqLCBqKTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblx0XHRcdFx0cmV0dXJuIG9iajtcblx0XHRcdH0sXG5cdFx0XHRfcGFyc2VCZXppZXJEYXRhID0gZnVuY3Rpb24odmFsdWVzLCB0eXBlLCBwcmVwZW5kKSB7XG5cdFx0XHRcdHR5cGUgPSB0eXBlIHx8IFwic29mdFwiO1xuXHRcdFx0XHR2YXIgb2JqID0ge30sXG5cdFx0XHRcdFx0aW5jID0gKHR5cGUgPT09IFwiY3ViaWNcIikgPyAzIDogMixcblx0XHRcdFx0XHRzb2Z0ID0gKHR5cGUgPT09IFwic29mdFwiKSxcblx0XHRcdFx0XHRwcm9wcyA9IFtdLFxuXHRcdFx0XHRcdGEsIGIsIGMsIGQsIGN1ciwgaSwgaiwgbCwgcCwgY250LCB0bXA7XG5cdFx0XHRcdGlmIChzb2Z0ICYmIHByZXBlbmQpIHtcblx0XHRcdFx0XHR2YWx1ZXMgPSBbcHJlcGVuZF0uY29uY2F0KHZhbHVlcyk7XG5cdFx0XHRcdH1cblx0XHRcdFx0aWYgKHZhbHVlcyA9PSBudWxsIHx8IHZhbHVlcy5sZW5ndGggPCBpbmMgKyAxKSB7IHRocm93IFwiaW52YWxpZCBCZXppZXIgZGF0YVwiOyB9XG5cdFx0XHRcdGZvciAocCBpbiB2YWx1ZXNbMF0pIHtcblx0XHRcdFx0XHRwcm9wcy5wdXNoKHApO1xuXHRcdFx0XHR9XG5cdFx0XHRcdGkgPSBwcm9wcy5sZW5ndGg7XG5cdFx0XHRcdHdoaWxlICgtLWkgPiAtMSkge1xuXHRcdFx0XHRcdHAgPSBwcm9wc1tpXTtcblx0XHRcdFx0XHRvYmpbcF0gPSBjdXIgPSBbXTtcblx0XHRcdFx0XHRjbnQgPSAwO1xuXHRcdFx0XHRcdGwgPSB2YWx1ZXMubGVuZ3RoO1xuXHRcdFx0XHRcdGZvciAoaiA9IDA7IGogPCBsOyBqKyspIHtcblx0XHRcdFx0XHRcdGEgPSAocHJlcGVuZCA9PSBudWxsKSA/IHZhbHVlc1tqXVtwXSA6ICh0eXBlb2YoICh0bXAgPSB2YWx1ZXNbal1bcF0pICkgPT09IFwic3RyaW5nXCIgJiYgdG1wLmNoYXJBdCgxKSA9PT0gXCI9XCIpID8gcHJlcGVuZFtwXSArIE51bWJlcih0bXAuY2hhckF0KDApICsgdG1wLnN1YnN0cigyKSkgOiBOdW1iZXIodG1wKTtcblx0XHRcdFx0XHRcdGlmIChzb2Z0KSBpZiAoaiA+IDEpIGlmIChqIDwgbCAtIDEpIHtcblx0XHRcdFx0XHRcdFx0Y3VyW2NudCsrXSA9IChhICsgY3VyW2NudC0yXSkgLyAyO1xuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0Y3VyW2NudCsrXSA9IGE7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdGwgPSBjbnQgLSBpbmMgKyAxO1xuXHRcdFx0XHRcdGNudCA9IDA7XG5cdFx0XHRcdFx0Zm9yIChqID0gMDsgaiA8IGw7IGogKz0gaW5jKSB7XG5cdFx0XHRcdFx0XHRhID0gY3VyW2pdO1xuXHRcdFx0XHRcdFx0YiA9IGN1cltqKzFdO1xuXHRcdFx0XHRcdFx0YyA9IGN1cltqKzJdO1xuXHRcdFx0XHRcdFx0ZCA9IChpbmMgPT09IDIpID8gMCA6IGN1cltqKzNdO1xuXHRcdFx0XHRcdFx0Y3VyW2NudCsrXSA9IHRtcCA9IChpbmMgPT09IDMpID8gbmV3IFNlZ21lbnQoYSwgYiwgYywgZCkgOiBuZXcgU2VnbWVudChhLCAoMiAqIGIgKyBhKSAvIDMsICgyICogYiArIGMpIC8gMywgYyk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdGN1ci5sZW5ndGggPSBjbnQ7XG5cdFx0XHRcdH1cblx0XHRcdFx0cmV0dXJuIG9iajtcblx0XHRcdH0sXG5cdFx0XHRfYWRkQ3ViaWNMZW5ndGhzID0gZnVuY3Rpb24oYSwgc3RlcHMsIHJlc29sdXRpb24pIHtcblx0XHRcdFx0dmFyIGluYyA9IDEgLyByZXNvbHV0aW9uLFxuXHRcdFx0XHRcdGogPSBhLmxlbmd0aCxcblx0XHRcdFx0XHRkLCBkMSwgcywgZGEsIGNhLCBiYSwgcCwgaSwgaW52LCBiZXosIGluZGV4O1xuXHRcdFx0XHR3aGlsZSAoLS1qID4gLTEpIHtcblx0XHRcdFx0XHRiZXogPSBhW2pdO1xuXHRcdFx0XHRcdHMgPSBiZXouYTtcblx0XHRcdFx0XHRkYSA9IGJlei5kIC0gcztcblx0XHRcdFx0XHRjYSA9IGJlei5jIC0gcztcblx0XHRcdFx0XHRiYSA9IGJlei5iIC0gcztcblx0XHRcdFx0XHRkID0gZDEgPSAwO1xuXHRcdFx0XHRcdGZvciAoaSA9IDE7IGkgPD0gcmVzb2x1dGlvbjsgaSsrKSB7XG5cdFx0XHRcdFx0XHRwID0gaW5jICogaTtcblx0XHRcdFx0XHRcdGludiA9IDEgLSBwO1xuXHRcdFx0XHRcdFx0ZCA9IGQxIC0gKGQxID0gKHAgKiBwICogZGEgKyAzICogaW52ICogKHAgKiBjYSArIGludiAqIGJhKSkgKiBwKTtcblx0XHRcdFx0XHRcdGluZGV4ID0gaiAqIHJlc29sdXRpb24gKyBpIC0gMTtcblx0XHRcdFx0XHRcdHN0ZXBzW2luZGV4XSA9IChzdGVwc1tpbmRleF0gfHwgMCkgKyBkICogZDtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblx0XHRcdH0sXG5cdFx0XHRfcGFyc2VMZW5ndGhEYXRhID0gZnVuY3Rpb24ob2JqLCByZXNvbHV0aW9uKSB7XG5cdFx0XHRcdHJlc29sdXRpb24gPSByZXNvbHV0aW9uID4+IDAgfHwgNjtcblx0XHRcdFx0dmFyIGEgPSBbXSxcblx0XHRcdFx0XHRsZW5ndGhzID0gW10sXG5cdFx0XHRcdFx0ZCA9IDAsXG5cdFx0XHRcdFx0dG90YWwgPSAwLFxuXHRcdFx0XHRcdHRocmVzaG9sZCA9IHJlc29sdXRpb24gLSAxLFxuXHRcdFx0XHRcdHNlZ21lbnRzID0gW10sXG5cdFx0XHRcdFx0Y3VyTFMgPSBbXSwgLy9jdXJyZW50IGxlbmd0aCBzZWdtZW50cyBhcnJheVxuXHRcdFx0XHRcdHAsIGksIGwsIGluZGV4O1xuXHRcdFx0XHRmb3IgKHAgaW4gb2JqKSB7XG5cdFx0XHRcdFx0X2FkZEN1YmljTGVuZ3RocyhvYmpbcF0sIGEsIHJlc29sdXRpb24pO1xuXHRcdFx0XHR9XG5cdFx0XHRcdGwgPSBhLmxlbmd0aDtcblx0XHRcdFx0Zm9yIChpID0gMDsgaSA8IGw7IGkrKykge1xuXHRcdFx0XHRcdGQgKz0gTWF0aC5zcXJ0KGFbaV0pO1xuXHRcdFx0XHRcdGluZGV4ID0gaSAlIHJlc29sdXRpb247XG5cdFx0XHRcdFx0Y3VyTFNbaW5kZXhdID0gZDtcblx0XHRcdFx0XHRpZiAoaW5kZXggPT09IHRocmVzaG9sZCkge1xuXHRcdFx0XHRcdFx0dG90YWwgKz0gZDtcblx0XHRcdFx0XHRcdGluZGV4ID0gKGkgLyByZXNvbHV0aW9uKSA+PiAwO1xuXHRcdFx0XHRcdFx0c2VnbWVudHNbaW5kZXhdID0gY3VyTFM7XG5cdFx0XHRcdFx0XHRsZW5ndGhzW2luZGV4XSA9IHRvdGFsO1xuXHRcdFx0XHRcdFx0ZCA9IDA7XG5cdFx0XHRcdFx0XHRjdXJMUyA9IFtdO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXHRcdFx0XHRyZXR1cm4ge2xlbmd0aDp0b3RhbCwgbGVuZ3RoczpsZW5ndGhzLCBzZWdtZW50czpzZWdtZW50c307XG5cdFx0XHR9LFxuXG5cblxuXHRcdFx0QmV6aWVyUGx1Z2luID0gX2dzU2NvcGUuX2dzRGVmaW5lLnBsdWdpbih7XG5cdFx0XHRcdFx0cHJvcE5hbWU6IFwiYmV6aWVyXCIsXG5cdFx0XHRcdFx0cHJpb3JpdHk6IC0xLFxuXHRcdFx0XHRcdHZlcnNpb246IFwiMS4zLjRcIixcblx0XHRcdFx0XHRBUEk6IDIsXG5cdFx0XHRcdFx0Z2xvYmFsOnRydWUsXG5cblx0XHRcdFx0XHQvL2dldHMgY2FsbGVkIHdoZW4gdGhlIHR3ZWVuIHJlbmRlcnMgZm9yIHRoZSBmaXJzdCB0aW1lLiBUaGlzIGlzIHdoZXJlIGluaXRpYWwgdmFsdWVzIHNob3VsZCBiZSByZWNvcmRlZCBhbmQgYW55IHNldHVwIHJvdXRpbmVzIHNob3VsZCBydW4uXG5cdFx0XHRcdFx0aW5pdDogZnVuY3Rpb24odGFyZ2V0LCB2YXJzLCB0d2Vlbikge1xuXHRcdFx0XHRcdFx0dGhpcy5fdGFyZ2V0ID0gdGFyZ2V0O1xuXHRcdFx0XHRcdFx0aWYgKHZhcnMgaW5zdGFuY2VvZiBBcnJheSkge1xuXHRcdFx0XHRcdFx0XHR2YXJzID0ge3ZhbHVlczp2YXJzfTtcblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdHRoaXMuX2Z1bmMgPSB7fTtcblx0XHRcdFx0XHRcdHRoaXMuX3JvdW5kID0ge307XG5cdFx0XHRcdFx0XHR0aGlzLl9wcm9wcyA9IFtdO1xuXHRcdFx0XHRcdFx0dGhpcy5fdGltZVJlcyA9ICh2YXJzLnRpbWVSZXNvbHV0aW9uID09IG51bGwpID8gNiA6IHBhcnNlSW50KHZhcnMudGltZVJlc29sdXRpb24sIDEwKTtcblx0XHRcdFx0XHRcdHZhciB2YWx1ZXMgPSB2YXJzLnZhbHVlcyB8fCBbXSxcblx0XHRcdFx0XHRcdFx0Zmlyc3QgPSB7fSxcblx0XHRcdFx0XHRcdFx0c2Vjb25kID0gdmFsdWVzWzBdLFxuXHRcdFx0XHRcdFx0XHRhdXRvUm90YXRlID0gdmFycy5hdXRvUm90YXRlIHx8IHR3ZWVuLnZhcnMub3JpZW50VG9CZXppZXIsXG5cdFx0XHRcdFx0XHRcdHAsIGlzRnVuYywgaSwgaiwgcHJlcGVuZDtcblxuXHRcdFx0XHRcdFx0dGhpcy5fYXV0b1JvdGF0ZSA9IGF1dG9Sb3RhdGUgPyAoYXV0b1JvdGF0ZSBpbnN0YW5jZW9mIEFycmF5KSA/IGF1dG9Sb3RhdGUgOiBbW1wieFwiLFwieVwiLFwicm90YXRpb25cIiwoKGF1dG9Sb3RhdGUgPT09IHRydWUpID8gMCA6IE51bWJlcihhdXRvUm90YXRlKSB8fCAwKV1dIDogbnVsbDtcblx0XHRcdFx0XHRcdGZvciAocCBpbiBzZWNvbmQpIHtcblx0XHRcdFx0XHRcdFx0dGhpcy5fcHJvcHMucHVzaChwKTtcblx0XHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdFx0aSA9IHRoaXMuX3Byb3BzLmxlbmd0aDtcblx0XHRcdFx0XHRcdHdoaWxlICgtLWkgPiAtMSkge1xuXHRcdFx0XHRcdFx0XHRwID0gdGhpcy5fcHJvcHNbaV07XG5cblx0XHRcdFx0XHRcdFx0dGhpcy5fb3ZlcndyaXRlUHJvcHMucHVzaChwKTtcblx0XHRcdFx0XHRcdFx0aXNGdW5jID0gdGhpcy5fZnVuY1twXSA9ICh0eXBlb2YodGFyZ2V0W3BdKSA9PT0gXCJmdW5jdGlvblwiKTtcblx0XHRcdFx0XHRcdFx0Zmlyc3RbcF0gPSAoIWlzRnVuYykgPyBwYXJzZUZsb2F0KHRhcmdldFtwXSkgOiB0YXJnZXRbICgocC5pbmRleE9mKFwic2V0XCIpIHx8IHR5cGVvZih0YXJnZXRbXCJnZXRcIiArIHAuc3Vic3RyKDMpXSkgIT09IFwiZnVuY3Rpb25cIikgPyBwIDogXCJnZXRcIiArIHAuc3Vic3RyKDMpKSBdKCk7XG5cdFx0XHRcdFx0XHRcdGlmICghcHJlcGVuZCkgaWYgKGZpcnN0W3BdICE9PSB2YWx1ZXNbMF1bcF0pIHtcblx0XHRcdFx0XHRcdFx0XHRwcmVwZW5kID0gZmlyc3Q7XG5cdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdHRoaXMuX2JlemllcnMgPSAodmFycy50eXBlICE9PSBcImN1YmljXCIgJiYgdmFycy50eXBlICE9PSBcInF1YWRyYXRpY1wiICYmIHZhcnMudHlwZSAhPT0gXCJzb2Z0XCIpID8gYmV6aWVyVGhyb3VnaCh2YWx1ZXMsIGlzTmFOKHZhcnMuY3VydmluZXNzKSA/IDEgOiB2YXJzLmN1cnZpbmVzcywgZmFsc2UsICh2YXJzLnR5cGUgPT09IFwidGhydUJhc2ljXCIpLCB2YXJzLmNvcnJlbGF0ZSwgcHJlcGVuZCkgOiBfcGFyc2VCZXppZXJEYXRhKHZhbHVlcywgdmFycy50eXBlLCBmaXJzdCk7XG5cdFx0XHRcdFx0XHR0aGlzLl9zZWdDb3VudCA9IHRoaXMuX2JlemllcnNbcF0ubGVuZ3RoO1xuXG5cdFx0XHRcdFx0XHRpZiAodGhpcy5fdGltZVJlcykge1xuXHRcdFx0XHRcdFx0XHR2YXIgbGQgPSBfcGFyc2VMZW5ndGhEYXRhKHRoaXMuX2JlemllcnMsIHRoaXMuX3RpbWVSZXMpO1xuXHRcdFx0XHRcdFx0XHR0aGlzLl9sZW5ndGggPSBsZC5sZW5ndGg7XG5cdFx0XHRcdFx0XHRcdHRoaXMuX2xlbmd0aHMgPSBsZC5sZW5ndGhzO1xuXHRcdFx0XHRcdFx0XHR0aGlzLl9zZWdtZW50cyA9IGxkLnNlZ21lbnRzO1xuXHRcdFx0XHRcdFx0XHR0aGlzLl9sMSA9IHRoaXMuX2xpID0gdGhpcy5fczEgPSB0aGlzLl9zaSA9IDA7XG5cdFx0XHRcdFx0XHRcdHRoaXMuX2wyID0gdGhpcy5fbGVuZ3Roc1swXTtcblx0XHRcdFx0XHRcdFx0dGhpcy5fY3VyU2VnID0gdGhpcy5fc2VnbWVudHNbMF07XG5cdFx0XHRcdFx0XHRcdHRoaXMuX3MyID0gdGhpcy5fY3VyU2VnWzBdO1xuXHRcdFx0XHRcdFx0XHR0aGlzLl9wcmVjID0gMSAvIHRoaXMuX2N1clNlZy5sZW5ndGg7XG5cdFx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHRcdGlmICgoYXV0b1JvdGF0ZSA9IHRoaXMuX2F1dG9Sb3RhdGUpKSB7XG5cdFx0XHRcdFx0XHRcdHRoaXMuX2luaXRpYWxSb3RhdGlvbnMgPSBbXTtcblx0XHRcdFx0XHRcdFx0aWYgKCEoYXV0b1JvdGF0ZVswXSBpbnN0YW5jZW9mIEFycmF5KSkge1xuXHRcdFx0XHRcdFx0XHRcdHRoaXMuX2F1dG9Sb3RhdGUgPSBhdXRvUm90YXRlID0gW2F1dG9Sb3RhdGVdO1xuXHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRcdGkgPSBhdXRvUm90YXRlLmxlbmd0aDtcblx0XHRcdFx0XHRcdFx0d2hpbGUgKC0taSA+IC0xKSB7XG5cdFx0XHRcdFx0XHRcdFx0Zm9yIChqID0gMDsgaiA8IDM7IGorKykge1xuXHRcdFx0XHRcdFx0XHRcdFx0cCA9IGF1dG9Sb3RhdGVbaV1bal07XG5cdFx0XHRcdFx0XHRcdFx0XHR0aGlzLl9mdW5jW3BdID0gKHR5cGVvZih0YXJnZXRbcF0pID09PSBcImZ1bmN0aW9uXCIpID8gdGFyZ2V0WyAoKHAuaW5kZXhPZihcInNldFwiKSB8fCB0eXBlb2YodGFyZ2V0W1wiZ2V0XCIgKyBwLnN1YnN0cigzKV0pICE9PSBcImZ1bmN0aW9uXCIpID8gcCA6IFwiZ2V0XCIgKyBwLnN1YnN0cigzKSkgXSA6IGZhbHNlO1xuXHRcdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdFx0XHRwID0gYXV0b1JvdGF0ZVtpXVsyXTtcblx0XHRcdFx0XHRcdFx0XHR0aGlzLl9pbml0aWFsUm90YXRpb25zW2ldID0gdGhpcy5fZnVuY1twXSA/IHRoaXMuX2Z1bmNbcF0uY2FsbCh0aGlzLl90YXJnZXQpIDogdGhpcy5fdGFyZ2V0W3BdO1xuXHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHR0aGlzLl9zdGFydFJhdGlvID0gdHdlZW4udmFycy5ydW5CYWNrd2FyZHMgPyAxIDogMDsgLy93ZSBkZXRlcm1pbmUgdGhlIHN0YXJ0aW5nIHJhdGlvIHdoZW4gdGhlIHR3ZWVuIGluaXRzIHdoaWNoIGlzIGFsd2F5cyAwIHVubGVzcyB0aGUgdHdlZW4gaGFzIHJ1bkJhY2t3YXJkczp0cnVlIChpbmRpY2F0aW5nIGl0J3MgYSBmcm9tKCkgdHdlZW4pIGluIHdoaWNoIGNhc2UgaXQncyAxLlxuXHRcdFx0XHRcdFx0cmV0dXJuIHRydWU7XG5cdFx0XHRcdFx0fSxcblxuXHRcdFx0XHRcdC8vY2FsbGVkIGVhY2ggdGltZSB0aGUgdmFsdWVzIHNob3VsZCBiZSB1cGRhdGVkLCBhbmQgdGhlIHJhdGlvIGdldHMgcGFzc2VkIGFzIHRoZSBvbmx5IHBhcmFtZXRlciAodHlwaWNhbGx5IGl0J3MgYSB2YWx1ZSBiZXR3ZWVuIDAgYW5kIDEsIGJ1dCBpdCBjYW4gZXhjZWVkIHRob3NlIHdoZW4gdXNpbmcgYW4gZWFzZSBsaWtlIEVsYXN0aWMuZWFzZU91dCBvciBCYWNrLmVhc2VPdXQsIGV0Yy4pXG5cdFx0XHRcdFx0c2V0OiBmdW5jdGlvbih2KSB7XG5cdFx0XHRcdFx0XHR2YXIgc2VnbWVudHMgPSB0aGlzLl9zZWdDb3VudCxcblx0XHRcdFx0XHRcdFx0ZnVuYyA9IHRoaXMuX2Z1bmMsXG5cdFx0XHRcdFx0XHRcdHRhcmdldCA9IHRoaXMuX3RhcmdldCxcblx0XHRcdFx0XHRcdFx0bm90U3RhcnQgPSAodiAhPT0gdGhpcy5fc3RhcnRSYXRpbyksXG5cdFx0XHRcdFx0XHRcdGN1ckluZGV4LCBpbnYsIGksIHAsIGIsIHQsIHZhbCwgbCwgbGVuZ3RocywgY3VyU2VnO1xuXHRcdFx0XHRcdFx0aWYgKCF0aGlzLl90aW1lUmVzKSB7XG5cdFx0XHRcdFx0XHRcdGN1ckluZGV4ID0gKHYgPCAwKSA/IDAgOiAodiA+PSAxKSA/IHNlZ21lbnRzIC0gMSA6IChzZWdtZW50cyAqIHYpID4+IDA7XG5cdFx0XHRcdFx0XHRcdHQgPSAodiAtIChjdXJJbmRleCAqICgxIC8gc2VnbWVudHMpKSkgKiBzZWdtZW50cztcblx0XHRcdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0XHRcdGxlbmd0aHMgPSB0aGlzLl9sZW5ndGhzO1xuXHRcdFx0XHRcdFx0XHRjdXJTZWcgPSB0aGlzLl9jdXJTZWc7XG5cdFx0XHRcdFx0XHRcdHYgKj0gdGhpcy5fbGVuZ3RoO1xuXHRcdFx0XHRcdFx0XHRpID0gdGhpcy5fbGk7XG5cdFx0XHRcdFx0XHRcdC8vZmluZCB0aGUgYXBwcm9wcmlhdGUgc2VnbWVudCAoaWYgdGhlIGN1cnJlbnRseSBjYWNoZWQgb25lIGlzbid0IGNvcnJlY3QpXG5cdFx0XHRcdFx0XHRcdGlmICh2ID4gdGhpcy5fbDIgJiYgaSA8IHNlZ21lbnRzIC0gMSkge1xuXHRcdFx0XHRcdFx0XHRcdGwgPSBzZWdtZW50cyAtIDE7XG5cdFx0XHRcdFx0XHRcdFx0d2hpbGUgKGkgPCBsICYmICh0aGlzLl9sMiA9IGxlbmd0aHNbKytpXSkgPD0gdikge1x0fVxuXHRcdFx0XHRcdFx0XHRcdHRoaXMuX2wxID0gbGVuZ3Roc1tpLTFdO1xuXHRcdFx0XHRcdFx0XHRcdHRoaXMuX2xpID0gaTtcblx0XHRcdFx0XHRcdFx0XHR0aGlzLl9jdXJTZWcgPSBjdXJTZWcgPSB0aGlzLl9zZWdtZW50c1tpXTtcblx0XHRcdFx0XHRcdFx0XHR0aGlzLl9zMiA9IGN1clNlZ1sodGhpcy5fczEgPSB0aGlzLl9zaSA9IDApXTtcblx0XHRcdFx0XHRcdFx0fSBlbHNlIGlmICh2IDwgdGhpcy5fbDEgJiYgaSA+IDApIHtcblx0XHRcdFx0XHRcdFx0XHR3aGlsZSAoaSA+IDAgJiYgKHRoaXMuX2wxID0gbGVuZ3Roc1stLWldKSA+PSB2KSB7IH1cblx0XHRcdFx0XHRcdFx0XHRpZiAoaSA9PT0gMCAmJiB2IDwgdGhpcy5fbDEpIHtcblx0XHRcdFx0XHRcdFx0XHRcdHRoaXMuX2wxID0gMDtcblx0XHRcdFx0XHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdFx0XHRcdFx0aSsrO1xuXHRcdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdFx0XHR0aGlzLl9sMiA9IGxlbmd0aHNbaV07XG5cdFx0XHRcdFx0XHRcdFx0dGhpcy5fbGkgPSBpO1xuXHRcdFx0XHRcdFx0XHRcdHRoaXMuX2N1clNlZyA9IGN1clNlZyA9IHRoaXMuX3NlZ21lbnRzW2ldO1xuXHRcdFx0XHRcdFx0XHRcdHRoaXMuX3MxID0gY3VyU2VnWyh0aGlzLl9zaSA9IGN1clNlZy5sZW5ndGggLSAxKSAtIDFdIHx8IDA7XG5cdFx0XHRcdFx0XHRcdFx0dGhpcy5fczIgPSBjdXJTZWdbdGhpcy5fc2ldO1xuXHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRcdGN1ckluZGV4ID0gaTtcblx0XHRcdFx0XHRcdFx0Ly9ub3cgZmluZCB0aGUgYXBwcm9wcmlhdGUgc3ViLXNlZ21lbnQgKHdlIHNwbGl0IGl0IGludG8gdGhlIG51bWJlciBvZiBwaWVjZXMgdGhhdCB3YXMgZGVmaW5lZCBieSBcInByZWNpc2lvblwiIGFuZCBtZWFzdXJlZCBlYWNoIG9uZSlcblx0XHRcdFx0XHRcdFx0diAtPSB0aGlzLl9sMTtcblx0XHRcdFx0XHRcdFx0aSA9IHRoaXMuX3NpO1xuXHRcdFx0XHRcdFx0XHRpZiAodiA+IHRoaXMuX3MyICYmIGkgPCBjdXJTZWcubGVuZ3RoIC0gMSkge1xuXHRcdFx0XHRcdFx0XHRcdGwgPSBjdXJTZWcubGVuZ3RoIC0gMTtcblx0XHRcdFx0XHRcdFx0XHR3aGlsZSAoaSA8IGwgJiYgKHRoaXMuX3MyID0gY3VyU2VnWysraV0pIDw9IHYpIHtcdH1cblx0XHRcdFx0XHRcdFx0XHR0aGlzLl9zMSA9IGN1clNlZ1tpLTFdO1xuXHRcdFx0XHRcdFx0XHRcdHRoaXMuX3NpID0gaTtcblx0XHRcdFx0XHRcdFx0fSBlbHNlIGlmICh2IDwgdGhpcy5fczEgJiYgaSA+IDApIHtcblx0XHRcdFx0XHRcdFx0XHR3aGlsZSAoaSA+IDAgJiYgKHRoaXMuX3MxID0gY3VyU2VnWy0taV0pID49IHYpIHtcdH1cblx0XHRcdFx0XHRcdFx0XHRpZiAoaSA9PT0gMCAmJiB2IDwgdGhpcy5fczEpIHtcblx0XHRcdFx0XHRcdFx0XHRcdHRoaXMuX3MxID0gMDtcblx0XHRcdFx0XHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdFx0XHRcdFx0aSsrO1xuXHRcdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdFx0XHR0aGlzLl9zMiA9IGN1clNlZ1tpXTtcblx0XHRcdFx0XHRcdFx0XHR0aGlzLl9zaSA9IGk7XG5cdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdFx0dCA9IChpICsgKHYgLSB0aGlzLl9zMSkgLyAodGhpcy5fczIgLSB0aGlzLl9zMSkpICogdGhpcy5fcHJlYztcblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdGludiA9IDEgLSB0O1xuXG5cdFx0XHRcdFx0XHRpID0gdGhpcy5fcHJvcHMubGVuZ3RoO1xuXHRcdFx0XHRcdFx0d2hpbGUgKC0taSA+IC0xKSB7XG5cdFx0XHRcdFx0XHRcdHAgPSB0aGlzLl9wcm9wc1tpXTtcblx0XHRcdFx0XHRcdFx0YiA9IHRoaXMuX2JlemllcnNbcF1bY3VySW5kZXhdO1xuXHRcdFx0XHRcdFx0XHR2YWwgPSAodCAqIHQgKiBiLmRhICsgMyAqIGludiAqICh0ICogYi5jYSArIGludiAqIGIuYmEpKSAqIHQgKyBiLmE7XG5cdFx0XHRcdFx0XHRcdGlmICh0aGlzLl9yb3VuZFtwXSkge1xuXHRcdFx0XHRcdFx0XHRcdHZhbCA9IE1hdGgucm91bmQodmFsKTtcblx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0XHRpZiAoZnVuY1twXSkge1xuXHRcdFx0XHRcdFx0XHRcdHRhcmdldFtwXSh2YWwpO1xuXHRcdFx0XHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdFx0XHRcdHRhcmdldFtwXSA9IHZhbDtcblx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0XHRpZiAodGhpcy5fYXV0b1JvdGF0ZSkge1xuXHRcdFx0XHRcdFx0XHR2YXIgYXIgPSB0aGlzLl9hdXRvUm90YXRlLFxuXHRcdFx0XHRcdFx0XHRcdGIyLCB4MSwgeTEsIHgyLCB5MiwgYWRkLCBjb252O1xuXHRcdFx0XHRcdFx0XHRpID0gYXIubGVuZ3RoO1xuXHRcdFx0XHRcdFx0XHR3aGlsZSAoLS1pID4gLTEpIHtcblx0XHRcdFx0XHRcdFx0XHRwID0gYXJbaV1bMl07XG5cdFx0XHRcdFx0XHRcdFx0YWRkID0gYXJbaV1bM10gfHwgMDtcblx0XHRcdFx0XHRcdFx0XHRjb252ID0gKGFyW2ldWzRdID09PSB0cnVlKSA/IDEgOiBfUkFEMkRFRztcblx0XHRcdFx0XHRcdFx0XHRiID0gdGhpcy5fYmV6aWVyc1thcltpXVswXV07XG5cdFx0XHRcdFx0XHRcdFx0YjIgPSB0aGlzLl9iZXppZXJzW2FyW2ldWzFdXTtcblxuXHRcdFx0XHRcdFx0XHRcdGlmIChiICYmIGIyKSB7IC8vaW4gY2FzZSBvbmUgb2YgdGhlIHByb3BlcnRpZXMgZ290IG92ZXJ3cml0dGVuLlxuXHRcdFx0XHRcdFx0XHRcdFx0YiA9IGJbY3VySW5kZXhdO1xuXHRcdFx0XHRcdFx0XHRcdFx0YjIgPSBiMltjdXJJbmRleF07XG5cblx0XHRcdFx0XHRcdFx0XHRcdHgxID0gYi5hICsgKGIuYiAtIGIuYSkgKiB0O1xuXHRcdFx0XHRcdFx0XHRcdFx0eDIgPSBiLmIgKyAoYi5jIC0gYi5iKSAqIHQ7XG5cdFx0XHRcdFx0XHRcdFx0XHR4MSArPSAoeDIgLSB4MSkgKiB0O1xuXHRcdFx0XHRcdFx0XHRcdFx0eDIgKz0gKChiLmMgKyAoYi5kIC0gYi5jKSAqIHQpIC0geDIpICogdDtcblxuXHRcdFx0XHRcdFx0XHRcdFx0eTEgPSBiMi5hICsgKGIyLmIgLSBiMi5hKSAqIHQ7XG5cdFx0XHRcdFx0XHRcdFx0XHR5MiA9IGIyLmIgKyAoYjIuYyAtIGIyLmIpICogdDtcblx0XHRcdFx0XHRcdFx0XHRcdHkxICs9ICh5MiAtIHkxKSAqIHQ7XG5cdFx0XHRcdFx0XHRcdFx0XHR5MiArPSAoKGIyLmMgKyAoYjIuZCAtIGIyLmMpICogdCkgLSB5MikgKiB0O1xuXG5cdFx0XHRcdFx0XHRcdFx0XHR2YWwgPSBub3RTdGFydCA/IE1hdGguYXRhbjIoeTIgLSB5MSwgeDIgLSB4MSkgKiBjb252ICsgYWRkIDogdGhpcy5faW5pdGlhbFJvdGF0aW9uc1tpXTtcblxuXHRcdFx0XHRcdFx0XHRcdFx0aWYgKGZ1bmNbcF0pIHtcblx0XHRcdFx0XHRcdFx0XHRcdFx0dGFyZ2V0W3BdKHZhbCk7XG5cdFx0XHRcdFx0XHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdFx0XHRcdFx0XHR0YXJnZXRbcF0gPSB2YWw7XG5cdFx0XHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0fVxuXHRcdFx0fSksXG5cdFx0XHRwID0gQmV6aWVyUGx1Z2luLnByb3RvdHlwZTtcblxuXG5cdFx0QmV6aWVyUGx1Z2luLmJlemllclRocm91Z2ggPSBiZXppZXJUaHJvdWdoO1xuXHRcdEJlemllclBsdWdpbi5jdWJpY1RvUXVhZHJhdGljID0gY3ViaWNUb1F1YWRyYXRpYztcblx0XHRCZXppZXJQbHVnaW4uX2F1dG9DU1MgPSB0cnVlOyAvL2luZGljYXRlcyB0aGF0IHRoaXMgcGx1Z2luIGNhbiBiZSBpbnNlcnRlZCBpbnRvIHRoZSBcImNzc1wiIG9iamVjdCB1c2luZyB0aGUgYXV0b0NTUyBmZWF0dXJlIG9mIFR3ZWVuTGl0ZVxuXHRcdEJlemllclBsdWdpbi5xdWFkcmF0aWNUb0N1YmljID0gZnVuY3Rpb24oYSwgYiwgYykge1xuXHRcdFx0cmV0dXJuIG5ldyBTZWdtZW50KGEsICgyICogYiArIGEpIC8gMywgKDIgKiBiICsgYykgLyAzLCBjKTtcblx0XHR9O1xuXG5cdFx0QmV6aWVyUGx1Z2luLl9jc3NSZWdpc3RlciA9IGZ1bmN0aW9uKCkge1xuXHRcdFx0dmFyIENTU1BsdWdpbiA9IF9nbG9iYWxzLkNTU1BsdWdpbjtcblx0XHRcdGlmICghQ1NTUGx1Z2luKSB7XG5cdFx0XHRcdHJldHVybjtcblx0XHRcdH1cblx0XHRcdHZhciBfaW50ZXJuYWxzID0gQ1NTUGx1Z2luLl9pbnRlcm5hbHMsXG5cdFx0XHRcdF9wYXJzZVRvUHJveHkgPSBfaW50ZXJuYWxzLl9wYXJzZVRvUHJveHksXG5cdFx0XHRcdF9zZXRQbHVnaW5SYXRpbyA9IF9pbnRlcm5hbHMuX3NldFBsdWdpblJhdGlvLFxuXHRcdFx0XHRDU1NQcm9wVHdlZW4gPSBfaW50ZXJuYWxzLkNTU1Byb3BUd2Vlbjtcblx0XHRcdF9pbnRlcm5hbHMuX3JlZ2lzdGVyQ29tcGxleFNwZWNpYWxQcm9wKFwiYmV6aWVyXCIsIHtwYXJzZXI6ZnVuY3Rpb24odCwgZSwgcHJvcCwgY3NzcCwgcHQsIHBsdWdpbikge1xuXHRcdFx0XHRpZiAoZSBpbnN0YW5jZW9mIEFycmF5KSB7XG5cdFx0XHRcdFx0ZSA9IHt2YWx1ZXM6ZX07XG5cdFx0XHRcdH1cblx0XHRcdFx0cGx1Z2luID0gbmV3IEJlemllclBsdWdpbigpO1xuXHRcdFx0XHR2YXIgdmFsdWVzID0gZS52YWx1ZXMsXG5cdFx0XHRcdFx0bCA9IHZhbHVlcy5sZW5ndGggLSAxLFxuXHRcdFx0XHRcdHBsdWdpblZhbHVlcyA9IFtdLFxuXHRcdFx0XHRcdHYgPSB7fSxcblx0XHRcdFx0XHRpLCBwLCBkYXRhO1xuXHRcdFx0XHRpZiAobCA8IDApIHtcblx0XHRcdFx0XHRyZXR1cm4gcHQ7XG5cdFx0XHRcdH1cblx0XHRcdFx0Zm9yIChpID0gMDsgaSA8PSBsOyBpKyspIHtcblx0XHRcdFx0XHRkYXRhID0gX3BhcnNlVG9Qcm94eSh0LCB2YWx1ZXNbaV0sIGNzc3AsIHB0LCBwbHVnaW4sIChsICE9PSBpKSk7XG5cdFx0XHRcdFx0cGx1Z2luVmFsdWVzW2ldID0gZGF0YS5lbmQ7XG5cdFx0XHRcdH1cblx0XHRcdFx0Zm9yIChwIGluIGUpIHtcblx0XHRcdFx0XHR2W3BdID0gZVtwXTsgLy9kdXBsaWNhdGUgdGhlIHZhcnMgb2JqZWN0IGJlY2F1c2Ugd2UgbmVlZCB0byBhbHRlciBzb21lIHRoaW5ncyB3aGljaCB3b3VsZCBjYXVzZSBwcm9ibGVtcyBpZiB0aGUgdXNlciBwbGFucyB0byByZXVzZSB0aGUgc2FtZSB2YXJzIG9iamVjdCBmb3IgYW5vdGhlciB0d2Vlbi5cblx0XHRcdFx0fVxuXHRcdFx0XHR2LnZhbHVlcyA9IHBsdWdpblZhbHVlcztcblx0XHRcdFx0cHQgPSBuZXcgQ1NTUHJvcFR3ZWVuKHQsIFwiYmV6aWVyXCIsIDAsIDAsIGRhdGEucHQsIDIpO1xuXHRcdFx0XHRwdC5kYXRhID0gZGF0YTtcblx0XHRcdFx0cHQucGx1Z2luID0gcGx1Z2luO1xuXHRcdFx0XHRwdC5zZXRSYXRpbyA9IF9zZXRQbHVnaW5SYXRpbztcblx0XHRcdFx0aWYgKHYuYXV0b1JvdGF0ZSA9PT0gMCkge1xuXHRcdFx0XHRcdHYuYXV0b1JvdGF0ZSA9IHRydWU7XG5cdFx0XHRcdH1cblx0XHRcdFx0aWYgKHYuYXV0b1JvdGF0ZSAmJiAhKHYuYXV0b1JvdGF0ZSBpbnN0YW5jZW9mIEFycmF5KSkge1xuXHRcdFx0XHRcdGkgPSAodi5hdXRvUm90YXRlID09PSB0cnVlKSA/IDAgOiBOdW1iZXIodi5hdXRvUm90YXRlKTtcblx0XHRcdFx0XHR2LmF1dG9Sb3RhdGUgPSAoZGF0YS5lbmQubGVmdCAhPSBudWxsKSA/IFtbXCJsZWZ0XCIsXCJ0b3BcIixcInJvdGF0aW9uXCIsaSxmYWxzZV1dIDogKGRhdGEuZW5kLnggIT0gbnVsbCkgPyBbW1wieFwiLFwieVwiLFwicm90YXRpb25cIixpLGZhbHNlXV0gOiBmYWxzZTtcblx0XHRcdFx0fVxuXHRcdFx0XHRpZiAodi5hdXRvUm90YXRlKSB7XG5cdFx0XHRcdFx0aWYgKCFjc3NwLl90cmFuc2Zvcm0pIHtcblx0XHRcdFx0XHRcdGNzc3AuX2VuYWJsZVRyYW5zZm9ybXMoZmFsc2UpO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHRkYXRhLmF1dG9Sb3RhdGUgPSBjc3NwLl90YXJnZXQuX2dzVHJhbnNmb3JtO1xuXHRcdFx0XHR9XG5cdFx0XHRcdHBsdWdpbi5fb25Jbml0VHdlZW4oZGF0YS5wcm94eSwgdiwgY3NzcC5fdHdlZW4pO1xuXHRcdFx0XHRyZXR1cm4gcHQ7XG5cdFx0XHR9fSk7XG5cdFx0fTtcblxuXHRcdHAuX3JvdW5kUHJvcHMgPSBmdW5jdGlvbihsb29rdXAsIHZhbHVlKSB7XG5cdFx0XHR2YXIgb3AgPSB0aGlzLl9vdmVyd3JpdGVQcm9wcyxcblx0XHRcdFx0aSA9IG9wLmxlbmd0aDtcblx0XHRcdHdoaWxlICgtLWkgPiAtMSkge1xuXHRcdFx0XHRpZiAobG9va3VwW29wW2ldXSB8fCBsb29rdXAuYmV6aWVyIHx8IGxvb2t1cC5iZXppZXJUaHJvdWdoKSB7XG5cdFx0XHRcdFx0dGhpcy5fcm91bmRbb3BbaV1dID0gdmFsdWU7XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9O1xuXG5cdFx0cC5fa2lsbCA9IGZ1bmN0aW9uKGxvb2t1cCkge1xuXHRcdFx0dmFyIGEgPSB0aGlzLl9wcm9wcyxcblx0XHRcdFx0cCwgaTtcblx0XHRcdGZvciAocCBpbiB0aGlzLl9iZXppZXJzKSB7XG5cdFx0XHRcdGlmIChwIGluIGxvb2t1cCkge1xuXHRcdFx0XHRcdGRlbGV0ZSB0aGlzLl9iZXppZXJzW3BdO1xuXHRcdFx0XHRcdGRlbGV0ZSB0aGlzLl9mdW5jW3BdO1xuXHRcdFx0XHRcdGkgPSBhLmxlbmd0aDtcblx0XHRcdFx0XHR3aGlsZSAoLS1pID4gLTEpIHtcblx0XHRcdFx0XHRcdGlmIChhW2ldID09PSBwKSB7XG5cdFx0XHRcdFx0XHRcdGEuc3BsaWNlKGksIDEpO1xuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdFx0cmV0dXJuIHRoaXMuX3N1cGVyLl9raWxsLmNhbGwodGhpcywgbG9va3VwKTtcblx0XHR9O1xuXG5cdH0oKSk7XG5cblxuXG5cblxuXG5cdFxuXHRcblx0XG5cdFxuXHRcblx0XG5cdFxuXHRcbi8qXG4gKiAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gKiBDU1NQbHVnaW5cbiAqIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAqL1xuXHRfZ3NTY29wZS5fZ3NEZWZpbmUoXCJwbHVnaW5zLkNTU1BsdWdpblwiLCBbXCJwbHVnaW5zLlR3ZWVuUGx1Z2luXCIsXCJUd2VlbkxpdGVcIl0sIGZ1bmN0aW9uKFR3ZWVuUGx1Z2luLCBUd2VlbkxpdGUpIHtcblxuXHRcdC8qKiBAY29uc3RydWN0b3IgKiovXG5cdFx0dmFyIENTU1BsdWdpbiA9IGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRUd2VlblBsdWdpbi5jYWxsKHRoaXMsIFwiY3NzXCIpO1xuXHRcdFx0XHR0aGlzLl9vdmVyd3JpdGVQcm9wcy5sZW5ndGggPSAwO1xuXHRcdFx0XHR0aGlzLnNldFJhdGlvID0gQ1NTUGx1Z2luLnByb3RvdHlwZS5zZXRSYXRpbzsgLy9zcGVlZCBvcHRpbWl6YXRpb24gKGF2b2lkIHByb3RvdHlwZSBsb29rdXAgb24gdGhpcyBcImhvdFwiIG1ldGhvZClcblx0XHRcdH0sXG5cdFx0XHRfZ2xvYmFscyA9IF9nc1Njb3BlLl9nc0RlZmluZS5nbG9iYWxzLFxuXHRcdFx0X2hhc1ByaW9yaXR5LCAvL3R1cm5zIHRydWUgd2hlbmV2ZXIgYSBDU1NQcm9wVHdlZW4gaW5zdGFuY2UgaXMgY3JlYXRlZCB0aGF0IGhhcyBhIHByaW9yaXR5IG90aGVyIHRoYW4gMC4gVGhpcyBoZWxwcyB1cyBkaXNjZXJuIHdoZXRoZXIgb3Igbm90IHdlIHNob3VsZCBzcGVuZCB0aGUgdGltZSBvcmdhbml6aW5nIHRoZSBsaW5rZWQgbGlzdCBvciBub3QgYWZ0ZXIgYSBDU1NQbHVnaW4ncyBfb25Jbml0VHdlZW4oKSBtZXRob2QgaXMgY2FsbGVkLlxuXHRcdFx0X3N1ZmZpeE1hcCwgLy93ZSBzZXQgdGhpcyBpbiBfb25Jbml0VHdlZW4oKSBlYWNoIHRpbWUgYXMgYSB3YXkgdG8gaGF2ZSBhIHBlcnNpc3RlbnQgdmFyaWFibGUgd2UgY2FuIHVzZSBpbiBvdGhlciBtZXRob2RzIGxpa2UgX3BhcnNlKCkgd2l0aG91dCBoYXZpbmcgdG8gcGFzcyBpdCBhcm91bmQgYXMgYSBwYXJhbWV0ZXIgYW5kIHdlIGtlZXAgX3BhcnNlKCkgZGVjb3VwbGVkIGZyb20gYSBwYXJ0aWN1bGFyIENTU1BsdWdpbiBpbnN0YW5jZVxuXHRcdFx0X2NzLCAvL2NvbXB1dGVkIHN0eWxlICh3ZSBzdG9yZSB0aGlzIGluIGEgc2hhcmVkIHZhcmlhYmxlIHRvIGNvbnNlcnZlIG1lbW9yeSBhbmQgbWFrZSBtaW5pZmljYXRpb24gdGlnaHRlclxuXHRcdFx0X292ZXJ3cml0ZVByb3BzLCAvL2FsaWFzIHRvIHRoZSBjdXJyZW50bHkgaW5zdGFudGlhdGluZyBDU1NQbHVnaW4ncyBfb3ZlcndyaXRlUHJvcHMgYXJyYXkuIFdlIHVzZSB0aGlzIGNsb3N1cmUgaW4gb3JkZXIgdG8gYXZvaWQgaGF2aW5nIHRvIHBhc3MgYSByZWZlcmVuY2UgYXJvdW5kIGZyb20gbWV0aG9kIHRvIG1ldGhvZCBhbmQgYWlkIGluIG1pbmlmaWNhdGlvbi5cblx0XHRcdF9zcGVjaWFsUHJvcHMgPSB7fSxcblx0XHRcdHAgPSBDU1NQbHVnaW4ucHJvdG90eXBlID0gbmV3IFR3ZWVuUGx1Z2luKFwiY3NzXCIpO1xuXG5cdFx0cC5jb25zdHJ1Y3RvciA9IENTU1BsdWdpbjtcblx0XHRDU1NQbHVnaW4udmVyc2lvbiA9IFwiMS4xOC4yXCI7XG5cdFx0Q1NTUGx1Z2luLkFQSSA9IDI7XG5cdFx0Q1NTUGx1Z2luLmRlZmF1bHRUcmFuc2Zvcm1QZXJzcGVjdGl2ZSA9IDA7XG5cdFx0Q1NTUGx1Z2luLmRlZmF1bHRTa2V3VHlwZSA9IFwiY29tcGVuc2F0ZWRcIjtcblx0XHRDU1NQbHVnaW4uZGVmYXVsdFNtb290aE9yaWdpbiA9IHRydWU7XG5cdFx0cCA9IFwicHhcIjsgLy93ZSdsbCByZXVzZSB0aGUgXCJwXCIgdmFyaWFibGUgdG8ga2VlcCBmaWxlIHNpemUgZG93blxuXHRcdENTU1BsdWdpbi5zdWZmaXhNYXAgPSB7dG9wOnAsIHJpZ2h0OnAsIGJvdHRvbTpwLCBsZWZ0OnAsIHdpZHRoOnAsIGhlaWdodDpwLCBmb250U2l6ZTpwLCBwYWRkaW5nOnAsIG1hcmdpbjpwLCBwZXJzcGVjdGl2ZTpwLCBsaW5lSGVpZ2h0OlwiXCJ9O1xuXG5cblx0XHR2YXIgX251bUV4cCA9IC8oPzpcXGR8XFwtXFxkfFxcLlxcZHxcXC1cXC5cXGQpKy9nLFxuXHRcdFx0X3JlbE51bUV4cCA9IC8oPzpcXGR8XFwtXFxkfFxcLlxcZHxcXC1cXC5cXGR8XFwrPVxcZHxcXC09XFxkfFxcKz0uXFxkfFxcLT1cXC5cXGQpKy9nLFxuXHRcdFx0X3ZhbHVlc0V4cCA9IC8oPzpcXCs9fFxcLT18XFwtfFxcYilbXFxkXFwtXFwuXStbYS16QS1aMC05XSooPzolfFxcYikvZ2ksIC8vZmluZHMgYWxsIHRoZSB2YWx1ZXMgdGhhdCBiZWdpbiB3aXRoIG51bWJlcnMgb3IgKz0gb3IgLT0gYW5kIHRoZW4gYSBudW1iZXIuIEluY2x1ZGVzIHN1ZmZpeGVzLiBXZSB1c2UgdGhpcyB0byBzcGxpdCBjb21wbGV4IHZhbHVlcyBhcGFydCBsaWtlIFwiMXB4IDVweCAyMHB4IHJnYigyNTUsMTAyLDUxKVwiXG5cdFx0XHRfTmFORXhwID0gLyg/IVsrLV0/XFxkKlxcLj9cXGQrfFsrLV18ZVsrLV1cXGQrKVteMC05XS9nLCAvL2Fsc28gYWxsb3dzIHNjaWVudGlmaWMgbm90YXRpb24gYW5kIGRvZXNuJ3Qga2lsbCB0aGUgbGVhZGluZyAtLysgaW4gLT0gYW5kICs9XG5cdFx0XHRfc3VmZml4RXhwID0gLyg/OlxcZHxcXC18XFwrfD18I3xcXC4pKi9nLFxuXHRcdFx0X29wYWNpdHlFeHAgPSAvb3BhY2l0eSAqPSAqKFteKV0qKS9pLFxuXHRcdFx0X29wYWNpdHlWYWxFeHAgPSAvb3BhY2l0eTooW147XSopL2ksXG5cdFx0XHRfYWxwaGFGaWx0ZXJFeHAgPSAvYWxwaGFcXChvcGFjaXR5ICo9Lis/XFwpL2ksXG5cdFx0XHRfcmdiaHNsRXhwID0gL14ocmdifGhzbCkvLFxuXHRcdFx0X2NhcHNFeHAgPSAvKFtBLVpdKS9nLFxuXHRcdFx0X2NhbWVsRXhwID0gLy0oW2Etel0pL2dpLFxuXHRcdFx0X3VybEV4cCA9IC8oXig/OnVybFxcKFxcXCJ8dXJsXFwoKSl8KD86KFxcXCJcXCkpJHxcXCkkKS9naSwgLy9mb3IgcHVsbGluZyBvdXQgdXJscyBmcm9tIHVybCguLi4pIG9yIHVybChcIi4uLlwiKSBzdHJpbmdzIChzb21lIGJyb3dzZXJzIHdyYXAgdXJscyBpbiBxdW90ZXMsIHNvbWUgZG9uJ3Qgd2hlbiByZXBvcnRpbmcgdGhpbmdzIGxpa2UgYmFja2dyb3VuZEltYWdlKVxuXHRcdFx0X2NhbWVsRnVuYyA9IGZ1bmN0aW9uKHMsIGcpIHsgcmV0dXJuIGcudG9VcHBlckNhc2UoKTsgfSxcblx0XHRcdF9ob3JpekV4cCA9IC8oPzpMZWZ0fFJpZ2h0fFdpZHRoKS9pLFxuXHRcdFx0X2llR2V0TWF0cml4RXhwID0gLyhNMTF8TTEyfE0yMXxNMjIpPVtcXGRcXC1cXC5lXSsvZ2ksXG5cdFx0XHRfaWVTZXRNYXRyaXhFeHAgPSAvcHJvZ2lkXFw6RFhJbWFnZVRyYW5zZm9ybVxcLk1pY3Jvc29mdFxcLk1hdHJpeFxcKC4rP1xcKS9pLFxuXHRcdFx0X2NvbW1hc091dHNpZGVQYXJlbkV4cCA9IC8sKD89W15cXCldKig/OlxcKHwkKSkvZ2ksIC8vZmluZHMgYW55IGNvbW1hcyB0aGF0IGFyZSBub3Qgd2l0aGluIHBhcmVudGhlc2lzXG5cdFx0XHRfREVHMlJBRCA9IE1hdGguUEkgLyAxODAsXG5cdFx0XHRfUkFEMkRFRyA9IDE4MCAvIE1hdGguUEksXG5cdFx0XHRfZm9yY2VQVCA9IHt9LFxuXHRcdFx0X2RvYyA9IGRvY3VtZW50LFxuXHRcdFx0X2NyZWF0ZUVsZW1lbnQgPSBmdW5jdGlvbih0eXBlKSB7XG5cdFx0XHRcdHJldHVybiBfZG9jLmNyZWF0ZUVsZW1lbnROUyA/IF9kb2MuY3JlYXRlRWxlbWVudE5TKFwiaHR0cDovL3d3dy53My5vcmcvMTk5OS94aHRtbFwiLCB0eXBlKSA6IF9kb2MuY3JlYXRlRWxlbWVudCh0eXBlKTtcblx0XHRcdH0sXG5cdFx0XHRfdGVtcERpdiA9IF9jcmVhdGVFbGVtZW50KFwiZGl2XCIpLFxuXHRcdFx0X3RlbXBJbWcgPSBfY3JlYXRlRWxlbWVudChcImltZ1wiKSxcblx0XHRcdF9pbnRlcm5hbHMgPSBDU1NQbHVnaW4uX2ludGVybmFscyA9IHtfc3BlY2lhbFByb3BzOl9zcGVjaWFsUHJvcHN9LCAvL3Byb3ZpZGVzIGEgaG9vayB0byBhIGZldyBpbnRlcm5hbCBtZXRob2RzIHRoYXQgd2UgbmVlZCB0byBhY2Nlc3MgZnJvbSBpbnNpZGUgb3RoZXIgcGx1Z2luc1xuXHRcdFx0X2FnZW50ID0gbmF2aWdhdG9yLnVzZXJBZ2VudCxcblx0XHRcdF9hdXRvUm91bmQsXG5cdFx0XHRfcmVxU2FmYXJpRml4LCAvL3dlIHdvbid0IGFwcGx5IHRoZSBTYWZhcmkgdHJhbnNmb3JtIGZpeCB1bnRpbCB3ZSBhY3R1YWxseSBjb21lIGFjcm9zcyBhIHR3ZWVuIHRoYXQgYWZmZWN0cyBhIHRyYW5zZm9ybSBwcm9wZXJ0eSAodG8gbWFpbnRhaW4gYmVzdCBwZXJmb3JtYW5jZSkuXG5cblx0XHRcdF9pc1NhZmFyaSxcblx0XHRcdF9pc0ZpcmVmb3gsIC8vRmlyZWZveCBoYXMgYSBidWcgdGhhdCBjYXVzZXMgM0QgdHJhbnNmb3JtZWQgZWxlbWVudHMgdG8gcmFuZG9tbHkgZGlzYXBwZWFyIHVubGVzcyBhIHJlcGFpbnQgaXMgZm9yY2VkIGFmdGVyIGVhY2ggdXBkYXRlIG9uIGVhY2ggZWxlbWVudC5cblx0XHRcdF9pc1NhZmFyaUxUNiwgLy9TYWZhcmkgKGFuZCBBbmRyb2lkIDQgd2hpY2ggdXNlcyBhIGZsYXZvciBvZiBTYWZhcmkpIGhhcyBhIGJ1ZyB0aGF0IHByZXZlbnRzIGNoYW5nZXMgdG8gXCJ0b3BcIiBhbmQgXCJsZWZ0XCIgcHJvcGVydGllcyBmcm9tIHJlbmRlcmluZyBwcm9wZXJseSBpZiBjaGFuZ2VkIG9uIHRoZSBzYW1lIGZyYW1lIGFzIGEgdHJhbnNmb3JtIFVOTEVTUyB3ZSBzZXQgdGhlIGVsZW1lbnQncyBXZWJraXRCYWNrZmFjZVZpc2liaWxpdHkgdG8gaGlkZGVuICh3ZWlyZCwgSSBrbm93KS4gRG9pbmcgdGhpcyBmb3IgQW5kcm9pZCAzIGFuZCBlYXJsaWVyIHNlZW1zIHRvIGFjdHVhbGx5IGNhdXNlIG90aGVyIHByb2JsZW1zLCB0aG91Z2ggKGZ1biEpXG5cdFx0XHRfaWVWZXJzLFxuXHRcdFx0X3N1cHBvcnRzT3BhY2l0eSA9IChmdW5jdGlvbigpIHsgLy93ZSBzZXQgX2lzU2FmYXJpLCBfaWVWZXJzLCBfaXNGaXJlZm94LCBhbmQgX3N1cHBvcnRzT3BhY2l0eSBhbGwgaW4gb25lIGZ1bmN0aW9uIGhlcmUgdG8gcmVkdWNlIGZpbGUgc2l6ZSBzbGlnaHRseSwgZXNwZWNpYWxseSBpbiB0aGUgbWluaWZpZWQgdmVyc2lvbi5cblx0XHRcdFx0dmFyIGkgPSBfYWdlbnQuaW5kZXhPZihcIkFuZHJvaWRcIiksXG5cdFx0XHRcdFx0YSA9IF9jcmVhdGVFbGVtZW50KFwiYVwiKTtcblx0XHRcdFx0X2lzU2FmYXJpID0gKF9hZ2VudC5pbmRleE9mKFwiU2FmYXJpXCIpICE9PSAtMSAmJiBfYWdlbnQuaW5kZXhPZihcIkNocm9tZVwiKSA9PT0gLTEgJiYgKGkgPT09IC0xIHx8IE51bWJlcihfYWdlbnQuc3Vic3RyKGkrOCwgMSkpID4gMykpO1xuXHRcdFx0XHRfaXNTYWZhcmlMVDYgPSAoX2lzU2FmYXJpICYmIChOdW1iZXIoX2FnZW50LnN1YnN0cihfYWdlbnQuaW5kZXhPZihcIlZlcnNpb24vXCIpKzgsIDEpKSA8IDYpKTtcblx0XHRcdFx0X2lzRmlyZWZveCA9IChfYWdlbnQuaW5kZXhPZihcIkZpcmVmb3hcIikgIT09IC0xKTtcblx0XHRcdFx0aWYgKCgvTVNJRSAoWzAtOV17MSx9W1xcLjAtOV17MCx9KS8pLmV4ZWMoX2FnZW50KSB8fCAoL1RyaWRlbnRcXC8uKnJ2OihbMC05XXsxLH1bXFwuMC05XXswLH0pLykuZXhlYyhfYWdlbnQpKSB7XG5cdFx0XHRcdFx0X2llVmVycyA9IHBhcnNlRmxvYXQoIFJlZ0V4cC4kMSApO1xuXHRcdFx0XHR9XG5cdFx0XHRcdGlmICghYSkge1xuXHRcdFx0XHRcdHJldHVybiBmYWxzZTtcblx0XHRcdFx0fVxuXHRcdFx0XHRhLnN0eWxlLmNzc1RleHQgPSBcInRvcDoxcHg7b3BhY2l0eTouNTU7XCI7XG5cdFx0XHRcdHJldHVybiAvXjAuNTUvLnRlc3QoYS5zdHlsZS5vcGFjaXR5KTtcblx0XHRcdH0oKSksXG5cdFx0XHRfZ2V0SUVPcGFjaXR5ID0gZnVuY3Rpb24odikge1xuXHRcdFx0XHRyZXR1cm4gKF9vcGFjaXR5RXhwLnRlc3QoICgodHlwZW9mKHYpID09PSBcInN0cmluZ1wiKSA/IHYgOiAodi5jdXJyZW50U3R5bGUgPyB2LmN1cnJlbnRTdHlsZS5maWx0ZXIgOiB2LnN0eWxlLmZpbHRlcikgfHwgXCJcIikgKSA/ICggcGFyc2VGbG9hdCggUmVnRXhwLiQxICkgLyAxMDAgKSA6IDEpO1xuXHRcdFx0fSxcblx0XHRcdF9sb2cgPSBmdW5jdGlvbihzKSB7Ly9mb3IgbG9nZ2luZyBtZXNzYWdlcywgYnV0IGluIGEgd2F5IHRoYXQgd29uJ3QgdGhyb3cgZXJyb3JzIGluIG9sZCB2ZXJzaW9ucyBvZiBJRS5cblx0XHRcdFx0aWYgKHdpbmRvdy5jb25zb2xlKSB7XG5cdFx0XHRcdFx0Y29uc29sZS5sb2cocyk7XG5cdFx0XHRcdH1cblx0XHRcdH0sXG5cblx0XHRcdF9wcmVmaXhDU1MgPSBcIlwiLCAvL3RoZSBub24tY2FtZWxDYXNlIHZlbmRvciBwcmVmaXggbGlrZSBcIi1vLVwiLCBcIi1tb3otXCIsIFwiLW1zLVwiLCBvciBcIi13ZWJraXQtXCJcblx0XHRcdF9wcmVmaXggPSBcIlwiLCAvL2NhbWVsQ2FzZSB2ZW5kb3IgcHJlZml4IGxpa2UgXCJPXCIsIFwibXNcIiwgXCJXZWJraXRcIiwgb3IgXCJNb3pcIi5cblxuXHRcdFx0Ly8gQHByaXZhdGUgZmVlZCBpbiBhIGNhbWVsQ2FzZSBwcm9wZXJ0eSBuYW1lIGxpa2UgXCJ0cmFuc2Zvcm1cIiBhbmQgaXQgd2lsbCBjaGVjayB0byBzZWUgaWYgaXQgaXMgdmFsaWQgYXMtaXMgb3IgaWYgaXQgbmVlZHMgYSB2ZW5kb3IgcHJlZml4LiBJdCByZXR1cm5zIHRoZSBjb3JyZWN0ZWQgY2FtZWxDYXNlIHByb3BlcnR5IG5hbWUgKGkuZS4gXCJXZWJraXRUcmFuc2Zvcm1cIiBvciBcIk1velRyYW5zZm9ybVwiIG9yIFwidHJhbnNmb3JtXCIgb3IgbnVsbCBpZiBubyBzdWNoIHByb3BlcnR5IGlzIGZvdW5kLCBsaWtlIGlmIHRoZSBicm93c2VyIGlzIElFOCBvciBiZWZvcmUsIFwidHJhbnNmb3JtXCIgd29uJ3QgYmUgZm91bmQgYXQgYWxsKVxuXHRcdFx0X2NoZWNrUHJvcFByZWZpeCA9IGZ1bmN0aW9uKHAsIGUpIHtcblx0XHRcdFx0ZSA9IGUgfHwgX3RlbXBEaXY7XG5cdFx0XHRcdHZhciBzID0gZS5zdHlsZSxcblx0XHRcdFx0XHRhLCBpO1xuXHRcdFx0XHRpZiAoc1twXSAhPT0gdW5kZWZpbmVkKSB7XG5cdFx0XHRcdFx0cmV0dXJuIHA7XG5cdFx0XHRcdH1cblx0XHRcdFx0cCA9IHAuY2hhckF0KDApLnRvVXBwZXJDYXNlKCkgKyBwLnN1YnN0cigxKTtcblx0XHRcdFx0YSA9IFtcIk9cIixcIk1velwiLFwibXNcIixcIk1zXCIsXCJXZWJraXRcIl07XG5cdFx0XHRcdGkgPSA1O1xuXHRcdFx0XHR3aGlsZSAoLS1pID4gLTEgJiYgc1thW2ldK3BdID09PSB1bmRlZmluZWQpIHsgfVxuXHRcdFx0XHRpZiAoaSA+PSAwKSB7XG5cdFx0XHRcdFx0X3ByZWZpeCA9IChpID09PSAzKSA/IFwibXNcIiA6IGFbaV07XG5cdFx0XHRcdFx0X3ByZWZpeENTUyA9IFwiLVwiICsgX3ByZWZpeC50b0xvd2VyQ2FzZSgpICsgXCItXCI7XG5cdFx0XHRcdFx0cmV0dXJuIF9wcmVmaXggKyBwO1xuXHRcdFx0XHR9XG5cdFx0XHRcdHJldHVybiBudWxsO1xuXHRcdFx0fSxcblxuXHRcdFx0X2dldENvbXB1dGVkU3R5bGUgPSBfZG9jLmRlZmF1bHRWaWV3ID8gX2RvYy5kZWZhdWx0Vmlldy5nZXRDb21wdXRlZFN0eWxlIDogZnVuY3Rpb24oKSB7fSxcblxuXHRcdFx0LyoqXG5cdFx0XHQgKiBAcHJpdmF0ZSBSZXR1cm5zIHRoZSBjc3Mgc3R5bGUgZm9yIGEgcGFydGljdWxhciBwcm9wZXJ0eSBvZiBhbiBlbGVtZW50LiBGb3IgZXhhbXBsZSwgdG8gZ2V0IHdoYXRldmVyIHRoZSBjdXJyZW50IFwibGVmdFwiIGNzcyB2YWx1ZSBmb3IgYW4gZWxlbWVudCB3aXRoIGFuIElEIG9mIFwibXlFbGVtZW50XCIsIHlvdSBjb3VsZCBkbzpcblx0XHRcdCAqIHZhciBjdXJyZW50TGVmdCA9IENTU1BsdWdpbi5nZXRTdHlsZSggZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJteUVsZW1lbnRcIiksIFwibGVmdFwiKTtcblx0XHRcdCAqXG5cdFx0XHQgKiBAcGFyYW0geyFPYmplY3R9IHQgVGFyZ2V0IGVsZW1lbnQgd2hvc2Ugc3R5bGUgcHJvcGVydHkgeW91IHdhbnQgdG8gcXVlcnlcblx0XHRcdCAqIEBwYXJhbSB7IXN0cmluZ30gcCBQcm9wZXJ0eSBuYW1lIChsaWtlIFwibGVmdFwiIG9yIFwidG9wXCIgb3IgXCJtYXJnaW5Ub3BcIiwgZXRjLilcblx0XHRcdCAqIEBwYXJhbSB7T2JqZWN0PX0gY3MgQ29tcHV0ZWQgc3R5bGUgb2JqZWN0LiBUaGlzIGp1c3QgcHJvdmlkZXMgYSB3YXkgdG8gc3BlZWQgcHJvY2Vzc2luZyBpZiB5b3UncmUgZ29pbmcgdG8gZ2V0IHNldmVyYWwgcHJvcGVydGllcyBvbiB0aGUgc2FtZSBlbGVtZW50IGluIHF1aWNrIHN1Y2Nlc3Npb24gLSB5b3UgY2FuIHJldXNlIHRoZSByZXN1bHQgb2YgdGhlIGdldENvbXB1dGVkU3R5bGUoKSBjYWxsLlxuXHRcdFx0ICogQHBhcmFtIHtib29sZWFuPX0gY2FsYyBJZiB0cnVlLCB0aGUgdmFsdWUgd2lsbCBub3QgYmUgcmVhZCBkaXJlY3RseSBmcm9tIHRoZSBlbGVtZW50J3MgXCJzdHlsZVwiIHByb3BlcnR5IChpZiBpdCBleGlzdHMgdGhlcmUpLCBidXQgaW5zdGVhZCB0aGUgZ2V0Q29tcHV0ZWRTdHlsZSgpIHJlc3VsdCB3aWxsIGJlIHVzZWQuIFRoaXMgY2FuIGJlIHVzZWZ1bCB3aGVuIHlvdSB3YW50IHRvIGVuc3VyZSB0aGF0IHRoZSBicm93c2VyIGl0c2VsZiBpcyBpbnRlcnByZXRpbmcgdGhlIHZhbHVlLlxuXHRcdFx0ICogQHBhcmFtIHtzdHJpbmc9fSBkZmx0IERlZmF1bHQgdmFsdWUgdGhhdCBzaG91bGQgYmUgcmV0dXJuZWQgaW4gdGhlIHBsYWNlIG9mIG51bGwsIFwibm9uZVwiLCBcImF1dG9cIiBvciBcImF1dG8gYXV0b1wiLlxuXHRcdFx0ICogQHJldHVybiB7P3N0cmluZ30gVGhlIGN1cnJlbnQgcHJvcGVydHkgdmFsdWVcblx0XHRcdCAqL1xuXHRcdFx0X2dldFN0eWxlID0gQ1NTUGx1Z2luLmdldFN0eWxlID0gZnVuY3Rpb24odCwgcCwgY3MsIGNhbGMsIGRmbHQpIHtcblx0XHRcdFx0dmFyIHJ2O1xuXHRcdFx0XHRpZiAoIV9zdXBwb3J0c09wYWNpdHkpIGlmIChwID09PSBcIm9wYWNpdHlcIikgeyAvL3NldmVyYWwgdmVyc2lvbnMgb2YgSUUgZG9uJ3QgdXNlIHRoZSBzdGFuZGFyZCBcIm9wYWNpdHlcIiBwcm9wZXJ0eSAtIHRoZXkgdXNlIHRoaW5ncyBsaWtlIGZpbHRlcjphbHBoYShvcGFjaXR5PTUwKSwgc28gd2UgcGFyc2UgdGhhdCBoZXJlLlxuXHRcdFx0XHRcdHJldHVybiBfZ2V0SUVPcGFjaXR5KHQpO1xuXHRcdFx0XHR9XG5cdFx0XHRcdGlmICghY2FsYyAmJiB0LnN0eWxlW3BdKSB7XG5cdFx0XHRcdFx0cnYgPSB0LnN0eWxlW3BdO1xuXHRcdFx0XHR9IGVsc2UgaWYgKChjcyA9IGNzIHx8IF9nZXRDb21wdXRlZFN0eWxlKHQpKSkge1xuXHRcdFx0XHRcdHJ2ID0gY3NbcF0gfHwgY3MuZ2V0UHJvcGVydHlWYWx1ZShwKSB8fCBjcy5nZXRQcm9wZXJ0eVZhbHVlKHAucmVwbGFjZShfY2Fwc0V4cCwgXCItJDFcIikudG9Mb3dlckNhc2UoKSk7XG5cdFx0XHRcdH0gZWxzZSBpZiAodC5jdXJyZW50U3R5bGUpIHtcblx0XHRcdFx0XHRydiA9IHQuY3VycmVudFN0eWxlW3BdO1xuXHRcdFx0XHR9XG5cdFx0XHRcdHJldHVybiAoZGZsdCAhPSBudWxsICYmICghcnYgfHwgcnYgPT09IFwibm9uZVwiIHx8IHJ2ID09PSBcImF1dG9cIiB8fCBydiA9PT0gXCJhdXRvIGF1dG9cIikpID8gZGZsdCA6IHJ2O1xuXHRcdFx0fSxcblxuXHRcdFx0LyoqXG5cdFx0XHQgKiBAcHJpdmF0ZSBQYXNzIHRoZSB0YXJnZXQgZWxlbWVudCwgdGhlIHByb3BlcnR5IG5hbWUsIHRoZSBudW1lcmljIHZhbHVlLCBhbmQgdGhlIHN1ZmZpeCAobGlrZSBcIiVcIiwgXCJlbVwiLCBcInB4XCIsIGV0Yy4pIGFuZCBpdCB3aWxsIHNwaXQgYmFjayB0aGUgZXF1aXZhbGVudCBwaXhlbCBudW1iZXIuXG5cdFx0XHQgKiBAcGFyYW0geyFPYmplY3R9IHQgVGFyZ2V0IGVsZW1lbnRcblx0XHRcdCAqIEBwYXJhbSB7IXN0cmluZ30gcCBQcm9wZXJ0eSBuYW1lIChsaWtlIFwibGVmdFwiLCBcInRvcFwiLCBcIm1hcmdpbkxlZnRcIiwgZXRjLilcblx0XHRcdCAqIEBwYXJhbSB7IW51bWJlcn0gdiBWYWx1ZVxuXHRcdFx0ICogQHBhcmFtIHtzdHJpbmc9fSBzZnggU3VmZml4IChsaWtlIFwicHhcIiBvciBcIiVcIiBvciBcImVtXCIpXG5cdFx0XHQgKiBAcGFyYW0ge2Jvb2xlYW49fSByZWN1cnNlIElmIHRydWUsIHRoZSBjYWxsIGlzIGEgcmVjdXJzaXZlIG9uZS4gSW4gc29tZSBicm93c2VycyAobGlrZSBJRTcvOCksIG9jY2FzaW9uYWxseSB0aGUgdmFsdWUgaXNuJ3QgYWNjdXJhdGVseSByZXBvcnRlZCBpbml0aWFsbHksIGJ1dCBpZiB3ZSBydW4gdGhlIGZ1bmN0aW9uIGFnYWluIGl0IHdpbGwgdGFrZSBlZmZlY3QuXG5cdFx0XHQgKiBAcmV0dXJuIHtudW1iZXJ9IHZhbHVlIGluIHBpeGVsc1xuXHRcdFx0ICovXG5cdFx0XHRfY29udmVydFRvUGl4ZWxzID0gX2ludGVybmFscy5jb252ZXJ0VG9QaXhlbHMgPSBmdW5jdGlvbih0LCBwLCB2LCBzZngsIHJlY3Vyc2UpIHtcblx0XHRcdFx0aWYgKHNmeCA9PT0gXCJweFwiIHx8ICFzZngpIHsgcmV0dXJuIHY7IH1cblx0XHRcdFx0aWYgKHNmeCA9PT0gXCJhdXRvXCIgfHwgIXYpIHsgcmV0dXJuIDA7IH1cblx0XHRcdFx0dmFyIGhvcml6ID0gX2hvcml6RXhwLnRlc3QocCksXG5cdFx0XHRcdFx0bm9kZSA9IHQsXG5cdFx0XHRcdFx0c3R5bGUgPSBfdGVtcERpdi5zdHlsZSxcblx0XHRcdFx0XHRuZWcgPSAodiA8IDApLFxuXHRcdFx0XHRcdHBpeCwgY2FjaGUsIHRpbWU7XG5cdFx0XHRcdGlmIChuZWcpIHtcblx0XHRcdFx0XHR2ID0gLXY7XG5cdFx0XHRcdH1cblx0XHRcdFx0aWYgKHNmeCA9PT0gXCIlXCIgJiYgcC5pbmRleE9mKFwiYm9yZGVyXCIpICE9PSAtMSkge1xuXHRcdFx0XHRcdHBpeCA9ICh2IC8gMTAwKSAqIChob3JpeiA/IHQuY2xpZW50V2lkdGggOiB0LmNsaWVudEhlaWdodCk7XG5cdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0c3R5bGUuY3NzVGV4dCA9IFwiYm9yZGVyOjAgc29saWQgcmVkO3Bvc2l0aW9uOlwiICsgX2dldFN0eWxlKHQsIFwicG9zaXRpb25cIikgKyBcIjtsaW5lLWhlaWdodDowO1wiO1xuXHRcdFx0XHRcdGlmIChzZnggPT09IFwiJVwiIHx8ICFub2RlLmFwcGVuZENoaWxkIHx8IHNmeC5jaGFyQXQoMCkgPT09IFwidlwiIHx8IHNmeCA9PT0gXCJyZW1cIikge1xuXHRcdFx0XHRcdFx0bm9kZSA9IHQucGFyZW50Tm9kZSB8fCBfZG9jLmJvZHk7XG5cdFx0XHRcdFx0XHRjYWNoZSA9IG5vZGUuX2dzQ2FjaGU7XG5cdFx0XHRcdFx0XHR0aW1lID0gVHdlZW5MaXRlLnRpY2tlci5mcmFtZTtcblx0XHRcdFx0XHRcdGlmIChjYWNoZSAmJiBob3JpeiAmJiBjYWNoZS50aW1lID09PSB0aW1lKSB7IC8vcGVyZm9ybWFuY2Ugb3B0aW1pemF0aW9uOiB3ZSByZWNvcmQgdGhlIHdpZHRoIG9mIGVsZW1lbnRzIGFsb25nIHdpdGggdGhlIHRpY2tlciBmcmFtZSBzbyB0aGF0IHdlIGNhbiBxdWlja2x5IGdldCBpdCBhZ2FpbiBvbiB0aGUgc2FtZSB0aWNrIChzZWVtcyByZWxhdGl2ZWx5IHNhZmUgdG8gYXNzdW1lIGl0IHdvdWxkbid0IGNoYW5nZSBvbiB0aGUgc2FtZSB0aWNrKVxuXHRcdFx0XHRcdFx0XHRyZXR1cm4gY2FjaGUud2lkdGggKiB2IC8gMTAwO1xuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0c3R5bGVbKGhvcml6ID8gXCJ3aWR0aFwiIDogXCJoZWlnaHRcIildID0gdiArIHNmeDtcblx0XHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdFx0c3R5bGVbKGhvcml6ID8gXCJib3JkZXJMZWZ0V2lkdGhcIiA6IFwiYm9yZGVyVG9wV2lkdGhcIildID0gdiArIHNmeDtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0bm9kZS5hcHBlbmRDaGlsZChfdGVtcERpdik7XG5cdFx0XHRcdFx0cGl4ID0gcGFyc2VGbG9hdChfdGVtcERpdlsoaG9yaXogPyBcIm9mZnNldFdpZHRoXCIgOiBcIm9mZnNldEhlaWdodFwiKV0pO1xuXHRcdFx0XHRcdG5vZGUucmVtb3ZlQ2hpbGQoX3RlbXBEaXYpO1xuXHRcdFx0XHRcdGlmIChob3JpeiAmJiBzZnggPT09IFwiJVwiICYmIENTU1BsdWdpbi5jYWNoZVdpZHRocyAhPT0gZmFsc2UpIHtcblx0XHRcdFx0XHRcdGNhY2hlID0gbm9kZS5fZ3NDYWNoZSA9IG5vZGUuX2dzQ2FjaGUgfHwge307XG5cdFx0XHRcdFx0XHRjYWNoZS50aW1lID0gdGltZTtcblx0XHRcdFx0XHRcdGNhY2hlLndpZHRoID0gcGl4IC8gdiAqIDEwMDtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0aWYgKHBpeCA9PT0gMCAmJiAhcmVjdXJzZSkge1xuXHRcdFx0XHRcdFx0cGl4ID0gX2NvbnZlcnRUb1BpeGVscyh0LCBwLCB2LCBzZngsIHRydWUpO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXHRcdFx0XHRyZXR1cm4gbmVnID8gLXBpeCA6IHBpeDtcblx0XHRcdH0sXG5cdFx0XHRfY2FsY3VsYXRlT2Zmc2V0ID0gX2ludGVybmFscy5jYWxjdWxhdGVPZmZzZXQgPSBmdW5jdGlvbih0LCBwLCBjcykgeyAvL2ZvciBmaWd1cmluZyBvdXQgXCJ0b3BcIiBvciBcImxlZnRcIiBpbiBweCB3aGVuIGl0J3MgXCJhdXRvXCIuIFdlIG5lZWQgdG8gZmFjdG9yIGluIG1hcmdpbiB3aXRoIHRoZSBvZmZzZXRMZWZ0L29mZnNldFRvcFxuXHRcdFx0XHRpZiAoX2dldFN0eWxlKHQsIFwicG9zaXRpb25cIiwgY3MpICE9PSBcImFic29sdXRlXCIpIHsgcmV0dXJuIDA7IH1cblx0XHRcdFx0dmFyIGRpbSA9ICgocCA9PT0gXCJsZWZ0XCIpID8gXCJMZWZ0XCIgOiBcIlRvcFwiKSxcblx0XHRcdFx0XHR2ID0gX2dldFN0eWxlKHQsIFwibWFyZ2luXCIgKyBkaW0sIGNzKTtcblx0XHRcdFx0cmV0dXJuIHRbXCJvZmZzZXRcIiArIGRpbV0gLSAoX2NvbnZlcnRUb1BpeGVscyh0LCBwLCBwYXJzZUZsb2F0KHYpLCB2LnJlcGxhY2UoX3N1ZmZpeEV4cCwgXCJcIikpIHx8IDApO1xuXHRcdFx0fSxcblxuXHRcdFx0Ly8gQHByaXZhdGUgcmV0dXJucyBhdCBvYmplY3QgY29udGFpbmluZyBBTEwgb2YgdGhlIHN0eWxlIHByb3BlcnRpZXMgaW4gY2FtZWxDYXNlIGFuZCB0aGVpciBhc3NvY2lhdGVkIHZhbHVlcy5cblx0XHRcdF9nZXRBbGxTdHlsZXMgPSBmdW5jdGlvbih0LCBjcykge1xuXHRcdFx0XHR2YXIgcyA9IHt9LFxuXHRcdFx0XHRcdGksIHRyLCBwO1xuXHRcdFx0XHRpZiAoKGNzID0gY3MgfHwgX2dldENvbXB1dGVkU3R5bGUodCwgbnVsbCkpKSB7XG5cdFx0XHRcdFx0aWYgKChpID0gY3MubGVuZ3RoKSkge1xuXHRcdFx0XHRcdFx0d2hpbGUgKC0taSA+IC0xKSB7XG5cdFx0XHRcdFx0XHRcdHAgPSBjc1tpXTtcblx0XHRcdFx0XHRcdFx0aWYgKHAuaW5kZXhPZihcIi10cmFuc2Zvcm1cIikgPT09IC0xIHx8IF90cmFuc2Zvcm1Qcm9wQ1NTID09PSBwKSB7IC8vU29tZSB3ZWJraXQgYnJvd3NlcnMgZHVwbGljYXRlIHRyYW5zZm9ybSB2YWx1ZXMsIG9uZSBub24tcHJlZml4ZWQgYW5kIG9uZSBwcmVmaXhlZCAoXCJ0cmFuc2Zvcm1cIiBhbmQgXCJXZWJraXRUcmFuc2Zvcm1cIiksIHNvIHdlIG11c3Qgd2VlZCBvdXQgdGhlIGV4dHJhIG9uZSBoZXJlLlxuXHRcdFx0XHRcdFx0XHRcdHNbcC5yZXBsYWNlKF9jYW1lbEV4cCwgX2NhbWVsRnVuYyldID0gY3MuZ2V0UHJvcGVydHlWYWx1ZShwKTtcblx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdH0gZWxzZSB7IC8vc29tZSBicm93c2VycyBiZWhhdmUgZGlmZmVyZW50bHkgLSBjcy5sZW5ndGggaXMgYWx3YXlzIDAsIHNvIHdlIG11c3QgZG8gYSBmb3IuLi5pbiBsb29wLlxuXHRcdFx0XHRcdFx0Zm9yIChpIGluIGNzKSB7XG5cdFx0XHRcdFx0XHRcdGlmIChpLmluZGV4T2YoXCJUcmFuc2Zvcm1cIikgPT09IC0xIHx8IF90cmFuc2Zvcm1Qcm9wID09PSBpKSB7IC8vU29tZSB3ZWJraXQgYnJvd3NlcnMgZHVwbGljYXRlIHRyYW5zZm9ybSB2YWx1ZXMsIG9uZSBub24tcHJlZml4ZWQgYW5kIG9uZSBwcmVmaXhlZCAoXCJ0cmFuc2Zvcm1cIiBhbmQgXCJXZWJraXRUcmFuc2Zvcm1cIiksIHNvIHdlIG11c3Qgd2VlZCBvdXQgdGhlIGV4dHJhIG9uZSBoZXJlLlxuXHRcdFx0XHRcdFx0XHRcdHNbaV0gPSBjc1tpXTtcblx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdH1cblx0XHRcdFx0fSBlbHNlIGlmICgoY3MgPSB0LmN1cnJlbnRTdHlsZSB8fCB0LnN0eWxlKSkge1xuXHRcdFx0XHRcdGZvciAoaSBpbiBjcykge1xuXHRcdFx0XHRcdFx0aWYgKHR5cGVvZihpKSA9PT0gXCJzdHJpbmdcIiAmJiBzW2ldID09PSB1bmRlZmluZWQpIHtcblx0XHRcdFx0XHRcdFx0c1tpLnJlcGxhY2UoX2NhbWVsRXhwLCBfY2FtZWxGdW5jKV0gPSBjc1tpXTtcblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblx0XHRcdFx0aWYgKCFfc3VwcG9ydHNPcGFjaXR5KSB7XG5cdFx0XHRcdFx0cy5vcGFjaXR5ID0gX2dldElFT3BhY2l0eSh0KTtcblx0XHRcdFx0fVxuXHRcdFx0XHR0ciA9IF9nZXRUcmFuc2Zvcm0odCwgY3MsIGZhbHNlKTtcblx0XHRcdFx0cy5yb3RhdGlvbiA9IHRyLnJvdGF0aW9uO1xuXHRcdFx0XHRzLnNrZXdYID0gdHIuc2tld1g7XG5cdFx0XHRcdHMuc2NhbGVYID0gdHIuc2NhbGVYO1xuXHRcdFx0XHRzLnNjYWxlWSA9IHRyLnNjYWxlWTtcblx0XHRcdFx0cy54ID0gdHIueDtcblx0XHRcdFx0cy55ID0gdHIueTtcblx0XHRcdFx0aWYgKF9zdXBwb3J0czNEKSB7XG5cdFx0XHRcdFx0cy56ID0gdHIuejtcblx0XHRcdFx0XHRzLnJvdGF0aW9uWCA9IHRyLnJvdGF0aW9uWDtcblx0XHRcdFx0XHRzLnJvdGF0aW9uWSA9IHRyLnJvdGF0aW9uWTtcblx0XHRcdFx0XHRzLnNjYWxlWiA9IHRyLnNjYWxlWjtcblx0XHRcdFx0fVxuXHRcdFx0XHRpZiAocy5maWx0ZXJzKSB7XG5cdFx0XHRcdFx0ZGVsZXRlIHMuZmlsdGVycztcblx0XHRcdFx0fVxuXHRcdFx0XHRyZXR1cm4gcztcblx0XHRcdH0sXG5cblx0XHRcdC8vIEBwcml2YXRlIGFuYWx5emVzIHR3byBzdHlsZSBvYmplY3RzIChhcyByZXR1cm5lZCBieSBfZ2V0QWxsU3R5bGVzKCkpIGFuZCBvbmx5IGxvb2tzIGZvciBkaWZmZXJlbmNlcyBiZXR3ZWVuIHRoZW0gdGhhdCBjb250YWluIHR3ZWVuYWJsZSB2YWx1ZXMgKGxpa2UgYSBudW1iZXIgb3IgY29sb3IpLiBJdCByZXR1cm5zIGFuIG9iamVjdCB3aXRoIGEgXCJkaWZzXCIgcHJvcGVydHkgd2hpY2ggcmVmZXJzIHRvIGFuIG9iamVjdCBjb250YWluaW5nIG9ubHkgdGhvc2UgaXNvbGF0ZWQgcHJvcGVydGllcyBhbmQgdmFsdWVzIGZvciB0d2VlbmluZywgYW5kIGEgXCJmaXJzdE1QVFwiIHByb3BlcnR5IHdoaWNoIHJlZmVycyB0byB0aGUgZmlyc3QgTWluaVByb3BUd2VlbiBpbnN0YW5jZSBpbiBhIGxpbmtlZCBsaXN0IHRoYXQgcmVjb3JkZWQgYWxsIHRoZSBzdGFydGluZyB2YWx1ZXMgb2YgdGhlIGRpZmZlcmVudCBwcm9wZXJ0aWVzIHNvIHRoYXQgd2UgY2FuIHJldmVydCB0byB0aGVtIGF0IHRoZSBlbmQgb3IgYmVnaW5uaW5nIG9mIHRoZSB0d2VlbiAtIHdlIGRvbid0IHdhbnQgdGhlIGNhc2NhZGluZyB0byBnZXQgbWVzc2VkIHVwLiBUaGUgZm9yY2VMb29rdXAgcGFyYW1ldGVyIGlzIGFuIG9wdGlvbmFsIGdlbmVyaWMgb2JqZWN0IHdpdGggcHJvcGVydGllcyB0aGF0IHNob3VsZCBiZSBmb3JjZWQgaW50byB0aGUgcmVzdWx0cyAtIHRoaXMgaXMgbmVjZXNzYXJ5IGZvciBjbGFzc05hbWUgdHdlZW5zIHRoYXQgYXJlIG92ZXJ3cml0aW5nIG90aGVycyBiZWNhdXNlIGltYWdpbmUgYSBzY2VuYXJpbyB3aGVyZSBhIHJvbGxvdmVyL3JvbGxvdXQgYWRkcy9yZW1vdmVzIGEgY2xhc3MgYW5kIHRoZSB1c2VyIHN3aXBlcyB0aGUgbW91c2Ugb3ZlciB0aGUgdGFyZ2V0IFNVUEVSIGZhc3QsIHRodXMgbm90aGluZyBhY3R1YWxseSBjaGFuZ2VkIHlldCBhbmQgdGhlIHN1YnNlcXVlbnQgY29tcGFyaXNvbiBvZiB0aGUgcHJvcGVydGllcyB3b3VsZCBpbmRpY2F0ZSB0aGV5IG1hdGNoIChlc3BlY2lhbGx5IHdoZW4gcHggcm91bmRpbmcgaXMgdGFrZW4gaW50byBjb25zaWRlcmF0aW9uKSwgdGh1cyBubyB0d2VlbmluZyBpcyBuZWNlc3NhcnkgZXZlbiB0aG91Z2ggaXQgU0hPVUxEIHR3ZWVuIGFuZCByZW1vdmUgdGhvc2UgcHJvcGVydGllcyBhZnRlciB0aGUgdHdlZW4gKG90aGVyd2lzZSB0aGUgaW5saW5lIHN0eWxlcyB3aWxsIGNvbnRhbWluYXRlIHRoaW5ncykuIFNlZSB0aGUgY2xhc3NOYW1lIFNwZWNpYWxQcm9wIGNvZGUgZm9yIGRldGFpbHMuXG5cdFx0XHRfY3NzRGlmID0gZnVuY3Rpb24odCwgczEsIHMyLCB2YXJzLCBmb3JjZUxvb2t1cCkge1xuXHRcdFx0XHR2YXIgZGlmcyA9IHt9LFxuXHRcdFx0XHRcdHN0eWxlID0gdC5zdHlsZSxcblx0XHRcdFx0XHR2YWwsIHAsIG1wdDtcblx0XHRcdFx0Zm9yIChwIGluIHMyKSB7XG5cdFx0XHRcdFx0aWYgKHAgIT09IFwiY3NzVGV4dFwiKSBpZiAocCAhPT0gXCJsZW5ndGhcIikgaWYgKGlzTmFOKHApKSBpZiAoczFbcF0gIT09ICh2YWwgPSBzMltwXSkgfHwgKGZvcmNlTG9va3VwICYmIGZvcmNlTG9va3VwW3BdKSkgaWYgKHAuaW5kZXhPZihcIk9yaWdpblwiKSA9PT0gLTEpIGlmICh0eXBlb2YodmFsKSA9PT0gXCJudW1iZXJcIiB8fCB0eXBlb2YodmFsKSA9PT0gXCJzdHJpbmdcIikge1xuXHRcdFx0XHRcdFx0ZGlmc1twXSA9ICh2YWwgPT09IFwiYXV0b1wiICYmIChwID09PSBcImxlZnRcIiB8fCBwID09PSBcInRvcFwiKSkgPyBfY2FsY3VsYXRlT2Zmc2V0KHQsIHApIDogKCh2YWwgPT09IFwiXCIgfHwgdmFsID09PSBcImF1dG9cIiB8fCB2YWwgPT09IFwibm9uZVwiKSAmJiB0eXBlb2YoczFbcF0pID09PSBcInN0cmluZ1wiICYmIHMxW3BdLnJlcGxhY2UoX05hTkV4cCwgXCJcIikgIT09IFwiXCIpID8gMCA6IHZhbDsgLy9pZiB0aGUgZW5kaW5nIHZhbHVlIGlzIGRlZmF1bHRpbmcgKFwiXCIgb3IgXCJhdXRvXCIpLCB3ZSBjaGVjayB0aGUgc3RhcnRpbmcgdmFsdWUgYW5kIGlmIGl0IGNhbiBiZSBwYXJzZWQgaW50byBhIG51bWJlciAoYSBzdHJpbmcgd2hpY2ggY291bGQgaGF2ZSBhIHN1ZmZpeCB0b28sIGxpa2UgNzAwcHgpLCB0aGVuIHdlIHN3YXAgaW4gMCBmb3IgXCJcIiBvciBcImF1dG9cIiBzbyB0aGF0IHRoaW5ncyBhY3R1YWxseSB0d2Vlbi5cblx0XHRcdFx0XHRcdGlmIChzdHlsZVtwXSAhPT0gdW5kZWZpbmVkKSB7IC8vZm9yIGNsYXNzTmFtZSB0d2VlbnMsIHdlIG11c3QgcmVtZW1iZXIgd2hpY2ggcHJvcGVydGllcyBhbHJlYWR5IGV4aXN0ZWQgaW5saW5lIC0gdGhlIG9uZXMgdGhhdCBkaWRuJ3Qgc2hvdWxkIGJlIHJlbW92ZWQgd2hlbiB0aGUgdHdlZW4gaXNuJ3QgaW4gcHJvZ3Jlc3MgYmVjYXVzZSB0aGV5IHdlcmUgb25seSBpbnRyb2R1Y2VkIHRvIGZhY2lsaXRhdGUgdGhlIHRyYW5zaXRpb24gYmV0d2VlbiBjbGFzc2VzLlxuXHRcdFx0XHRcdFx0XHRtcHQgPSBuZXcgTWluaVByb3BUd2VlbihzdHlsZSwgcCwgc3R5bGVbcF0sIG1wdCk7XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cdFx0XHRcdGlmICh2YXJzKSB7XG5cdFx0XHRcdFx0Zm9yIChwIGluIHZhcnMpIHsgLy9jb3B5IHByb3BlcnRpZXMgKGV4Y2VwdCBjbGFzc05hbWUpXG5cdFx0XHRcdFx0XHRpZiAocCAhPT0gXCJjbGFzc05hbWVcIikge1xuXHRcdFx0XHRcdFx0XHRkaWZzW3BdID0gdmFyc1twXTtcblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblx0XHRcdFx0cmV0dXJuIHtkaWZzOmRpZnMsIGZpcnN0TVBUOm1wdH07XG5cdFx0XHR9LFxuXHRcdFx0X2RpbWVuc2lvbnMgPSB7d2lkdGg6W1wiTGVmdFwiLFwiUmlnaHRcIl0sIGhlaWdodDpbXCJUb3BcIixcIkJvdHRvbVwiXX0sXG5cdFx0XHRfbWFyZ2lucyA9IFtcIm1hcmdpbkxlZnRcIixcIm1hcmdpblJpZ2h0XCIsXCJtYXJnaW5Ub3BcIixcIm1hcmdpbkJvdHRvbVwiXSxcblxuXHRcdFx0LyoqXG5cdFx0XHQgKiBAcHJpdmF0ZSBHZXRzIHRoZSB3aWR0aCBvciBoZWlnaHQgb2YgYW4gZWxlbWVudFxuXHRcdFx0ICogQHBhcmFtIHshT2JqZWN0fSB0IFRhcmdldCBlbGVtZW50XG5cdFx0XHQgKiBAcGFyYW0geyFzdHJpbmd9IHAgUHJvcGVydHkgbmFtZSAoXCJ3aWR0aFwiIG9yIFwiaGVpZ2h0XCIpXG5cdFx0XHQgKiBAcGFyYW0ge09iamVjdD19IGNzIENvbXB1dGVkIHN0eWxlIG9iamVjdCAoaWYgb25lIGV4aXN0cykuIEp1c3QgYSBzcGVlZCBvcHRpbWl6YXRpb24uXG5cdFx0XHQgKiBAcmV0dXJuIHtudW1iZXJ9IERpbWVuc2lvbiAoaW4gcGl4ZWxzKVxuXHRcdFx0ICovXG5cdFx0XHRfZ2V0RGltZW5zaW9uID0gZnVuY3Rpb24odCwgcCwgY3MpIHtcblx0XHRcdFx0dmFyIHYgPSBwYXJzZUZsb2F0KChwID09PSBcIndpZHRoXCIpID8gdC5vZmZzZXRXaWR0aCA6IHQub2Zmc2V0SGVpZ2h0KSxcblx0XHRcdFx0XHRhID0gX2RpbWVuc2lvbnNbcF0sXG5cdFx0XHRcdFx0aSA9IGEubGVuZ3RoO1xuXHRcdFx0XHRjcyA9IGNzIHx8IF9nZXRDb21wdXRlZFN0eWxlKHQsIG51bGwpO1xuXHRcdFx0XHR3aGlsZSAoLS1pID4gLTEpIHtcblx0XHRcdFx0XHR2IC09IHBhcnNlRmxvYXQoIF9nZXRTdHlsZSh0LCBcInBhZGRpbmdcIiArIGFbaV0sIGNzLCB0cnVlKSApIHx8IDA7XG5cdFx0XHRcdFx0diAtPSBwYXJzZUZsb2F0KCBfZ2V0U3R5bGUodCwgXCJib3JkZXJcIiArIGFbaV0gKyBcIldpZHRoXCIsIGNzLCB0cnVlKSApIHx8IDA7XG5cdFx0XHRcdH1cblx0XHRcdFx0cmV0dXJuIHY7XG5cdFx0XHR9LFxuXG5cdFx0XHQvLyBAcHJpdmF0ZSBQYXJzZXMgcG9zaXRpb24tcmVsYXRlZCBjb21wbGV4IHN0cmluZ3MgbGlrZSBcInRvcCBsZWZ0XCIgb3IgXCI1MHB4IDEwcHhcIiBvciBcIjcwJSAyMCVcIiwgZXRjLiB3aGljaCBhcmUgdXNlZCBmb3IgdGhpbmdzIGxpa2UgdHJhbnNmb3JtT3JpZ2luIG9yIGJhY2tncm91bmRQb3NpdGlvbi4gT3B0aW9uYWxseSBkZWNvcmF0ZXMgYSBzdXBwbGllZCBvYmplY3QgKHJlY09iaikgd2l0aCB0aGUgZm9sbG93aW5nIHByb3BlcnRpZXM6IFwib3hcIiAob2Zmc2V0WCksIFwib3lcIiAob2Zmc2V0WSksIFwib3hwXCIgKGlmIHRydWUsIFwib3hcIiBpcyBhIHBlcmNlbnRhZ2Ugbm90IGEgcGl4ZWwgdmFsdWUpLCBhbmQgXCJveHlcIiAoaWYgdHJ1ZSwgXCJveVwiIGlzIGEgcGVyY2VudGFnZSBub3QgYSBwaXhlbCB2YWx1ZSlcblx0XHRcdF9wYXJzZVBvc2l0aW9uID0gZnVuY3Rpb24odiwgcmVjT2JqKSB7XG5cdFx0XHRcdGlmICh2ID09PSBcImNvbnRhaW5cIiB8fCB2ID09PSBcImF1dG9cIiB8fCB2ID09PSBcImF1dG8gYXV0b1wiKSB7XG5cdFx0XHRcdFx0cmV0dXJuIHYgKyBcIiBcIjtcblx0XHRcdFx0fVxuXHRcdFx0XHRpZiAodiA9PSBudWxsIHx8IHYgPT09IFwiXCIpIHsgLy9ub3RlOiBGaXJlZm94IHVzZXMgXCJhdXRvIGF1dG9cIiBhcyBkZWZhdWx0IHdoZXJlYXMgQ2hyb21lIHVzZXMgXCJhdXRvXCIuXG5cdFx0XHRcdFx0diA9IFwiMCAwXCI7XG5cdFx0XHRcdH1cblx0XHRcdFx0dmFyIGEgPSB2LnNwbGl0KFwiIFwiKSxcblx0XHRcdFx0XHR4ID0gKHYuaW5kZXhPZihcImxlZnRcIikgIT09IC0xKSA/IFwiMCVcIiA6ICh2LmluZGV4T2YoXCJyaWdodFwiKSAhPT0gLTEpID8gXCIxMDAlXCIgOiBhWzBdLFxuXHRcdFx0XHRcdHkgPSAodi5pbmRleE9mKFwidG9wXCIpICE9PSAtMSkgPyBcIjAlXCIgOiAodi5pbmRleE9mKFwiYm90dG9tXCIpICE9PSAtMSkgPyBcIjEwMCVcIiA6IGFbMV07XG5cdFx0XHRcdGlmICh5ID09IG51bGwpIHtcblx0XHRcdFx0XHR5ID0gKHggPT09IFwiY2VudGVyXCIpID8gXCI1MCVcIiA6IFwiMFwiO1xuXHRcdFx0XHR9IGVsc2UgaWYgKHkgPT09IFwiY2VudGVyXCIpIHtcblx0XHRcdFx0XHR5ID0gXCI1MCVcIjtcblx0XHRcdFx0fVxuXHRcdFx0XHRpZiAoeCA9PT0gXCJjZW50ZXJcIiB8fCAoaXNOYU4ocGFyc2VGbG9hdCh4KSkgJiYgKHggKyBcIlwiKS5pbmRleE9mKFwiPVwiKSA9PT0gLTEpKSB7IC8vcmVtZW1iZXIsIHRoZSB1c2VyIGNvdWxkIGZsaXAtZmxvcCB0aGUgdmFsdWVzIGFuZCBzYXkgXCJib3R0b20gY2VudGVyXCIgb3IgXCJjZW50ZXIgYm90dG9tXCIsIGV0Yy4gXCJjZW50ZXJcIiBpcyBhbWJpZ3VvdXMgYmVjYXVzZSBpdCBjb3VsZCBiZSB1c2VkIHRvIGRlc2NyaWJlIGhvcml6b250YWwgb3IgdmVydGljYWwsIGhlbmNlIHRoZSBpc05hTigpLiBJZiB0aGVyZSdzIGFuIFwiPVwiIHNpZ24gaW4gdGhlIHZhbHVlLCBpdCdzIHJlbGF0aXZlLlxuXHRcdFx0XHRcdHggPSBcIjUwJVwiO1xuXHRcdFx0XHR9XG5cdFx0XHRcdHYgPSB4ICsgXCIgXCIgKyB5ICsgKChhLmxlbmd0aCA+IDIpID8gXCIgXCIgKyBhWzJdIDogXCJcIik7XG5cdFx0XHRcdGlmIChyZWNPYmopIHtcblx0XHRcdFx0XHRyZWNPYmoub3hwID0gKHguaW5kZXhPZihcIiVcIikgIT09IC0xKTtcblx0XHRcdFx0XHRyZWNPYmoub3lwID0gKHkuaW5kZXhPZihcIiVcIikgIT09IC0xKTtcblx0XHRcdFx0XHRyZWNPYmoub3hyID0gKHguY2hhckF0KDEpID09PSBcIj1cIik7XG5cdFx0XHRcdFx0cmVjT2JqLm95ciA9ICh5LmNoYXJBdCgxKSA9PT0gXCI9XCIpO1xuXHRcdFx0XHRcdHJlY09iai5veCA9IHBhcnNlRmxvYXQoeC5yZXBsYWNlKF9OYU5FeHAsIFwiXCIpKTtcblx0XHRcdFx0XHRyZWNPYmoub3kgPSBwYXJzZUZsb2F0KHkucmVwbGFjZShfTmFORXhwLCBcIlwiKSk7XG5cdFx0XHRcdFx0cmVjT2JqLnYgPSB2O1xuXHRcdFx0XHR9XG5cdFx0XHRcdHJldHVybiByZWNPYmogfHwgdjtcblx0XHRcdH0sXG5cblx0XHRcdC8qKlxuXHRcdFx0ICogQHByaXZhdGUgVGFrZXMgYW4gZW5kaW5nIHZhbHVlICh0eXBpY2FsbHkgYSBzdHJpbmcsIGJ1dCBjYW4gYmUgYSBudW1iZXIpIGFuZCBhIHN0YXJ0aW5nIHZhbHVlIGFuZCByZXR1cm5zIHRoZSBjaGFuZ2UgYmV0d2VlbiB0aGUgdHdvLCBsb29raW5nIGZvciByZWxhdGl2ZSB2YWx1ZSBpbmRpY2F0b3JzIGxpa2UgKz0gYW5kIC09IGFuZCBpdCBhbHNvIGlnbm9yZXMgc3VmZml4ZXMgKGJ1dCBtYWtlIHN1cmUgdGhlIGVuZGluZyB2YWx1ZSBzdGFydHMgd2l0aCBhIG51bWJlciBvciArPS8tPSBhbmQgdGhhdCB0aGUgc3RhcnRpbmcgdmFsdWUgaXMgYSBOVU1CRVIhKVxuXHRcdFx0ICogQHBhcmFtIHsobnVtYmVyfHN0cmluZyl9IGUgRW5kIHZhbHVlIHdoaWNoIGlzIHR5cGljYWxseSBhIHN0cmluZywgYnV0IGNvdWxkIGJlIGEgbnVtYmVyXG5cdFx0XHQgKiBAcGFyYW0geyhudW1iZXJ8c3RyaW5nKX0gYiBCZWdpbm5pbmcgdmFsdWUgd2hpY2ggaXMgdHlwaWNhbGx5IGEgc3RyaW5nIGJ1dCBjb3VsZCBiZSBhIG51bWJlclxuXHRcdFx0ICogQHJldHVybiB7bnVtYmVyfSBBbW91bnQgb2YgY2hhbmdlIGJldHdlZW4gdGhlIGJlZ2lubmluZyBhbmQgZW5kaW5nIHZhbHVlcyAocmVsYXRpdmUgdmFsdWVzIHRoYXQgaGF2ZSBhIFwiKz1cIiBvciBcIi09XCIgYXJlIHJlY29nbml6ZWQpXG5cdFx0XHQgKi9cblx0XHRcdF9wYXJzZUNoYW5nZSA9IGZ1bmN0aW9uKGUsIGIpIHtcblx0XHRcdFx0cmV0dXJuICh0eXBlb2YoZSkgPT09IFwic3RyaW5nXCIgJiYgZS5jaGFyQXQoMSkgPT09IFwiPVwiKSA/IHBhcnNlSW50KGUuY2hhckF0KDApICsgXCIxXCIsIDEwKSAqIHBhcnNlRmxvYXQoZS5zdWJzdHIoMikpIDogcGFyc2VGbG9hdChlKSAtIHBhcnNlRmxvYXQoYik7XG5cdFx0XHR9LFxuXG5cdFx0XHQvKipcblx0XHRcdCAqIEBwcml2YXRlIFRha2VzIGEgdmFsdWUgYW5kIGEgZGVmYXVsdCBudW1iZXIsIGNoZWNrcyBpZiB0aGUgdmFsdWUgaXMgcmVsYXRpdmUsIG51bGwsIG9yIG51bWVyaWMgYW5kIHNwaXRzIGJhY2sgYSBub3JtYWxpemVkIG51bWJlciBhY2NvcmRpbmdseS4gUHJpbWFyaWx5IHVzZWQgaW4gdGhlIF9wYXJzZVRyYW5zZm9ybSgpIGZ1bmN0aW9uLlxuXHRcdFx0ICogQHBhcmFtIHtPYmplY3R9IHYgVmFsdWUgdG8gYmUgcGFyc2VkXG5cdFx0XHQgKiBAcGFyYW0geyFudW1iZXJ9IGQgRGVmYXVsdCB2YWx1ZSAod2hpY2ggaXMgYWxzbyB1c2VkIGZvciByZWxhdGl2ZSBjYWxjdWxhdGlvbnMgaWYgXCIrPVwiIG9yIFwiLT1cIiBpcyBmb3VuZCBpbiB0aGUgZmlyc3QgcGFyYW1ldGVyKVxuXHRcdFx0ICogQHJldHVybiB7bnVtYmVyfSBQYXJzZWQgdmFsdWVcblx0XHRcdCAqL1xuXHRcdFx0X3BhcnNlVmFsID0gZnVuY3Rpb24odiwgZCkge1xuXHRcdFx0XHRyZXR1cm4gKHYgPT0gbnVsbCkgPyBkIDogKHR5cGVvZih2KSA9PT0gXCJzdHJpbmdcIiAmJiB2LmNoYXJBdCgxKSA9PT0gXCI9XCIpID8gcGFyc2VJbnQodi5jaGFyQXQoMCkgKyBcIjFcIiwgMTApICogcGFyc2VGbG9hdCh2LnN1YnN0cigyKSkgKyBkIDogcGFyc2VGbG9hdCh2KTtcblx0XHRcdH0sXG5cblx0XHRcdC8qKlxuXHRcdFx0ICogQHByaXZhdGUgVHJhbnNsYXRlcyBzdHJpbmdzIGxpa2UgXCI0MGRlZ1wiIG9yIFwiNDBcIiBvciA0MHJhZFwiIG9yIFwiKz00MGRlZ1wiIG9yIFwiMjcwX3Nob3J0XCIgb3IgXCItOTBfY3dcIiBvciBcIis9NDVfY2N3XCIgdG8gYSBudW1lcmljIHJhZGlhbiBhbmdsZS4gT2YgY291cnNlIGEgc3RhcnRpbmcvZGVmYXVsdCB2YWx1ZSBtdXN0IGJlIGZlZCBpbiB0b28gc28gdGhhdCByZWxhdGl2ZSB2YWx1ZXMgY2FuIGJlIGNhbGN1bGF0ZWQgcHJvcGVybHkuXG5cdFx0XHQgKiBAcGFyYW0ge09iamVjdH0gdiBWYWx1ZSB0byBiZSBwYXJzZWRcblx0XHRcdCAqIEBwYXJhbSB7IW51bWJlcn0gZCBEZWZhdWx0IHZhbHVlICh3aGljaCBpcyBhbHNvIHVzZWQgZm9yIHJlbGF0aXZlIGNhbGN1bGF0aW9ucyBpZiBcIis9XCIgb3IgXCItPVwiIGlzIGZvdW5kIGluIHRoZSBmaXJzdCBwYXJhbWV0ZXIpXG5cdFx0XHQgKiBAcGFyYW0ge3N0cmluZz19IHAgcHJvcGVydHkgbmFtZSBmb3IgZGlyZWN0aW9uYWxFbmQgKG9wdGlvbmFsIC0gb25seSB1c2VkIHdoZW4gdGhlIHBhcnNlZCB2YWx1ZSBpcyBkaXJlY3Rpb25hbCAoXCJfc2hvcnRcIiwgXCJfY3dcIiwgb3IgXCJfY2N3XCIgc3VmZml4KS4gV2UgbmVlZCBhIHdheSB0byBzdG9yZSB0aGUgdW5jb21wZW5zYXRlZCB2YWx1ZSBzbyB0aGF0IGF0IHRoZSBlbmQgb2YgdGhlIHR3ZWVuLCB3ZSBzZXQgaXQgdG8gZXhhY3RseSB3aGF0IHdhcyByZXF1ZXN0ZWQgd2l0aCBubyBkaXJlY3Rpb25hbCBjb21wZW5zYXRpb24pLiBQcm9wZXJ0eSBuYW1lIHdvdWxkIGJlIFwicm90YXRpb25cIiwgXCJyb3RhdGlvblhcIiwgb3IgXCJyb3RhdGlvbllcIlxuXHRcdFx0ICogQHBhcmFtIHtPYmplY3Q9fSBkaXJlY3Rpb25hbEVuZCBBbiBvYmplY3QgdGhhdCB3aWxsIHN0b3JlIHRoZSByYXcgZW5kIHZhbHVlcyBmb3IgZGlyZWN0aW9uYWwgYW5nbGVzIChcIl9zaG9ydFwiLCBcIl9jd1wiLCBvciBcIl9jY3dcIiBzdWZmaXgpLiBXZSBuZWVkIGEgd2F5IHRvIHN0b3JlIHRoZSB1bmNvbXBlbnNhdGVkIHZhbHVlIHNvIHRoYXQgYXQgdGhlIGVuZCBvZiB0aGUgdHdlZW4sIHdlIHNldCBpdCB0byBleGFjdGx5IHdoYXQgd2FzIHJlcXVlc3RlZCB3aXRoIG5vIGRpcmVjdGlvbmFsIGNvbXBlbnNhdGlvbi5cblx0XHRcdCAqIEByZXR1cm4ge251bWJlcn0gcGFyc2VkIGFuZ2xlIGluIHJhZGlhbnNcblx0XHRcdCAqL1xuXHRcdFx0X3BhcnNlQW5nbGUgPSBmdW5jdGlvbih2LCBkLCBwLCBkaXJlY3Rpb25hbEVuZCkge1xuXHRcdFx0XHR2YXIgbWluID0gMC4wMDAwMDEsXG5cdFx0XHRcdFx0Y2FwLCBzcGxpdCwgZGlmLCByZXN1bHQsIGlzUmVsYXRpdmU7XG5cdFx0XHRcdGlmICh2ID09IG51bGwpIHtcblx0XHRcdFx0XHRyZXN1bHQgPSBkO1xuXHRcdFx0XHR9IGVsc2UgaWYgKHR5cGVvZih2KSA9PT0gXCJudW1iZXJcIikge1xuXHRcdFx0XHRcdHJlc3VsdCA9IHY7XG5cdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0Y2FwID0gMzYwO1xuXHRcdFx0XHRcdHNwbGl0ID0gdi5zcGxpdChcIl9cIik7XG5cdFx0XHRcdFx0aXNSZWxhdGl2ZSA9ICh2LmNoYXJBdCgxKSA9PT0gXCI9XCIpO1xuXHRcdFx0XHRcdGRpZiA9IChpc1JlbGF0aXZlID8gcGFyc2VJbnQodi5jaGFyQXQoMCkgKyBcIjFcIiwgMTApICogcGFyc2VGbG9hdChzcGxpdFswXS5zdWJzdHIoMikpIDogcGFyc2VGbG9hdChzcGxpdFswXSkpICogKCh2LmluZGV4T2YoXCJyYWRcIikgPT09IC0xKSA/IDEgOiBfUkFEMkRFRykgLSAoaXNSZWxhdGl2ZSA/IDAgOiBkKTtcblx0XHRcdFx0XHRpZiAoc3BsaXQubGVuZ3RoKSB7XG5cdFx0XHRcdFx0XHRpZiAoZGlyZWN0aW9uYWxFbmQpIHtcblx0XHRcdFx0XHRcdFx0ZGlyZWN0aW9uYWxFbmRbcF0gPSBkICsgZGlmO1xuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0aWYgKHYuaW5kZXhPZihcInNob3J0XCIpICE9PSAtMSkge1xuXHRcdFx0XHRcdFx0XHRkaWYgPSBkaWYgJSBjYXA7XG5cdFx0XHRcdFx0XHRcdGlmIChkaWYgIT09IGRpZiAlIChjYXAgLyAyKSkge1xuXHRcdFx0XHRcdFx0XHRcdGRpZiA9IChkaWYgPCAwKSA/IGRpZiArIGNhcCA6IGRpZiAtIGNhcDtcblx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0aWYgKHYuaW5kZXhPZihcIl9jd1wiKSAhPT0gLTEgJiYgZGlmIDwgMCkge1xuXHRcdFx0XHRcdFx0XHRkaWYgPSAoKGRpZiArIGNhcCAqIDk5OTk5OTk5OTkpICUgY2FwKSAtICgoZGlmIC8gY2FwKSB8IDApICogY2FwO1xuXHRcdFx0XHRcdFx0fSBlbHNlIGlmICh2LmluZGV4T2YoXCJjY3dcIikgIT09IC0xICYmIGRpZiA+IDApIHtcblx0XHRcdFx0XHRcdFx0ZGlmID0gKChkaWYgLSBjYXAgKiA5OTk5OTk5OTk5KSAlIGNhcCkgLSAoKGRpZiAvIGNhcCkgfCAwKSAqIGNhcDtcblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0cmVzdWx0ID0gZCArIGRpZjtcblx0XHRcdFx0fVxuXHRcdFx0XHRpZiAocmVzdWx0IDwgbWluICYmIHJlc3VsdCA+IC1taW4pIHtcblx0XHRcdFx0XHRyZXN1bHQgPSAwO1xuXHRcdFx0XHR9XG5cdFx0XHRcdHJldHVybiByZXN1bHQ7XG5cdFx0XHR9LFxuXG5cdFx0XHRfY29sb3JMb29rdXAgPSB7YXF1YTpbMCwyNTUsMjU1XSxcblx0XHRcdFx0bGltZTpbMCwyNTUsMF0sXG5cdFx0XHRcdHNpbHZlcjpbMTkyLDE5MiwxOTJdLFxuXHRcdFx0XHRibGFjazpbMCwwLDBdLFxuXHRcdFx0XHRtYXJvb246WzEyOCwwLDBdLFxuXHRcdFx0XHR0ZWFsOlswLDEyOCwxMjhdLFxuXHRcdFx0XHRibHVlOlswLDAsMjU1XSxcblx0XHRcdFx0bmF2eTpbMCwwLDEyOF0sXG5cdFx0XHRcdHdoaXRlOlsyNTUsMjU1LDI1NV0sXG5cdFx0XHRcdGZ1Y2hzaWE6WzI1NSwwLDI1NV0sXG5cdFx0XHRcdG9saXZlOlsxMjgsMTI4LDBdLFxuXHRcdFx0XHR5ZWxsb3c6WzI1NSwyNTUsMF0sXG5cdFx0XHRcdG9yYW5nZTpbMjU1LDE2NSwwXSxcblx0XHRcdFx0Z3JheTpbMTI4LDEyOCwxMjhdLFxuXHRcdFx0XHRwdXJwbGU6WzEyOCwwLDEyOF0sXG5cdFx0XHRcdGdyZWVuOlswLDEyOCwwXSxcblx0XHRcdFx0cmVkOlsyNTUsMCwwXSxcblx0XHRcdFx0cGluazpbMjU1LDE5MiwyMDNdLFxuXHRcdFx0XHRjeWFuOlswLDI1NSwyNTVdLFxuXHRcdFx0XHR0cmFuc3BhcmVudDpbMjU1LDI1NSwyNTUsMF19LFxuXG5cdFx0XHRfaHVlID0gZnVuY3Rpb24oaCwgbTEsIG0yKSB7XG5cdFx0XHRcdGggPSAoaCA8IDApID8gaCArIDEgOiAoaCA+IDEpID8gaCAtIDEgOiBoO1xuXHRcdFx0XHRyZXR1cm4gKCgoKGggKiA2IDwgMSkgPyBtMSArIChtMiAtIG0xKSAqIGggKiA2IDogKGggPCAwLjUpID8gbTIgOiAoaCAqIDMgPCAyKSA/IG0xICsgKG0yIC0gbTEpICogKDIgLyAzIC0gaCkgKiA2IDogbTEpICogMjU1KSArIDAuNSkgfCAwO1xuXHRcdFx0fSxcblxuXHRcdFx0LyoqXG5cdFx0XHQgKiBAcHJpdmF0ZSBQYXJzZXMgYSBjb2xvciAobGlrZSAjOUYwLCAjRkY5OTAwLCByZ2IoMjU1LDUxLDE1Mykgb3IgaHNsKDEwOCwgNTAlLCAxMCUpKSBpbnRvIGFuIGFycmF5IHdpdGggMyBlbGVtZW50cyBmb3IgcmVkLCBncmVlbiwgYW5kIGJsdWUgb3IgaWYgdG9IU0wgcGFyYW1ldGVyIGlzIHRydWUsIGl0IHdpbGwgcG9wdWxhdGUgdGhlIGFycmF5IHdpdGggaHVlLCBzYXR1cmF0aW9uLCBhbmQgbGlnaHRuZXNzIHZhbHVlcy4gSWYgYSByZWxhdGl2ZSB2YWx1ZSBpcyBmb3VuZCBpbiBhbiBoc2woKSBvciBoc2xhKCkgc3RyaW5nLCBpdCB3aWxsIHByZXNlcnZlIHRob3NlIHJlbGF0aXZlIHByZWZpeGVzIGFuZCBhbGwgdGhlIHZhbHVlcyBpbiB0aGUgYXJyYXkgd2lsbCBiZSBzdHJpbmdzIGluc3RlYWQgb2YgbnVtYmVycyAoaW4gYWxsIG90aGVyIGNhc2VzIGl0IHdpbGwgYmUgcG9wdWxhdGVkIHdpdGggbnVtYmVycykuXG5cdFx0XHQgKiBAcGFyYW0geyhzdHJpbmd8bnVtYmVyKX0gdiBUaGUgdmFsdWUgdGhlIHNob3VsZCBiZSBwYXJzZWQgd2hpY2ggY291bGQgYmUgYSBzdHJpbmcgbGlrZSAjOUYwIG9yIHJnYigyNTUsMTAyLDUxKSBvciByZ2JhKDI1NSwwLDAsMC41KSBvciBpdCBjb3VsZCBiZSBhIG51bWJlciBsaWtlIDB4RkYwMENDIG9yIGV2ZW4gYSBuYW1lZCBjb2xvciBsaWtlIHJlZCwgYmx1ZSwgcHVycGxlLCBldGMuXG5cdFx0XHQgKiBAcGFyYW0geyhib29sZWFuKX0gdG9IU0wgSWYgdHJ1ZSwgYW4gaHNsKCkgb3IgaHNsYSgpIHZhbHVlIHdpbGwgYmUgcmV0dXJuZWQgaW5zdGVhZCBvZiByZ2IoKSBvciByZ2JhKClcblx0XHRcdCAqIEByZXR1cm4ge0FycmF5LjxudW1iZXI+fSBBbiBhcnJheSBjb250YWluaW5nIHJlZCwgZ3JlZW4sIGFuZCBibHVlIChhbmQgb3B0aW9uYWxseSBhbHBoYSkgaW4gdGhhdCBvcmRlciwgb3IgaWYgdGhlIHRvSFNMIHBhcmFtZXRlciB3YXMgdHJ1ZSwgdGhlIGFycmF5IHdpbGwgY29udGFpbiBodWUsIHNhdHVyYXRpb24gYW5kIGxpZ2h0bmVzcyAoYW5kIG9wdGlvbmFsbHkgYWxwaGEpIGluIHRoYXQgb3JkZXIuIEFsd2F5cyBudW1iZXJzIHVubGVzcyB0aGVyZSdzIGEgcmVsYXRpdmUgcHJlZml4IGZvdW5kIGluIGFuIGhzbCgpIG9yIGhzbGEoKSBzdHJpbmcgYW5kIHRvSFNMIGlzIHRydWUuXG5cdFx0XHQgKi9cblx0XHRcdF9wYXJzZUNvbG9yID0gQ1NTUGx1Z2luLnBhcnNlQ29sb3IgPSBmdW5jdGlvbih2LCB0b0hTTCkge1xuXHRcdFx0XHR2YXIgYSwgciwgZywgYiwgaCwgcywgbCwgbWF4LCBtaW4sIGQsIHdhc0hTTDtcblx0XHRcdFx0aWYgKCF2KSB7XG5cdFx0XHRcdFx0YSA9IF9jb2xvckxvb2t1cC5ibGFjaztcblx0XHRcdFx0fSBlbHNlIGlmICh0eXBlb2YodikgPT09IFwibnVtYmVyXCIpIHtcblx0XHRcdFx0XHRhID0gW3YgPj4gMTYsICh2ID4+IDgpICYgMjU1LCB2ICYgMjU1XTtcblx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRpZiAodi5jaGFyQXQodi5sZW5ndGggLSAxKSA9PT0gXCIsXCIpIHsgLy9zb21ldGltZXMgYSB0cmFpbGluZyBjb21tYSBpcyBpbmNsdWRlZCBhbmQgd2Ugc2hvdWxkIGNob3AgaXQgb2ZmICh0eXBpY2FsbHkgZnJvbSBhIGNvbW1hLWRlbGltaXRlZCBsaXN0IG9mIHZhbHVlcyBsaWtlIGEgdGV4dFNoYWRvdzpcIjJweCAycHggMnB4IGJsdWUsIDVweCA1cHggNXB4IHJnYigyNTUsMCwwKVwiIC0gaW4gdGhpcyBleGFtcGxlIFwiYmx1ZSxcIiBoYXMgYSB0cmFpbGluZyBjb21tYS4gV2UgY291bGQgc3RyaXAgaXQgb3V0IGluc2lkZSBwYXJzZUNvbXBsZXgoKSBidXQgd2UnZCBuZWVkIHRvIGRvIGl0IHRvIHRoZSBiZWdpbm5pbmcgYW5kIGVuZGluZyB2YWx1ZXMgcGx1cyBpdCB3b3VsZG4ndCBwcm92aWRlIHByb3RlY3Rpb24gZnJvbSBvdGhlciBwb3RlbnRpYWwgc2NlbmFyaW9zIGxpa2UgaWYgdGhlIHVzZXIgcGFzc2VzIGluIGEgc2ltaWxhciB2YWx1ZS5cblx0XHRcdFx0XHRcdHYgPSB2LnN1YnN0cigwLCB2Lmxlbmd0aCAtIDEpO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHRpZiAoX2NvbG9yTG9va3VwW3ZdKSB7XG5cdFx0XHRcdFx0XHRhID0gX2NvbG9yTG9va3VwW3ZdO1xuXHRcdFx0XHRcdH0gZWxzZSBpZiAodi5jaGFyQXQoMCkgPT09IFwiI1wiKSB7XG5cdFx0XHRcdFx0XHRpZiAodi5sZW5ndGggPT09IDQpIHsgLy9mb3Igc2hvcnRoYW5kIGxpa2UgIzlGMFxuXHRcdFx0XHRcdFx0XHRyID0gdi5jaGFyQXQoMSk7XG5cdFx0XHRcdFx0XHRcdGcgPSB2LmNoYXJBdCgyKTtcblx0XHRcdFx0XHRcdFx0YiA9IHYuY2hhckF0KDMpO1xuXHRcdFx0XHRcdFx0XHR2ID0gXCIjXCIgKyByICsgciArIGcgKyBnICsgYiArIGI7XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHR2ID0gcGFyc2VJbnQodi5zdWJzdHIoMSksIDE2KTtcblx0XHRcdFx0XHRcdGEgPSBbdiA+PiAxNiwgKHYgPj4gOCkgJiAyNTUsIHYgJiAyNTVdO1xuXHRcdFx0XHRcdH0gZWxzZSBpZiAodi5zdWJzdHIoMCwgMykgPT09IFwiaHNsXCIpIHtcblx0XHRcdFx0XHRcdGEgPSB3YXNIU0wgPSB2Lm1hdGNoKF9udW1FeHApO1xuXHRcdFx0XHRcdFx0aWYgKCF0b0hTTCkge1xuXHRcdFx0XHRcdFx0XHRoID0gKE51bWJlcihhWzBdKSAlIDM2MCkgLyAzNjA7XG5cdFx0XHRcdFx0XHRcdHMgPSBOdW1iZXIoYVsxXSkgLyAxMDA7XG5cdFx0XHRcdFx0XHRcdGwgPSBOdW1iZXIoYVsyXSkgLyAxMDA7XG5cdFx0XHRcdFx0XHRcdGcgPSAobCA8PSAwLjUpID8gbCAqIChzICsgMSkgOiBsICsgcyAtIGwgKiBzO1xuXHRcdFx0XHRcdFx0XHRyID0gbCAqIDIgLSBnO1xuXHRcdFx0XHRcdFx0XHRpZiAoYS5sZW5ndGggPiAzKSB7XG5cdFx0XHRcdFx0XHRcdFx0YVszXSA9IE51bWJlcih2WzNdKTtcblx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0XHRhWzBdID0gX2h1ZShoICsgMSAvIDMsIHIsIGcpO1xuXHRcdFx0XHRcdFx0XHRhWzFdID0gX2h1ZShoLCByLCBnKTtcblx0XHRcdFx0XHRcdFx0YVsyXSA9IF9odWUoaCAtIDEgLyAzLCByLCBnKTtcblx0XHRcdFx0XHRcdH0gZWxzZSBpZiAodi5pbmRleE9mKFwiPVwiKSAhPT0gLTEpIHsgLy9pZiByZWxhdGl2ZSB2YWx1ZXMgYXJlIGZvdW5kLCBqdXN0IHJldHVybiB0aGUgcmF3IHN0cmluZ3Mgd2l0aCB0aGUgcmVsYXRpdmUgcHJlZml4ZXMgaW4gcGxhY2UuXG5cdFx0XHRcdFx0XHRcdHJldHVybiB2Lm1hdGNoKF9yZWxOdW1FeHApO1xuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0XHRhID0gdi5tYXRjaChfbnVtRXhwKSB8fCBfY29sb3JMb29rdXAudHJhbnNwYXJlbnQ7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdGFbMF0gPSBOdW1iZXIoYVswXSk7XG5cdFx0XHRcdFx0YVsxXSA9IE51bWJlcihhWzFdKTtcblx0XHRcdFx0XHRhWzJdID0gTnVtYmVyKGFbMl0pO1xuXHRcdFx0XHRcdGlmIChhLmxlbmd0aCA+IDMpIHtcblx0XHRcdFx0XHRcdGFbM10gPSBOdW1iZXIoYVszXSk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cdFx0XHRcdGlmICh0b0hTTCAmJiAhd2FzSFNMKSB7XG5cdFx0XHRcdFx0ciA9IGFbMF0gLyAyNTU7XG5cdFx0XHRcdFx0ZyA9IGFbMV0gLyAyNTU7XG5cdFx0XHRcdFx0YiA9IGFbMl0gLyAyNTU7XG5cdFx0XHRcdFx0bWF4ID0gTWF0aC5tYXgociwgZywgYik7XG5cdFx0XHRcdFx0bWluID0gTWF0aC5taW4ociwgZywgYik7XG5cdFx0XHRcdFx0bCA9IChtYXggKyBtaW4pIC8gMjtcblx0XHRcdFx0XHRpZiAobWF4ID09PSBtaW4pIHtcblx0XHRcdFx0XHRcdGggPSBzID0gMDtcblx0XHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdFx0ZCA9IG1heCAtIG1pbjtcblx0XHRcdFx0XHRcdHMgPSBsID4gMC41ID8gZCAvICgyIC0gbWF4IC0gbWluKSA6IGQgLyAobWF4ICsgbWluKTtcblx0XHRcdFx0XHRcdGggPSAobWF4ID09PSByKSA/IChnIC0gYikgLyBkICsgKGcgPCBiID8gNiA6IDApIDogKG1heCA9PT0gZykgPyAoYiAtIHIpIC8gZCArIDIgOiAociAtIGcpIC8gZCArIDQ7XG5cdFx0XHRcdFx0XHRoICo9IDYwO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHRhWzBdID0gKGggKyAwLjUpIHwgMDtcblx0XHRcdFx0XHRhWzFdID0gKHMgKiAxMDAgKyAwLjUpIHwgMDtcblx0XHRcdFx0XHRhWzJdID0gKGwgKiAxMDAgKyAwLjUpIHwgMDtcblx0XHRcdFx0fVxuXHRcdFx0XHRyZXR1cm4gYTtcblx0XHRcdH0sXG5cdFx0XHRfZm9ybWF0Q29sb3JzID0gZnVuY3Rpb24ocywgdG9IU0wpIHtcblx0XHRcdFx0dmFyIGNvbG9ycyA9IHMubWF0Y2goX2NvbG9yRXhwKSB8fCBbXSxcblx0XHRcdFx0XHRjaGFySW5kZXggPSAwLFxuXHRcdFx0XHRcdHBhcnNlZCA9IGNvbG9ycy5sZW5ndGggPyBcIlwiIDogcyxcblx0XHRcdFx0XHRpLCBjb2xvciwgdGVtcDtcblx0XHRcdFx0Zm9yIChpID0gMDsgaSA8IGNvbG9ycy5sZW5ndGg7IGkrKykge1xuXHRcdFx0XHRcdGNvbG9yID0gY29sb3JzW2ldO1xuXHRcdFx0XHRcdHRlbXAgPSBzLnN1YnN0cihjaGFySW5kZXgsIHMuaW5kZXhPZihjb2xvciwgY2hhckluZGV4KS1jaGFySW5kZXgpO1xuXHRcdFx0XHRcdGNoYXJJbmRleCArPSB0ZW1wLmxlbmd0aCArIGNvbG9yLmxlbmd0aDtcblx0XHRcdFx0XHRjb2xvciA9IF9wYXJzZUNvbG9yKGNvbG9yLCB0b0hTTCk7XG5cdFx0XHRcdFx0aWYgKGNvbG9yLmxlbmd0aCA9PT0gMykge1xuXHRcdFx0XHRcdFx0Y29sb3IucHVzaCgxKTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0cGFyc2VkICs9IHRlbXAgKyAodG9IU0wgPyBcImhzbGEoXCIgKyBjb2xvclswXSArIFwiLFwiICsgY29sb3JbMV0gKyBcIiUsXCIgKyBjb2xvclsyXSArIFwiJSxcIiArIGNvbG9yWzNdIDogXCJyZ2JhKFwiICsgY29sb3Iuam9pbihcIixcIikpICsgXCIpXCI7XG5cdFx0XHRcdH1cblx0XHRcdFx0cmV0dXJuIHBhcnNlZDtcblx0XHRcdH0sXG5cdFx0XHRfY29sb3JFeHAgPSBcIig/OlxcXFxiKD86KD86cmdifHJnYmF8aHNsfGhzbGEpXFxcXCguKz9cXFxcKSl8XFxcXEIjKD86WzAtOWEtZl17M30pezEsMn1cXFxcYlwiOyAvL3dlJ2xsIGR5bmFtaWNhbGx5IGJ1aWxkIHRoaXMgUmVndWxhciBFeHByZXNzaW9uIHRvIGNvbnNlcnZlIGZpbGUgc2l6ZS4gQWZ0ZXIgYnVpbGRpbmcgaXQsIGl0IHdpbGwgYmUgYWJsZSB0byBmaW5kIHJnYigpLCByZ2JhKCksICMgKGhleGFkZWNpbWFsKSwgYW5kIG5hbWVkIGNvbG9yIHZhbHVlcyBsaWtlIHJlZCwgYmx1ZSwgcHVycGxlLCBldGMuXG5cblx0XHRmb3IgKHAgaW4gX2NvbG9yTG9va3VwKSB7XG5cdFx0XHRfY29sb3JFeHAgKz0gXCJ8XCIgKyBwICsgXCJcXFxcYlwiO1xuXHRcdH1cblx0XHRfY29sb3JFeHAgPSBuZXcgUmVnRXhwKF9jb2xvckV4cCtcIilcIiwgXCJnaVwiKTtcblxuXHRcdENTU1BsdWdpbi5jb2xvclN0cmluZ0ZpbHRlciA9IGZ1bmN0aW9uKGEpIHtcblx0XHRcdHZhciBjb21iaW5lZCA9IGFbMF0gKyBhWzFdLFxuXHRcdFx0XHR0b0hTTDtcblx0XHRcdF9jb2xvckV4cC5sYXN0SW5kZXggPSAwO1xuXHRcdFx0aWYgKF9jb2xvckV4cC50ZXN0KGNvbWJpbmVkKSkge1xuXHRcdFx0XHR0b0hTTCA9IChjb21iaW5lZC5pbmRleE9mKFwiaHNsKFwiKSAhPT0gLTEgfHwgY29tYmluZWQuaW5kZXhPZihcImhzbGEoXCIpICE9PSAtMSk7XG5cdFx0XHRcdGFbMF0gPSBfZm9ybWF0Q29sb3JzKGFbMF0sIHRvSFNMKTtcblx0XHRcdFx0YVsxXSA9IF9mb3JtYXRDb2xvcnMoYVsxXSwgdG9IU0wpO1xuXHRcdFx0fVxuXHRcdH07XG5cblx0XHRpZiAoIVR3ZWVuTGl0ZS5kZWZhdWx0U3RyaW5nRmlsdGVyKSB7XG5cdFx0XHRUd2VlbkxpdGUuZGVmYXVsdFN0cmluZ0ZpbHRlciA9IENTU1BsdWdpbi5jb2xvclN0cmluZ0ZpbHRlcjtcblx0XHR9XG5cblx0XHQvKipcblx0XHQgKiBAcHJpdmF0ZSBSZXR1cm5zIGEgZm9ybWF0dGVyIGZ1bmN0aW9uIHRoYXQgaGFuZGxlcyB0YWtpbmcgYSBzdHJpbmcgKG9yIG51bWJlciBpbiBzb21lIGNhc2VzKSBhbmQgcmV0dXJuaW5nIGEgY29uc2lzdGVudGx5IGZvcm1hdHRlZCBvbmUgaW4gdGVybXMgb2YgZGVsaW1pdGVycywgcXVhbnRpdHkgb2YgdmFsdWVzLCBldGMuIEZvciBleGFtcGxlLCB3ZSBtYXkgZ2V0IGJveFNoYWRvdyB2YWx1ZXMgZGVmaW5lZCBhcyBcIjBweCByZWRcIiBvciBcIjBweCAwcHggMTBweCByZ2IoMjU1LDAsMClcIiBvciBcIjBweCAwcHggMjBweCAyMHB4ICNGMDBcIiBhbmQgd2UgbmVlZCB0byBlbnN1cmUgdGhhdCB3aGF0IHdlIGdldCBiYWNrIGlzIGRlc2NyaWJlZCB3aXRoIDQgbnVtYmVycyBhbmQgYSBjb2xvci4gVGhpcyBhbGxvd3MgdXMgdG8gZmVlZCBpdCBpbnRvIHRoZSBfcGFyc2VDb21wbGV4KCkgbWV0aG9kIGFuZCBzcGxpdCB0aGUgdmFsdWVzIHVwIGFwcHJvcHJpYXRlbHkuIFRoZSBuZWF0IHRoaW5nIGFib3V0IHRoaXMgX2dldEZvcm1hdHRlcigpIGZ1bmN0aW9uIGlzIHRoYXQgdGhlIGRmbHQgZGVmaW5lcyBhIHBhdHRlcm4gYXMgd2VsbCBhcyBhIGRlZmF1bHQsIHNvIGZvciBleGFtcGxlLCBfZ2V0Rm9ybWF0dGVyKFwiMHB4IDBweCAwcHggMHB4ICM3NzdcIiwgdHJ1ZSkgbm90IG9ubHkgc2V0cyB0aGUgZGVmYXVsdCBhcyAwcHggZm9yIGFsbCBkaXN0YW5jZXMgYW5kICM3NzcgZm9yIHRoZSBjb2xvciwgYnV0IGFsc28gc2V0cyB0aGUgcGF0dGVybiBzdWNoIHRoYXQgNCBudW1iZXJzIGFuZCBhIGNvbG9yIHdpbGwgYWx3YXlzIGdldCByZXR1cm5lZC5cblx0XHQgKiBAcGFyYW0geyFzdHJpbmd9IGRmbHQgVGhlIGRlZmF1bHQgdmFsdWUgYW5kIHBhdHRlcm4gdG8gZm9sbG93LiBTbyBcIjBweCAwcHggMHB4IDBweCAjNzc3XCIgd2lsbCBlbnN1cmUgdGhhdCA0IG51bWJlcnMgYW5kIGEgY29sb3Igd2lsbCBhbHdheXMgZ2V0IHJldHVybmVkLlxuXHRcdCAqIEBwYXJhbSB7Ym9vbGVhbj19IGNsciBJZiB0cnVlLCB0aGUgdmFsdWVzIHNob3VsZCBiZSBzZWFyY2hlZCBmb3IgY29sb3ItcmVsYXRlZCBkYXRhLiBGb3IgZXhhbXBsZSwgYm94U2hhZG93IHZhbHVlcyB0eXBpY2FsbHkgY29udGFpbiBhIGNvbG9yIHdoZXJlYXMgYm9yZGVyUmFkaXVzIGRvbid0LlxuXHRcdCAqIEBwYXJhbSB7Ym9vbGVhbj19IGNvbGxhcHNpYmxlIElmIHRydWUsIHRoZSB2YWx1ZSBpcyBhIHRvcC9sZWZ0L3JpZ2h0L2JvdHRvbSBzdHlsZSBvbmUgdGhhdCBhY3RzIGxpa2UgbWFyZ2luIG9yIHBhZGRpbmcsIHdoZXJlIGlmIG9ubHkgb25lIHZhbHVlIGlzIHJlY2VpdmVkLCBpdCdzIHVzZWQgZm9yIGFsbCA0OyBpZiAyIGFyZSByZWNlaXZlZCwgdGhlIGZpcnN0IGlzIGR1cGxpY2F0ZWQgZm9yIDNyZCAoYm90dG9tKSBhbmQgdGhlIDJuZCBpcyBkdXBsaWNhdGVkIGZvciB0aGUgNHRoIHNwb3QgKGxlZnQpLCBldGMuXG5cdFx0ICogQHJldHVybiB7RnVuY3Rpb259IGZvcm1hdHRlciBmdW5jdGlvblxuXHRcdCAqL1xuXHRcdHZhciBfZ2V0Rm9ybWF0dGVyID0gZnVuY3Rpb24oZGZsdCwgY2xyLCBjb2xsYXBzaWJsZSwgbXVsdGkpIHtcblx0XHRcdFx0aWYgKGRmbHQgPT0gbnVsbCkge1xuXHRcdFx0XHRcdHJldHVybiBmdW5jdGlvbih2KSB7cmV0dXJuIHY7fTtcblx0XHRcdFx0fVxuXHRcdFx0XHR2YXIgZENvbG9yID0gY2xyID8gKGRmbHQubWF0Y2goX2NvbG9yRXhwKSB8fCBbXCJcIl0pWzBdIDogXCJcIixcblx0XHRcdFx0XHRkVmFscyA9IGRmbHQuc3BsaXQoZENvbG9yKS5qb2luKFwiXCIpLm1hdGNoKF92YWx1ZXNFeHApIHx8IFtdLFxuXHRcdFx0XHRcdHBmeCA9IGRmbHQuc3Vic3RyKDAsIGRmbHQuaW5kZXhPZihkVmFsc1swXSkpLFxuXHRcdFx0XHRcdHNmeCA9IChkZmx0LmNoYXJBdChkZmx0Lmxlbmd0aCAtIDEpID09PSBcIilcIikgPyBcIilcIiA6IFwiXCIsXG5cdFx0XHRcdFx0ZGVsaW0gPSAoZGZsdC5pbmRleE9mKFwiIFwiKSAhPT0gLTEpID8gXCIgXCIgOiBcIixcIixcblx0XHRcdFx0XHRudW1WYWxzID0gZFZhbHMubGVuZ3RoLFxuXHRcdFx0XHRcdGRTZnggPSAobnVtVmFscyA+IDApID8gZFZhbHNbMF0ucmVwbGFjZShfbnVtRXhwLCBcIlwiKSA6IFwiXCIsXG5cdFx0XHRcdFx0Zm9ybWF0dGVyO1xuXHRcdFx0XHRpZiAoIW51bVZhbHMpIHtcblx0XHRcdFx0XHRyZXR1cm4gZnVuY3Rpb24odikge3JldHVybiB2O307XG5cdFx0XHRcdH1cblx0XHRcdFx0aWYgKGNscikge1xuXHRcdFx0XHRcdGZvcm1hdHRlciA9IGZ1bmN0aW9uKHYpIHtcblx0XHRcdFx0XHRcdHZhciBjb2xvciwgdmFscywgaSwgYTtcblx0XHRcdFx0XHRcdGlmICh0eXBlb2YodikgPT09IFwibnVtYmVyXCIpIHtcblx0XHRcdFx0XHRcdFx0diArPSBkU2Z4O1xuXHRcdFx0XHRcdFx0fSBlbHNlIGlmIChtdWx0aSAmJiBfY29tbWFzT3V0c2lkZVBhcmVuRXhwLnRlc3QodikpIHtcblx0XHRcdFx0XHRcdFx0YSA9IHYucmVwbGFjZShfY29tbWFzT3V0c2lkZVBhcmVuRXhwLCBcInxcIikuc3BsaXQoXCJ8XCIpO1xuXHRcdFx0XHRcdFx0XHRmb3IgKGkgPSAwOyBpIDwgYS5sZW5ndGg7IGkrKykge1xuXHRcdFx0XHRcdFx0XHRcdGFbaV0gPSBmb3JtYXR0ZXIoYVtpXSk7XG5cdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdFx0cmV0dXJuIGEuam9pbihcIixcIik7XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRjb2xvciA9ICh2Lm1hdGNoKF9jb2xvckV4cCkgfHwgW2RDb2xvcl0pWzBdO1xuXHRcdFx0XHRcdFx0dmFscyA9IHYuc3BsaXQoY29sb3IpLmpvaW4oXCJcIikubWF0Y2goX3ZhbHVlc0V4cCkgfHwgW107XG5cdFx0XHRcdFx0XHRpID0gdmFscy5sZW5ndGg7XG5cdFx0XHRcdFx0XHRpZiAobnVtVmFscyA+IGktLSkge1xuXHRcdFx0XHRcdFx0XHR3aGlsZSAoKytpIDwgbnVtVmFscykge1xuXHRcdFx0XHRcdFx0XHRcdHZhbHNbaV0gPSBjb2xsYXBzaWJsZSA/IHZhbHNbKCgoaSAtIDEpIC8gMikgfCAwKV0gOiBkVmFsc1tpXTtcblx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0cmV0dXJuIHBmeCArIHZhbHMuam9pbihkZWxpbSkgKyBkZWxpbSArIGNvbG9yICsgc2Z4ICsgKHYuaW5kZXhPZihcImluc2V0XCIpICE9PSAtMSA/IFwiIGluc2V0XCIgOiBcIlwiKTtcblx0XHRcdFx0XHR9O1xuXHRcdFx0XHRcdHJldHVybiBmb3JtYXR0ZXI7XG5cblx0XHRcdFx0fVxuXHRcdFx0XHRmb3JtYXR0ZXIgPSBmdW5jdGlvbih2KSB7XG5cdFx0XHRcdFx0dmFyIHZhbHMsIGEsIGk7XG5cdFx0XHRcdFx0aWYgKHR5cGVvZih2KSA9PT0gXCJudW1iZXJcIikge1xuXHRcdFx0XHRcdFx0diArPSBkU2Z4O1xuXHRcdFx0XHRcdH0gZWxzZSBpZiAobXVsdGkgJiYgX2NvbW1hc091dHNpZGVQYXJlbkV4cC50ZXN0KHYpKSB7XG5cdFx0XHRcdFx0XHRhID0gdi5yZXBsYWNlKF9jb21tYXNPdXRzaWRlUGFyZW5FeHAsIFwifFwiKS5zcGxpdChcInxcIik7XG5cdFx0XHRcdFx0XHRmb3IgKGkgPSAwOyBpIDwgYS5sZW5ndGg7IGkrKykge1xuXHRcdFx0XHRcdFx0XHRhW2ldID0gZm9ybWF0dGVyKGFbaV0pO1xuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0cmV0dXJuIGEuam9pbihcIixcIik7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdHZhbHMgPSB2Lm1hdGNoKF92YWx1ZXNFeHApIHx8IFtdO1xuXHRcdFx0XHRcdGkgPSB2YWxzLmxlbmd0aDtcblx0XHRcdFx0XHRpZiAobnVtVmFscyA+IGktLSkge1xuXHRcdFx0XHRcdFx0d2hpbGUgKCsraSA8IG51bVZhbHMpIHtcblx0XHRcdFx0XHRcdFx0dmFsc1tpXSA9IGNvbGxhcHNpYmxlID8gdmFsc1soKChpIC0gMSkgLyAyKSB8IDApXSA6IGRWYWxzW2ldO1xuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHRyZXR1cm4gcGZ4ICsgdmFscy5qb2luKGRlbGltKSArIHNmeDtcblx0XHRcdFx0fTtcblx0XHRcdFx0cmV0dXJuIGZvcm1hdHRlcjtcblx0XHRcdH0sXG5cblx0XHRcdC8qKlxuXHRcdFx0ICogQHByaXZhdGUgcmV0dXJucyBhIGZvcm1hdHRlciBmdW5jdGlvbiB0aGF0J3MgdXNlZCBmb3IgZWRnZS1yZWxhdGVkIHZhbHVlcyBsaWtlIG1hcmdpblRvcCwgbWFyZ2luTGVmdCwgcGFkZGluZ0JvdHRvbSwgcGFkZGluZ1JpZ2h0LCBldGMuIEp1c3QgcGFzcyBhIGNvbW1hLWRlbGltaXRlZCBsaXN0IG9mIHByb3BlcnR5IG5hbWVzIHJlbGF0ZWQgdG8gdGhlIGVkZ2VzLlxuXHRcdFx0ICogQHBhcmFtIHshc3RyaW5nfSBwcm9wcyBhIGNvbW1hLWRlbGltaXRlZCBsaXN0IG9mIHByb3BlcnR5IG5hbWVzIGluIG9yZGVyIGZyb20gdG9wIHRvIGxlZnQsIGxpa2UgXCJtYXJnaW5Ub3AsbWFyZ2luUmlnaHQsbWFyZ2luQm90dG9tLG1hcmdpbkxlZnRcIlxuXHRcdFx0ICogQHJldHVybiB7RnVuY3Rpb259IGEgZm9ybWF0dGVyIGZ1bmN0aW9uXG5cdFx0XHQgKi9cblx0XHRcdF9nZXRFZGdlUGFyc2VyID0gZnVuY3Rpb24ocHJvcHMpIHtcblx0XHRcdFx0cHJvcHMgPSBwcm9wcy5zcGxpdChcIixcIik7XG5cdFx0XHRcdHJldHVybiBmdW5jdGlvbih0LCBlLCBwLCBjc3NwLCBwdCwgcGx1Z2luLCB2YXJzKSB7XG5cdFx0XHRcdFx0dmFyIGEgPSAoZSArIFwiXCIpLnNwbGl0KFwiIFwiKSxcblx0XHRcdFx0XHRcdGk7XG5cdFx0XHRcdFx0dmFycyA9IHt9O1xuXHRcdFx0XHRcdGZvciAoaSA9IDA7IGkgPCA0OyBpKyspIHtcblx0XHRcdFx0XHRcdHZhcnNbcHJvcHNbaV1dID0gYVtpXSA9IGFbaV0gfHwgYVsoKChpIC0gMSkgLyAyKSA+PiAwKV07XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdHJldHVybiBjc3NwLnBhcnNlKHQsIHZhcnMsIHB0LCBwbHVnaW4pO1xuXHRcdFx0XHR9O1xuXHRcdFx0fSxcblxuXHRcdFx0Ly8gQHByaXZhdGUgdXNlZCB3aGVuIG90aGVyIHBsdWdpbnMgbXVzdCB0d2VlbiB2YWx1ZXMgZmlyc3QsIGxpa2UgQmV6aWVyUGx1Z2luIG9yIFRocm93UHJvcHNQbHVnaW4sIGV0Yy4gVGhhdCBwbHVnaW4ncyBzZXRSYXRpbygpIGdldHMgY2FsbGVkIGZpcnN0IHNvIHRoYXQgdGhlIHZhbHVlcyBhcmUgdXBkYXRlZCwgYW5kIHRoZW4gd2UgbG9vcCB0aHJvdWdoIHRoZSBNaW5pUHJvcFR3ZWVucyAgd2hpY2ggaGFuZGxlIGNvcHlpbmcgdGhlIHZhbHVlcyBpbnRvIHRoZWlyIGFwcHJvcHJpYXRlIHNsb3RzIHNvIHRoYXQgdGhleSBjYW4gdGhlbiBiZSBhcHBsaWVkIGNvcnJlY3RseSBpbiB0aGUgbWFpbiBDU1NQbHVnaW4gc2V0UmF0aW8oKSBtZXRob2QuIFJlbWVtYmVyLCB3ZSB0eXBpY2FsbHkgY3JlYXRlIGEgcHJveHkgb2JqZWN0IHRoYXQgaGFzIGEgYnVuY2ggb2YgdW5pcXVlbHktbmFtZWQgcHJvcGVydGllcyB0aGF0IHdlIGZlZWQgdG8gdGhlIHN1Yi1wbHVnaW4gYW5kIGl0IGRvZXMgaXRzIG1hZ2ljIG5vcm1hbGx5LCBhbmQgdGhlbiB3ZSBtdXN0IGludGVycHJldCB0aG9zZSB2YWx1ZXMgYW5kIGFwcGx5IHRoZW0gdG8gdGhlIGNzcyBiZWNhdXNlIG9mdGVuIG51bWJlcnMgbXVzdCBnZXQgY29tYmluZWQvY29uY2F0ZW5hdGVkLCBzdWZmaXhlcyBhZGRlZCwgZXRjLiB0byB3b3JrIHdpdGggY3NzLCBsaWtlIGJveFNoYWRvdyBjb3VsZCBoYXZlIDQgdmFsdWVzIHBsdXMgYSBjb2xvci5cblx0XHRcdF9zZXRQbHVnaW5SYXRpbyA9IF9pbnRlcm5hbHMuX3NldFBsdWdpblJhdGlvID0gZnVuY3Rpb24odikge1xuXHRcdFx0XHR0aGlzLnBsdWdpbi5zZXRSYXRpbyh2KTtcblx0XHRcdFx0dmFyIGQgPSB0aGlzLmRhdGEsXG5cdFx0XHRcdFx0cHJveHkgPSBkLnByb3h5LFxuXHRcdFx0XHRcdG1wdCA9IGQuZmlyc3RNUFQsXG5cdFx0XHRcdFx0bWluID0gMC4wMDAwMDEsXG5cdFx0XHRcdFx0dmFsLCBwdCwgaSwgc3RyLCBwO1xuXHRcdFx0XHR3aGlsZSAobXB0KSB7XG5cdFx0XHRcdFx0dmFsID0gcHJveHlbbXB0LnZdO1xuXHRcdFx0XHRcdGlmIChtcHQucikge1xuXHRcdFx0XHRcdFx0dmFsID0gTWF0aC5yb3VuZCh2YWwpO1xuXHRcdFx0XHRcdH0gZWxzZSBpZiAodmFsIDwgbWluICYmIHZhbCA+IC1taW4pIHtcblx0XHRcdFx0XHRcdHZhbCA9IDA7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdG1wdC50W21wdC5wXSA9IHZhbDtcblx0XHRcdFx0XHRtcHQgPSBtcHQuX25leHQ7XG5cdFx0XHRcdH1cblx0XHRcdFx0aWYgKGQuYXV0b1JvdGF0ZSkge1xuXHRcdFx0XHRcdGQuYXV0b1JvdGF0ZS5yb3RhdGlvbiA9IHByb3h5LnJvdGF0aW9uO1xuXHRcdFx0XHR9XG5cdFx0XHRcdC8vYXQgdGhlIGVuZCwgd2UgbXVzdCBzZXQgdGhlIENTU1Byb3BUd2VlbidzIFwiZVwiIChlbmQpIHZhbHVlIGR5bmFtaWNhbGx5IGhlcmUgYmVjYXVzZSB0aGF0J3Mgd2hhdCBpcyB1c2VkIGluIHRoZSBmaW5hbCBzZXRSYXRpbygpIG1ldGhvZC4gU2FtZSBmb3IgXCJiXCIgYXQgdGhlIGJlZ2lubmluZy5cblx0XHRcdFx0aWYgKHYgPT09IDEgfHwgdiA9PT0gMCkge1xuXHRcdFx0XHRcdG1wdCA9IGQuZmlyc3RNUFQ7XG5cdFx0XHRcdFx0cCA9ICh2ID09PSAxKSA/IFwiZVwiIDogXCJiXCI7XG5cdFx0XHRcdFx0d2hpbGUgKG1wdCkge1xuXHRcdFx0XHRcdFx0cHQgPSBtcHQudDtcblx0XHRcdFx0XHRcdGlmICghcHQudHlwZSkge1xuXHRcdFx0XHRcdFx0XHRwdFtwXSA9IHB0LnMgKyBwdC54czA7XG5cdFx0XHRcdFx0XHR9IGVsc2UgaWYgKHB0LnR5cGUgPT09IDEpIHtcblx0XHRcdFx0XHRcdFx0c3RyID0gcHQueHMwICsgcHQucyArIHB0LnhzMTtcblx0XHRcdFx0XHRcdFx0Zm9yIChpID0gMTsgaSA8IHB0Lmw7IGkrKykge1xuXHRcdFx0XHRcdFx0XHRcdHN0ciArPSBwdFtcInhuXCIraV0gKyBwdFtcInhzXCIrKGkrMSldO1xuXHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRcdHB0W3BdID0gc3RyO1xuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0bXB0ID0gbXB0Ll9uZXh0O1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXHRcdFx0fSxcblxuXHRcdFx0LyoqXG5cdFx0XHQgKiBAcHJpdmF0ZSBAY29uc3RydWN0b3IgVXNlZCBieSBhIGZldyBTcGVjaWFsUHJvcHMgdG8gaG9sZCBpbXBvcnRhbnQgdmFsdWVzIGZvciBwcm94aWVzLiBGb3IgZXhhbXBsZSwgX3BhcnNlVG9Qcm94eSgpIGNyZWF0ZXMgYSBNaW5pUHJvcFR3ZWVuIGluc3RhbmNlIGZvciBlYWNoIHByb3BlcnR5IHRoYXQgbXVzdCBnZXQgdHdlZW5lZCBvbiB0aGUgcHJveHksIGFuZCB3ZSByZWNvcmQgdGhlIG9yaWdpbmFsIHByb3BlcnR5IG5hbWUgYXMgd2VsbCBhcyB0aGUgdW5pcXVlIG9uZSB3ZSBjcmVhdGUgZm9yIHRoZSBwcm94eSwgcGx1cyB3aGV0aGVyIG9yIG5vdCB0aGUgdmFsdWUgbmVlZHMgdG8gYmUgcm91bmRlZCBwbHVzIHRoZSBvcmlnaW5hbCB2YWx1ZS5cblx0XHRcdCAqIEBwYXJhbSB7IU9iamVjdH0gdCB0YXJnZXQgb2JqZWN0IHdob3NlIHByb3BlcnR5IHdlJ3JlIHR3ZWVuaW5nIChvZnRlbiBhIENTU1Byb3BUd2Vlbilcblx0XHRcdCAqIEBwYXJhbSB7IXN0cmluZ30gcCBwcm9wZXJ0eSBuYW1lXG5cdFx0XHQgKiBAcGFyYW0geyhudW1iZXJ8c3RyaW5nfG9iamVjdCl9IHYgdmFsdWVcblx0XHRcdCAqIEBwYXJhbSB7TWluaVByb3BUd2Vlbj19IG5leHQgbmV4dCBNaW5pUHJvcFR3ZWVuIGluIHRoZSBsaW5rZWQgbGlzdFxuXHRcdFx0ICogQHBhcmFtIHtib29sZWFuPX0gciBpZiB0cnVlLCB0aGUgdHdlZW5lZCB2YWx1ZSBzaG91bGQgYmUgcm91bmRlZCB0byB0aGUgbmVhcmVzdCBpbnRlZ2VyXG5cdFx0XHQgKi9cblx0XHRcdE1pbmlQcm9wVHdlZW4gPSBmdW5jdGlvbih0LCBwLCB2LCBuZXh0LCByKSB7XG5cdFx0XHRcdHRoaXMudCA9IHQ7XG5cdFx0XHRcdHRoaXMucCA9IHA7XG5cdFx0XHRcdHRoaXMudiA9IHY7XG5cdFx0XHRcdHRoaXMuciA9IHI7XG5cdFx0XHRcdGlmIChuZXh0KSB7XG5cdFx0XHRcdFx0bmV4dC5fcHJldiA9IHRoaXM7XG5cdFx0XHRcdFx0dGhpcy5fbmV4dCA9IG5leHQ7XG5cdFx0XHRcdH1cblx0XHRcdH0sXG5cblx0XHRcdC8qKlxuXHRcdFx0ICogQHByaXZhdGUgTW9zdCBvdGhlciBwbHVnaW5zIChsaWtlIEJlemllclBsdWdpbiBhbmQgVGhyb3dQcm9wc1BsdWdpbiBhbmQgb3RoZXJzKSBjYW4gb25seSB0d2VlbiBudW1lcmljIHZhbHVlcywgYnV0IENTU1BsdWdpbiBtdXN0IGFjY29tbW9kYXRlIHNwZWNpYWwgdmFsdWVzIHRoYXQgaGF2ZSBhIGJ1bmNoIG9mIGV4dHJhIGRhdGEgKGxpa2UgYSBzdWZmaXggb3Igc3RyaW5ncyBiZXR3ZWVuIG51bWVyaWMgdmFsdWVzLCBldGMuKS4gRm9yIGV4YW1wbGUsIGJveFNoYWRvdyBoYXMgdmFsdWVzIGxpa2UgXCIxMHB4IDEwcHggMjBweCAzMHB4IHJnYigyNTUsMCwwKVwiIHdoaWNoIHdvdWxkIHV0dGVybHkgY29uZnVzZSBvdGhlciBwbHVnaW5zLiBUaGlzIG1ldGhvZCBhbGxvd3MgdXMgdG8gc3BsaXQgdGhhdCBkYXRhIGFwYXJ0IGFuZCBncmFiIG9ubHkgdGhlIG51bWVyaWMgZGF0YSBhbmQgYXR0YWNoIGl0IHRvIHVuaXF1ZWx5LW5hbWVkIHByb3BlcnRpZXMgb2YgYSBnZW5lcmljIHByb3h5IG9iamVjdCAoe30pIHNvIHRoYXQgd2UgY2FuIGZlZWQgdGhhdCB0byB2aXJ0dWFsbHkgYW55IHBsdWdpbiB0byBoYXZlIHRoZSBudW1iZXJzIHR3ZWVuZWQuIEhvd2V2ZXIsIHdlIG11c3QgYWxzbyBrZWVwIHRyYWNrIG9mIHdoaWNoIHByb3BlcnRpZXMgZnJvbSB0aGUgcHJveHkgZ28gd2l0aCB3aGljaCBDU1NQcm9wVHdlZW4gdmFsdWVzIGFuZCBpbnN0YW5jZXMuIFNvIHdlIGNyZWF0ZSBhIGxpbmtlZCBsaXN0IG9mIE1pbmlQcm9wVHdlZW5zLiBFYWNoIG9uZSByZWNvcmRzIGEgdGFyZ2V0ICh0aGUgb3JpZ2luYWwgQ1NTUHJvcFR3ZWVuKSwgcHJvcGVydHkgKGxpa2UgXCJzXCIgb3IgXCJ4bjFcIiBvciBcInhuMlwiKSB0aGF0IHdlJ3JlIHR3ZWVuaW5nIGFuZCB0aGUgdW5pcXVlIHByb3BlcnR5IG5hbWUgdGhhdCB3YXMgdXNlZCBmb3IgdGhlIHByb3h5IChsaWtlIFwiYm94U2hhZG93X3huMVwiIGFuZCBcImJveFNoYWRvd194bjJcIikgYW5kIHdoZXRoZXIgb3Igbm90IHRoZXkgbmVlZCB0byBiZSByb3VuZGVkLiBUaGF0IHdheSwgaW4gdGhlIF9zZXRQbHVnaW5SYXRpbygpIG1ldGhvZCB3ZSBjYW4gc2ltcGx5IGNvcHkgdGhlIHZhbHVlcyBvdmVyIGZyb20gdGhlIHByb3h5IHRvIHRoZSBDU1NQcm9wVHdlZW4gaW5zdGFuY2UocykuIFRoZW4sIHdoZW4gdGhlIG1haW4gQ1NTUGx1Z2luIHNldFJhdGlvKCkgbWV0aG9kIHJ1bnMgYW5kIGFwcGxpZXMgdGhlIENTU1Byb3BUd2VlbiB2YWx1ZXMgYWNjb3JkaW5nbHksIHRoZXkncmUgdXBkYXRlZCBuaWNlbHkuIFNvIHRoZSBleHRlcm5hbCBwbHVnaW4gdHdlZW5zIHRoZSBudW1iZXJzLCBfc2V0UGx1Z2luUmF0aW8oKSBjb3BpZXMgdGhlbSBvdmVyLCBhbmQgc2V0UmF0aW8oKSBhY3RzIG5vcm1hbGx5LCBhcHBseWluZyBjc3Mtc3BlY2lmaWMgdmFsdWVzIHRvIHRoZSBlbGVtZW50LlxuXHRcdFx0ICogVGhpcyBtZXRob2QgcmV0dXJucyBhbiBvYmplY3QgdGhhdCBoYXMgdGhlIGZvbGxvd2luZyBwcm9wZXJ0aWVzOlxuXHRcdFx0ICogIC0gcHJveHk6IGEgZ2VuZXJpYyBvYmplY3QgY29udGFpbmluZyB0aGUgc3RhcnRpbmcgdmFsdWVzIGZvciBhbGwgdGhlIHByb3BlcnRpZXMgdGhhdCB3aWxsIGJlIHR3ZWVuZWQgYnkgdGhlIGV4dGVybmFsIHBsdWdpbi4gIFRoaXMgaXMgd2hhdCB3ZSBmZWVkIHRvIHRoZSBleHRlcm5hbCBfb25Jbml0VHdlZW4oKSBhcyB0aGUgdGFyZ2V0XG5cdFx0XHQgKiAgLSBlbmQ6IGEgZ2VuZXJpYyBvYmplY3QgY29udGFpbmluZyB0aGUgZW5kaW5nIHZhbHVlcyBmb3IgYWxsIHRoZSBwcm9wZXJ0aWVzIHRoYXQgd2lsbCBiZSB0d2VlbmVkIGJ5IHRoZSBleHRlcm5hbCBwbHVnaW4uIFRoaXMgaXMgd2hhdCB3ZSBmZWVkIHRvIHRoZSBleHRlcm5hbCBwbHVnaW4ncyBfb25Jbml0VHdlZW4oKSBhcyB0aGUgZGVzdGluYXRpb24gdmFsdWVzXG5cdFx0XHQgKiAgLSBmaXJzdE1QVDogdGhlIGZpcnN0IE1pbmlQcm9wVHdlZW4gaW4gdGhlIGxpbmtlZCBsaXN0XG5cdFx0XHQgKiAgLSBwdDogdGhlIGZpcnN0IENTU1Byb3BUd2VlbiBpbiB0aGUgbGlua2VkIGxpc3QgdGhhdCB3YXMgY3JlYXRlZCB3aGVuIHBhcnNpbmcuIElmIHNoYWxsb3cgaXMgdHJ1ZSwgdGhpcyBsaW5rZWQgbGlzdCB3aWxsIE5PVCBhdHRhY2ggdG8gdGhlIG9uZSBwYXNzZWQgaW50byB0aGUgX3BhcnNlVG9Qcm94eSgpIGFzIHRoZSBcInB0XCIgKDR0aCkgcGFyYW1ldGVyLlxuXHRcdFx0ICogQHBhcmFtIHshT2JqZWN0fSB0IHRhcmdldCBvYmplY3QgdG8gYmUgdHdlZW5lZFxuXHRcdFx0ICogQHBhcmFtIHshKE9iamVjdHxzdHJpbmcpfSB2YXJzIHRoZSBvYmplY3QgY29udGFpbmluZyB0aGUgaW5mb3JtYXRpb24gYWJvdXQgdGhlIHR3ZWVuaW5nIHZhbHVlcyAodHlwaWNhbGx5IHRoZSBlbmQvZGVzdGluYXRpb24gdmFsdWVzKSB0aGF0IHNob3VsZCBiZSBwYXJzZWRcblx0XHRcdCAqIEBwYXJhbSB7IUNTU1BsdWdpbn0gY3NzcCBUaGUgQ1NTUGx1Z2luIGluc3RhbmNlXG5cdFx0XHQgKiBAcGFyYW0ge0NTU1Byb3BUd2Vlbj19IHB0IHRoZSBuZXh0IENTU1Byb3BUd2VlbiBpbiB0aGUgbGlua2VkIGxpc3Rcblx0XHRcdCAqIEBwYXJhbSB7VHdlZW5QbHVnaW49fSBwbHVnaW4gdGhlIGV4dGVybmFsIFR3ZWVuUGx1Z2luIGluc3RhbmNlIHRoYXQgd2lsbCBiZSBoYW5kbGluZyB0d2VlbmluZyB0aGUgbnVtZXJpYyB2YWx1ZXNcblx0XHRcdCAqIEBwYXJhbSB7Ym9vbGVhbj19IHNoYWxsb3cgaWYgdHJ1ZSwgdGhlIHJlc3VsdGluZyBsaW5rZWQgbGlzdCBmcm9tIHRoZSBwYXJzZSB3aWxsIE5PVCBiZSBhdHRhY2hlZCB0byB0aGUgQ1NTUHJvcFR3ZWVuIHRoYXQgd2FzIHBhc3NlZCBpbiBhcyB0aGUgXCJwdFwiICg0dGgpIHBhcmFtZXRlci5cblx0XHRcdCAqIEByZXR1cm4gQW4gb2JqZWN0IGNvbnRhaW5pbmcgdGhlIGZvbGxvd2luZyBwcm9wZXJ0aWVzOiBwcm94eSwgZW5kLCBmaXJzdE1QVCwgYW5kIHB0IChzZWUgYWJvdmUgZm9yIGRlc2NyaXB0aW9ucylcblx0XHRcdCAqL1xuXHRcdFx0X3BhcnNlVG9Qcm94eSA9IF9pbnRlcm5hbHMuX3BhcnNlVG9Qcm94eSA9IGZ1bmN0aW9uKHQsIHZhcnMsIGNzc3AsIHB0LCBwbHVnaW4sIHNoYWxsb3cpIHtcblx0XHRcdFx0dmFyIGJwdCA9IHB0LFxuXHRcdFx0XHRcdHN0YXJ0ID0ge30sXG5cdFx0XHRcdFx0ZW5kID0ge30sXG5cdFx0XHRcdFx0dHJhbnNmb3JtID0gY3NzcC5fdHJhbnNmb3JtLFxuXHRcdFx0XHRcdG9sZEZvcmNlID0gX2ZvcmNlUFQsXG5cdFx0XHRcdFx0aSwgcCwgeHAsIG1wdCwgZmlyc3RQVDtcblx0XHRcdFx0Y3NzcC5fdHJhbnNmb3JtID0gbnVsbDtcblx0XHRcdFx0X2ZvcmNlUFQgPSB2YXJzO1xuXHRcdFx0XHRwdCA9IGZpcnN0UFQgPSBjc3NwLnBhcnNlKHQsIHZhcnMsIHB0LCBwbHVnaW4pO1xuXHRcdFx0XHRfZm9yY2VQVCA9IG9sZEZvcmNlO1xuXHRcdFx0XHQvL2JyZWFrIG9mZiBmcm9tIHRoZSBsaW5rZWQgbGlzdCBzbyB0aGUgbmV3IG9uZXMgYXJlIGlzb2xhdGVkLlxuXHRcdFx0XHRpZiAoc2hhbGxvdykge1xuXHRcdFx0XHRcdGNzc3AuX3RyYW5zZm9ybSA9IHRyYW5zZm9ybTtcblx0XHRcdFx0XHRpZiAoYnB0KSB7XG5cdFx0XHRcdFx0XHRicHQuX3ByZXYgPSBudWxsO1xuXHRcdFx0XHRcdFx0aWYgKGJwdC5fcHJldikge1xuXHRcdFx0XHRcdFx0XHRicHQuX3ByZXYuX25leHQgPSBudWxsO1xuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXHRcdFx0XHR3aGlsZSAocHQgJiYgcHQgIT09IGJwdCkge1xuXHRcdFx0XHRcdGlmIChwdC50eXBlIDw9IDEpIHtcblx0XHRcdFx0XHRcdHAgPSBwdC5wO1xuXHRcdFx0XHRcdFx0ZW5kW3BdID0gcHQucyArIHB0LmM7XG5cdFx0XHRcdFx0XHRzdGFydFtwXSA9IHB0LnM7XG5cdFx0XHRcdFx0XHRpZiAoIXNoYWxsb3cpIHtcblx0XHRcdFx0XHRcdFx0bXB0ID0gbmV3IE1pbmlQcm9wVHdlZW4ocHQsIFwic1wiLCBwLCBtcHQsIHB0LnIpO1xuXHRcdFx0XHRcdFx0XHRwdC5jID0gMDtcblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdGlmIChwdC50eXBlID09PSAxKSB7XG5cdFx0XHRcdFx0XHRcdGkgPSBwdC5sO1xuXHRcdFx0XHRcdFx0XHR3aGlsZSAoLS1pID4gMCkge1xuXHRcdFx0XHRcdFx0XHRcdHhwID0gXCJ4blwiICsgaTtcblx0XHRcdFx0XHRcdFx0XHRwID0gcHQucCArIFwiX1wiICsgeHA7XG5cdFx0XHRcdFx0XHRcdFx0ZW5kW3BdID0gcHQuZGF0YVt4cF07XG5cdFx0XHRcdFx0XHRcdFx0c3RhcnRbcF0gPSBwdFt4cF07XG5cdFx0XHRcdFx0XHRcdFx0aWYgKCFzaGFsbG93KSB7XG5cdFx0XHRcdFx0XHRcdFx0XHRtcHQgPSBuZXcgTWluaVByb3BUd2VlbihwdCwgeHAsIHAsIG1wdCwgcHQucnhwW3hwXSk7XG5cdFx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdHB0ID0gcHQuX25leHQ7XG5cdFx0XHRcdH1cblx0XHRcdFx0cmV0dXJuIHtwcm94eTpzdGFydCwgZW5kOmVuZCwgZmlyc3RNUFQ6bXB0LCBwdDpmaXJzdFBUfTtcblx0XHRcdH0sXG5cblxuXG5cdFx0XHQvKipcblx0XHRcdCAqIEBjb25zdHJ1Y3RvciBFYWNoIHByb3BlcnR5IHRoYXQgaXMgdHdlZW5lZCBoYXMgYXQgbGVhc3Qgb25lIENTU1Byb3BUd2VlbiBhc3NvY2lhdGVkIHdpdGggaXQuIFRoZXNlIGluc3RhbmNlcyBzdG9yZSBpbXBvcnRhbnQgaW5mb3JtYXRpb24gbGlrZSB0aGUgdGFyZ2V0LCBwcm9wZXJ0eSwgc3RhcnRpbmcgdmFsdWUsIGFtb3VudCBvZiBjaGFuZ2UsIGV0Yy4gVGhleSBjYW4gYWxzbyBvcHRpb25hbGx5IGhhdmUgYSBudW1iZXIgb2YgXCJleHRyYVwiIHN0cmluZ3MgYW5kIG51bWVyaWMgdmFsdWVzIG5hbWVkIHhzMSwgeG4xLCB4czIsIHhuMiwgeHMzLCB4bjMsIGV0Yy4gd2hlcmUgXCJzXCIgaW5kaWNhdGVzIHN0cmluZyBhbmQgXCJuXCIgaW5kaWNhdGVzIG51bWJlci4gVGhlc2UgY2FuIGJlIHBpZWNlZCB0b2dldGhlciBpbiBhIGNvbXBsZXgtdmFsdWUgdHdlZW4gKHR5cGU6MSkgdGhhdCBoYXMgYWx0ZXJuYXRpbmcgdHlwZXMgb2YgZGF0YSBsaWtlIGEgc3RyaW5nLCBudW1iZXIsIHN0cmluZywgbnVtYmVyLCBldGMuIEZvciBleGFtcGxlLCBib3hTaGFkb3cgY291bGQgYmUgXCI1cHggNXB4IDhweCByZ2IoMTAyLCAxMDIsIDUxKVwiLiBJbiB0aGF0IHZhbHVlLCB0aGVyZSBhcmUgNiBudW1iZXJzIHRoYXQgbWF5IG5lZWQgdG8gdHdlZW4gYW5kIHRoZW4gcGllY2VkIGJhY2sgdG9nZXRoZXIgaW50byBhIHN0cmluZyBhZ2FpbiB3aXRoIHNwYWNlcywgc3VmZml4ZXMsIGV0Yy4geHMwIGlzIHNwZWNpYWwgaW4gdGhhdCBpdCBzdG9yZXMgdGhlIHN1ZmZpeCBmb3Igc3RhbmRhcmQgKHR5cGU6MCkgdHdlZW5zLCAtT1ItIHRoZSBmaXJzdCBzdHJpbmcgKHByZWZpeCkgaW4gYSBjb21wbGV4LXZhbHVlICh0eXBlOjEpIENTU1Byb3BUd2VlbiAtT1ItIGl0IGNhbiBiZSB0aGUgbm9uLXR3ZWVuaW5nIHZhbHVlIGluIGEgdHlwZTotMSBDU1NQcm9wVHdlZW4uIFdlIGRvIHRoaXMgdG8gY29uc2VydmUgbWVtb3J5LlxuXHRcdFx0ICogQ1NTUHJvcFR3ZWVucyBoYXZlIHRoZSBmb2xsb3dpbmcgb3B0aW9uYWwgcHJvcGVydGllcyBhcyB3ZWxsIChub3QgZGVmaW5lZCB0aHJvdWdoIHRoZSBjb25zdHJ1Y3Rvcik6XG5cdFx0XHQgKiAgLSBsOiBMZW5ndGggaW4gdGVybXMgb2YgdGhlIG51bWJlciBvZiBleHRyYSBwcm9wZXJ0aWVzIHRoYXQgdGhlIENTU1Byb3BUd2VlbiBoYXMgKGRlZmF1bHQ6IDApLiBGb3IgZXhhbXBsZSwgZm9yIGEgYm94U2hhZG93IHdlIG1heSBuZWVkIHRvIHR3ZWVuIDUgbnVtYmVycyBpbiB3aGljaCBjYXNlIGwgd291bGQgYmUgNTsgS2VlcCBpbiBtaW5kIHRoYXQgdGhlIHN0YXJ0L2VuZCB2YWx1ZXMgZm9yIHRoZSBmaXJzdCBudW1iZXIgdGhhdCdzIHR3ZWVuZWQgYXJlIGFsd2F5cyBzdG9yZWQgaW4gdGhlIHMgYW5kIGMgcHJvcGVydGllcyB0byBjb25zZXJ2ZSBtZW1vcnkuIEFsbCBhZGRpdGlvbmFsIHZhbHVlcyB0aGVyZWFmdGVyIGFyZSBzdG9yZWQgaW4geG4xLCB4bjIsIGV0Yy5cblx0XHRcdCAqICAtIHhmaXJzdDogVGhlIGZpcnN0IGluc3RhbmNlIG9mIGFueSBzdWItQ1NTUHJvcFR3ZWVucyB0aGF0IGFyZSB0d2VlbmluZyBwcm9wZXJ0aWVzIG9mIHRoaXMgaW5zdGFuY2UuIEZvciBleGFtcGxlLCB3ZSBtYXkgc3BsaXQgdXAgYSBib3hTaGFkb3cgdHdlZW4gc28gdGhhdCB0aGVyZSdzIGEgbWFpbiBDU1NQcm9wVHdlZW4gb2YgdHlwZToxIHRoYXQgaGFzIHZhcmlvdXMgeHMqIGFuZCB4biogdmFsdWVzIGFzc29jaWF0ZWQgd2l0aCB0aGUgaC1zaGFkb3csIHYtc2hhZG93LCBibHVyLCBjb2xvciwgZXRjLiBUaGVuIHdlIHNwYXduIGEgQ1NTUHJvcFR3ZWVuIGZvciBlYWNoIG9mIHRob3NlIHRoYXQgaGFzIGEgaGlnaGVyIHByaW9yaXR5IGFuZCBydW5zIEJFRk9SRSB0aGUgbWFpbiBDU1NQcm9wVHdlZW4gc28gdGhhdCB0aGUgdmFsdWVzIGFyZSBhbGwgc2V0IGJ5IHRoZSB0aW1lIGl0IG5lZWRzIHRvIHJlLWFzc2VtYmxlIHRoZW0uIFRoZSB4Zmlyc3QgZ2l2ZXMgdXMgYW4gZWFzeSB3YXkgdG8gaWRlbnRpZnkgdGhlIGZpcnN0IG9uZSBpbiB0aGF0IGNoYWluIHdoaWNoIHR5cGljYWxseSBlbmRzIGF0IHRoZSBtYWluIG9uZSAoYmVjYXVzZSB0aGV5J3JlIGFsbCBwcmVwZW5kZSB0byB0aGUgbGlua2VkIGxpc3QpXG5cdFx0XHQgKiAgLSBwbHVnaW46IFRoZSBUd2VlblBsdWdpbiBpbnN0YW5jZSB0aGF0IHdpbGwgaGFuZGxlIHRoZSB0d2VlbmluZyBvZiBhbnkgY29tcGxleCB2YWx1ZXMuIEZvciBleGFtcGxlLCBzb21ldGltZXMgd2UgZG9uJ3Qgd2FudCB0byB1c2Ugbm9ybWFsIHN1YnR3ZWVucyAobGlrZSB4Zmlyc3QgcmVmZXJzIHRvKSB0byB0d2VlbiB0aGUgdmFsdWVzIC0gd2UgbWlnaHQgd2FudCBUaHJvd1Byb3BzUGx1Z2luIG9yIEJlemllclBsdWdpbiBzb21lIG90aGVyIHBsdWdpbiB0byBkbyB0aGUgYWN0dWFsIHR3ZWVuaW5nLCBzbyB3ZSBjcmVhdGUgYSBwbHVnaW4gaW5zdGFuY2UgYW5kIHN0b3JlIGEgcmVmZXJlbmNlIGhlcmUuIFdlIG5lZWQgdGhpcyByZWZlcmVuY2Ugc28gdGhhdCBpZiB3ZSBnZXQgYSByZXF1ZXN0IHRvIHJvdW5kIHZhbHVlcyBvciBkaXNhYmxlIGEgdHdlZW4sIHdlIGNhbiBwYXNzIGFsb25nIHRoYXQgcmVxdWVzdC5cblx0XHRcdCAqICAtIGRhdGE6IEFyYml0cmFyeSBkYXRhIHRoYXQgbmVlZHMgdG8gYmUgc3RvcmVkIHdpdGggdGhlIENTU1Byb3BUd2Vlbi4gVHlwaWNhbGx5IGlmIHdlJ3JlIGdvaW5nIHRvIGhhdmUgYSBwbHVnaW4gaGFuZGxlIHRoZSB0d2VlbmluZyBvZiBhIGNvbXBsZXgtdmFsdWUgdHdlZW4sIHdlIGNyZWF0ZSBhIGdlbmVyaWMgb2JqZWN0IHRoYXQgc3RvcmVzIHRoZSBFTkQgdmFsdWVzIHRoYXQgd2UncmUgdHdlZW5pbmcgdG8gYW5kIHRoZSBDU1NQcm9wVHdlZW4ncyB4czEsIHhzMiwgZXRjLiBoYXZlIHRoZSBzdGFydGluZyB2YWx1ZXMuIFdlIHN0b3JlIHRoYXQgb2JqZWN0IGFzIGRhdGEuIFRoYXQgd2F5LCB3ZSBjYW4gc2ltcGx5IHBhc3MgdGhhdCBvYmplY3QgdG8gdGhlIHBsdWdpbiBhbmQgdXNlIHRoZSBDU1NQcm9wVHdlZW4gYXMgdGhlIHRhcmdldC5cblx0XHRcdCAqICAtIHNldFJhdGlvOiBPbmx5IHVzZWQgZm9yIHR5cGU6MiB0d2VlbnMgdGhhdCByZXF1aXJlIGN1c3RvbSBmdW5jdGlvbmFsaXR5LiBJbiB0aGlzIGNhc2UsIHdlIGNhbGwgdGhlIENTU1Byb3BUd2VlbidzIHNldFJhdGlvKCkgbWV0aG9kIGFuZCBwYXNzIHRoZSByYXRpbyBlYWNoIHRpbWUgdGhlIHR3ZWVuIHVwZGF0ZXMuIFRoaXMgaXNuJ3QgcXVpdGUgYXMgZWZmaWNpZW50IGFzIGRvaW5nIHRoaW5ncyBkaXJlY3RseSBpbiB0aGUgQ1NTUGx1Z2luJ3Mgc2V0UmF0aW8oKSBtZXRob2QsIGJ1dCBpdCdzIHZlcnkgY29udmVuaWVudCBhbmQgZmxleGlibGUuXG5cdFx0XHQgKiBAcGFyYW0geyFPYmplY3R9IHQgVGFyZ2V0IG9iamVjdCB3aG9zZSBwcm9wZXJ0eSB3aWxsIGJlIHR3ZWVuZWQuIE9mdGVuIGEgRE9NIGVsZW1lbnQsIGJ1dCBub3QgYWx3YXlzLiBJdCBjb3VsZCBiZSBhbnl0aGluZy5cblx0XHRcdCAqIEBwYXJhbSB7c3RyaW5nfSBwIFByb3BlcnR5IHRvIHR3ZWVuIChuYW1lKS4gRm9yIGV4YW1wbGUsIHRvIHR3ZWVuIGVsZW1lbnQud2lkdGgsIHAgd291bGQgYmUgXCJ3aWR0aFwiLlxuXHRcdFx0ICogQHBhcmFtIHtudW1iZXJ9IHMgU3RhcnRpbmcgbnVtZXJpYyB2YWx1ZVxuXHRcdFx0ICogQHBhcmFtIHtudW1iZXJ9IGMgQ2hhbmdlIGluIG51bWVyaWMgdmFsdWUgb3ZlciB0aGUgY291cnNlIG9mIHRoZSBlbnRpcmUgdHdlZW4uIEZvciBleGFtcGxlLCBpZiBlbGVtZW50LndpZHRoIHN0YXJ0cyBhdCA1IGFuZCBzaG91bGQgZW5kIGF0IDEwMCwgYyB3b3VsZCBiZSA5NS5cblx0XHRcdCAqIEBwYXJhbSB7Q1NTUHJvcFR3ZWVuPX0gbmV4dCBUaGUgbmV4dCBDU1NQcm9wVHdlZW4gaW4gdGhlIGxpbmtlZCBsaXN0LiBJZiBvbmUgaXMgZGVmaW5lZCwgd2Ugd2lsbCBkZWZpbmUgaXRzIF9wcmV2IGFzIHRoZSBuZXcgaW5zdGFuY2UsIGFuZCB0aGUgbmV3IGluc3RhbmNlJ3MgX25leHQgd2lsbCBiZSBwb2ludGVkIGF0IGl0LlxuXHRcdFx0ICogQHBhcmFtIHtudW1iZXI9fSB0eXBlIFRoZSB0eXBlIG9mIENTU1Byb3BUd2VlbiB3aGVyZSAtMSA9IGEgbm9uLXR3ZWVuaW5nIHZhbHVlLCAwID0gYSBzdGFuZGFyZCBzaW1wbGUgdHdlZW4sIDEgPSBhIGNvbXBsZXggdmFsdWUgKGxpa2Ugb25lIHRoYXQgaGFzIG11bHRpcGxlIG51bWJlcnMgaW4gYSBjb21tYS0gb3Igc3BhY2UtZGVsaW1pdGVkIHN0cmluZyBsaWtlIGJvcmRlcjpcIjFweCBzb2xpZCByZWRcIiksIGFuZCAyID0gb25lIHRoYXQgdXNlcyBhIGN1c3RvbSBzZXRSYXRpbyBmdW5jdGlvbiB0aGF0IGRvZXMgYWxsIG9mIHRoZSB3b3JrIG9mIGFwcGx5aW5nIHRoZSB2YWx1ZXMgb24gZWFjaCB1cGRhdGUuXG5cdFx0XHQgKiBAcGFyYW0ge3N0cmluZz19IG4gTmFtZSBvZiB0aGUgcHJvcGVydHkgdGhhdCBzaG91bGQgYmUgdXNlZCBmb3Igb3ZlcndyaXRpbmcgcHVycG9zZXMgd2hpY2ggaXMgdHlwaWNhbGx5IHRoZSBzYW1lIGFzIHAgYnV0IG5vdCBhbHdheXMuIEZvciBleGFtcGxlLCB3ZSBtYXkgbmVlZCB0byBjcmVhdGUgYSBzdWJ0d2VlbiBmb3IgdGhlIDJuZCBwYXJ0IG9mIGEgXCJjbGlwOnJlY3QoLi4uKVwiIHR3ZWVuIGluIHdoaWNoIGNhc2UgXCJwXCIgbWlnaHQgYmUgeHMxIGJ1dCBcIm5cIiBpcyBzdGlsbCBcImNsaXBcIlxuXHRcdFx0ICogQHBhcmFtIHtib29sZWFuPX0gciBJZiB0cnVlLCB0aGUgdmFsdWUocykgc2hvdWxkIGJlIHJvdW5kZWRcblx0XHRcdCAqIEBwYXJhbSB7bnVtYmVyPX0gcHIgUHJpb3JpdHkgaW4gdGhlIGxpbmtlZCBsaXN0IG9yZGVyLiBIaWdoZXIgcHJpb3JpdHkgQ1NTUHJvcFR3ZWVucyB3aWxsIGJlIHVwZGF0ZWQgYmVmb3JlIGxvd2VyIHByaW9yaXR5IG9uZXMuIFRoZSBkZWZhdWx0IHByaW9yaXR5IGlzIDAuXG5cdFx0XHQgKiBAcGFyYW0ge3N0cmluZz19IGIgQmVnaW5uaW5nIHZhbHVlLiBXZSBzdG9yZSB0aGlzIHRvIGVuc3VyZSB0aGF0IGl0IGlzIEVYQUNUTFkgd2hhdCBpdCB3YXMgd2hlbiB0aGUgdHdlZW4gYmVnYW4gd2l0aG91dCBhbnkgcmlzayBvZiBpbnRlcnByZXRhdGlvbiBpc3N1ZXMuXG5cdFx0XHQgKiBAcGFyYW0ge3N0cmluZz19IGUgRW5kaW5nIHZhbHVlLiBXZSBzdG9yZSB0aGlzIHRvIGVuc3VyZSB0aGF0IGl0IGlzIEVYQUNUTFkgd2hhdCB0aGUgdXNlciBkZWZpbmVkIGF0IHRoZSBlbmQgb2YgdGhlIHR3ZWVuIHdpdGhvdXQgYW55IHJpc2sgb2YgaW50ZXJwcmV0YXRpb24gaXNzdWVzLlxuXHRcdFx0ICovXG5cdFx0XHRDU1NQcm9wVHdlZW4gPSBfaW50ZXJuYWxzLkNTU1Byb3BUd2VlbiA9IGZ1bmN0aW9uKHQsIHAsIHMsIGMsIG5leHQsIHR5cGUsIG4sIHIsIHByLCBiLCBlKSB7XG5cdFx0XHRcdHRoaXMudCA9IHQ7IC8vdGFyZ2V0XG5cdFx0XHRcdHRoaXMucCA9IHA7IC8vcHJvcGVydHlcblx0XHRcdFx0dGhpcy5zID0gczsgLy9zdGFydGluZyB2YWx1ZVxuXHRcdFx0XHR0aGlzLmMgPSBjOyAvL2NoYW5nZSB2YWx1ZVxuXHRcdFx0XHR0aGlzLm4gPSBuIHx8IHA7IC8vbmFtZSB0aGF0IHRoaXMgQ1NTUHJvcFR3ZWVuIHNob3VsZCBiZSBhc3NvY2lhdGVkIHRvICh1c3VhbGx5IHRoZSBzYW1lIGFzIHAsIGJ1dCBub3QgYWx3YXlzIC0gbiBpcyB3aGF0IG92ZXJ3cml0aW5nIGxvb2tzIGF0KVxuXHRcdFx0XHRpZiAoISh0IGluc3RhbmNlb2YgQ1NTUHJvcFR3ZWVuKSkge1xuXHRcdFx0XHRcdF9vdmVyd3JpdGVQcm9wcy5wdXNoKHRoaXMubik7XG5cdFx0XHRcdH1cblx0XHRcdFx0dGhpcy5yID0gcjsgLy9yb3VuZCAoYm9vbGVhbilcblx0XHRcdFx0dGhpcy50eXBlID0gdHlwZSB8fCAwOyAvLzAgPSBub3JtYWwgdHdlZW4sIC0xID0gbm9uLXR3ZWVuaW5nIChpbiB3aGljaCBjYXNlIHhzMCB3aWxsIGJlIGFwcGxpZWQgdG8gdGhlIHRhcmdldCdzIHByb3BlcnR5LCBsaWtlIHRwLnRbdHAucF0gPSB0cC54czApLCAxID0gY29tcGxleC12YWx1ZSBTcGVjaWFsUHJvcCwgMiA9IGN1c3RvbSBzZXRSYXRpbygpIHRoYXQgZG9lcyBhbGwgdGhlIHdvcmtcblx0XHRcdFx0aWYgKHByKSB7XG5cdFx0XHRcdFx0dGhpcy5wciA9IHByO1xuXHRcdFx0XHRcdF9oYXNQcmlvcml0eSA9IHRydWU7XG5cdFx0XHRcdH1cblx0XHRcdFx0dGhpcy5iID0gKGIgPT09IHVuZGVmaW5lZCkgPyBzIDogYjtcblx0XHRcdFx0dGhpcy5lID0gKGUgPT09IHVuZGVmaW5lZCkgPyBzICsgYyA6IGU7XG5cdFx0XHRcdGlmIChuZXh0KSB7XG5cdFx0XHRcdFx0dGhpcy5fbmV4dCA9IG5leHQ7XG5cdFx0XHRcdFx0bmV4dC5fcHJldiA9IHRoaXM7XG5cdFx0XHRcdH1cblx0XHRcdH0sXG5cblx0XHRcdF9hZGROb25Ud2VlbmluZ051bWVyaWNQVCA9IGZ1bmN0aW9uKHRhcmdldCwgcHJvcCwgc3RhcnQsIGVuZCwgbmV4dCwgb3ZlcndyaXRlUHJvcCkgeyAvL2NsZWFucyB1cCBzb21lIGNvZGUgcmVkdW5kYW5jaWVzIGFuZCBoZWxwcyBtaW5pZmljYXRpb24uIEp1c3QgYSBmYXN0IHdheSB0byBhZGQgYSBOVU1FUklDIG5vbi10d2VlbmluZyBDU1NQcm9wVHdlZW5cblx0XHRcdFx0dmFyIHB0ID0gbmV3IENTU1Byb3BUd2Vlbih0YXJnZXQsIHByb3AsIHN0YXJ0LCBlbmQgLSBzdGFydCwgbmV4dCwgLTEsIG92ZXJ3cml0ZVByb3ApO1xuXHRcdFx0XHRwdC5iID0gc3RhcnQ7XG5cdFx0XHRcdHB0LmUgPSBwdC54czAgPSBlbmQ7XG5cdFx0XHRcdHJldHVybiBwdDtcblx0XHRcdH0sXG5cblx0XHRcdC8qKlxuXHRcdFx0ICogVGFrZXMgYSB0YXJnZXQsIHRoZSBiZWdpbm5pbmcgdmFsdWUgYW5kIGVuZGluZyB2YWx1ZSAoYXMgc3RyaW5ncykgYW5kIHBhcnNlcyB0aGVtIGludG8gYSBDU1NQcm9wVHdlZW4gKHBvc3NpYmx5IHdpdGggY2hpbGQgQ1NTUHJvcFR3ZWVucykgdGhhdCBhY2NvbW1vZGF0ZXMgbXVsdGlwbGUgbnVtYmVycywgY29sb3JzLCBjb21tYS1kZWxpbWl0ZWQgdmFsdWVzLCBldGMuIEZvciBleGFtcGxlOlxuXHRcdFx0ICogc3AucGFyc2VDb21wbGV4KGVsZW1lbnQsIFwiYm94U2hhZG93XCIsIFwiNXB4IDEwcHggMjBweCByZ2IoMjU1LDEwMiw1MSlcIiwgXCIwcHggMHB4IDBweCByZWRcIiwgdHJ1ZSwgXCIwcHggMHB4IDBweCByZ2IoMCwwLDAsMClcIiwgcHQpO1xuXHRcdFx0ICogSXQgd2lsbCB3YWxrIHRocm91Z2ggdGhlIGJlZ2lubmluZyBhbmQgZW5kaW5nIHZhbHVlcyAod2hpY2ggc2hvdWxkIGJlIGluIHRoZSBzYW1lIGZvcm1hdCB3aXRoIHRoZSBzYW1lIG51bWJlciBhbmQgdHlwZSBvZiB2YWx1ZXMpIGFuZCBmaWd1cmUgb3V0IHdoaWNoIHBhcnRzIGFyZSBudW1iZXJzLCB3aGF0IHN0cmluZ3Mgc2VwYXJhdGUgdGhlIG51bWVyaWMvdHdlZW5hYmxlIHZhbHVlcywgYW5kIHRoZW4gY3JlYXRlIHRoZSBDU1NQcm9wVHdlZW5zIGFjY29yZGluZ2x5LiBJZiBhIHBsdWdpbiBpcyBkZWZpbmVkLCBubyBjaGlsZCBDU1NQcm9wVHdlZW5zIHdpbGwgYmUgY3JlYXRlZC4gSW5zdGVhZCwgdGhlIGVuZGluZyB2YWx1ZXMgd2lsbCBiZSBzdG9yZWQgaW4gdGhlIFwiZGF0YVwiIHByb3BlcnR5IG9mIHRoZSByZXR1cm5lZCBDU1NQcm9wVHdlZW4gbGlrZToge3M6LTUsIHhuMTotMTAsIHhuMjotMjAsIHhuMzoyNTUsIHhuNDowLCB4bjU6MH0gc28gdGhhdCBpdCBjYW4gYmUgZmVkIHRvIGFueSBvdGhlciBwbHVnaW4gYW5kIGl0J2xsIGJlIHBsYWluIG51bWVyaWMgdHdlZW5zIGJ1dCB0aGUgcmVjb21wb3NpdGlvbiBvZiB0aGUgY29tcGxleCB2YWx1ZSB3aWxsIGJlIGhhbmRsZWQgaW5zaWRlIENTU1BsdWdpbidzIHNldFJhdGlvKCkuXG5cdFx0XHQgKiBJZiBhIHNldFJhdGlvIGlzIGRlZmluZWQsIHRoZSB0eXBlIG9mIHRoZSBDU1NQcm9wVHdlZW4gd2lsbCBiZSBzZXQgdG8gMiBhbmQgcmVjb21wb3NpdGlvbiBvZiB0aGUgdmFsdWVzIHdpbGwgYmUgdGhlIHJlc3BvbnNpYmlsaXR5IG9mIHRoYXQgbWV0aG9kLlxuXHRcdFx0ICpcblx0XHRcdCAqIEBwYXJhbSB7IU9iamVjdH0gdCBUYXJnZXQgd2hvc2UgcHJvcGVydHkgd2lsbCBiZSB0d2VlbmVkXG5cdFx0XHQgKiBAcGFyYW0geyFzdHJpbmd9IHAgUHJvcGVydHkgdGhhdCB3aWxsIGJlIHR3ZWVuZWQgKGl0cyBuYW1lLCBsaWtlIFwibGVmdFwiIG9yIFwiYmFja2dyb3VuZENvbG9yXCIgb3IgXCJib3hTaGFkb3dcIilcblx0XHRcdCAqIEBwYXJhbSB7c3RyaW5nfSBiIEJlZ2lubmluZyB2YWx1ZVxuXHRcdFx0ICogQHBhcmFtIHtzdHJpbmd9IGUgRW5kaW5nIHZhbHVlXG5cdFx0XHQgKiBAcGFyYW0ge2Jvb2xlYW59IGNscnMgSWYgdHJ1ZSwgdGhlIHZhbHVlIGNvdWxkIGNvbnRhaW4gYSBjb2xvciB2YWx1ZSBsaWtlIFwicmdiKDI1NSwwLDApXCIgb3IgXCIjRjAwXCIgb3IgXCJyZWRcIi4gVGhlIGRlZmF1bHQgaXMgZmFsc2UsIHNvIG5vIGNvbG9ycyB3aWxsIGJlIHJlY29nbml6ZWQgKGEgcGVyZm9ybWFuY2Ugb3B0aW1pemF0aW9uKVxuXHRcdFx0ICogQHBhcmFtIHsoc3RyaW5nfG51bWJlcnxPYmplY3QpfSBkZmx0IFRoZSBkZWZhdWx0IGJlZ2lubmluZyB2YWx1ZSB0aGF0IHNob3VsZCBiZSB1c2VkIGlmIG5vIHZhbGlkIGJlZ2lubmluZyB2YWx1ZSBpcyBkZWZpbmVkIG9yIGlmIHRoZSBudW1iZXIgb2YgdmFsdWVzIGluc2lkZSB0aGUgY29tcGxleCBiZWdpbm5pbmcgYW5kIGVuZGluZyB2YWx1ZXMgZG9uJ3QgbWF0Y2hcblx0XHRcdCAqIEBwYXJhbSB7P0NTU1Byb3BUd2Vlbn0gcHQgQ1NTUHJvcFR3ZWVuIGluc3RhbmNlIHRoYXQgaXMgdGhlIGN1cnJlbnQgaGVhZCBvZiB0aGUgbGlua2VkIGxpc3QgKHdlJ2xsIHByZXBlbmQgdG8gdGhpcykuXG5cdFx0XHQgKiBAcGFyYW0ge251bWJlcj19IHByIFByaW9yaXR5IGluIHRoZSBsaW5rZWQgbGlzdCBvcmRlci4gSGlnaGVyIHByaW9yaXR5IHByb3BlcnRpZXMgd2lsbCBiZSB1cGRhdGVkIGJlZm9yZSBsb3dlciBwcmlvcml0eSBvbmVzLiBUaGUgZGVmYXVsdCBwcmlvcml0eSBpcyAwLlxuXHRcdFx0ICogQHBhcmFtIHtUd2VlblBsdWdpbj19IHBsdWdpbiBJZiBhIHBsdWdpbiBzaG91bGQgaGFuZGxlIHRoZSB0d2VlbmluZyBvZiBleHRyYSBwcm9wZXJ0aWVzLCBwYXNzIHRoZSBwbHVnaW4gaW5zdGFuY2UgaGVyZS4gSWYgb25lIGlzIGRlZmluZWQsIHRoZW4gTk8gc3VidHdlZW5zIHdpbGwgYmUgY3JlYXRlZCBmb3IgYW55IGV4dHJhIHByb3BlcnRpZXMgKHRoZSBwcm9wZXJ0aWVzIHdpbGwgYmUgY3JlYXRlZCAtIGp1c3Qgbm90IGFkZGl0aW9uYWwgQ1NTUHJvcFR3ZWVuIGluc3RhbmNlcyB0byB0d2VlbiB0aGVtKSBiZWNhdXNlIHRoZSBwbHVnaW4gaXMgZXhwZWN0ZWQgdG8gZG8gc28uIEhvd2V2ZXIsIHRoZSBlbmQgdmFsdWVzIFdJTEwgYmUgcG9wdWxhdGVkIGluIHRoZSBcImRhdGFcIiBwcm9wZXJ0eSwgbGlrZSB7czoxMDAsIHhuMTo1MCwgeG4yOjMwMH1cblx0XHRcdCAqIEBwYXJhbSB7ZnVuY3Rpb24obnVtYmVyKT19IHNldFJhdGlvIElmIHZhbHVlcyBzaG91bGQgYmUgc2V0IGluIGEgY3VzdG9tIGZ1bmN0aW9uIGluc3RlYWQgb2YgYmVpbmcgcGllY2VkIHRvZ2V0aGVyIGluIGEgdHlwZToxIChjb21wbGV4LXZhbHVlKSBDU1NQcm9wVHdlZW4sIGRlZmluZSB0aGF0IGN1c3RvbSBmdW5jdGlvbiBoZXJlLlxuXHRcdFx0ICogQHJldHVybiB7Q1NTUHJvcFR3ZWVufSBUaGUgZmlyc3QgQ1NTUHJvcFR3ZWVuIGluIHRoZSBsaW5rZWQgbGlzdCB3aGljaCBpbmNsdWRlcyB0aGUgbmV3IG9uZShzKSBhZGRlZCBieSB0aGUgcGFyc2VDb21wbGV4KCkgY2FsbC5cblx0XHRcdCAqL1xuXHRcdFx0X3BhcnNlQ29tcGxleCA9IENTU1BsdWdpbi5wYXJzZUNvbXBsZXggPSBmdW5jdGlvbih0LCBwLCBiLCBlLCBjbHJzLCBkZmx0LCBwdCwgcHIsIHBsdWdpbiwgc2V0UmF0aW8pIHtcblx0XHRcdFx0Ly9ERUJVRzogX2xvZyhcInBhcnNlQ29tcGxleDogXCIrcCtcIiwgYjogXCIrYitcIiwgZTogXCIrZSk7XG5cdFx0XHRcdGIgPSBiIHx8IGRmbHQgfHwgXCJcIjtcblx0XHRcdFx0cHQgPSBuZXcgQ1NTUHJvcFR3ZWVuKHQsIHAsIDAsIDAsIHB0LCAoc2V0UmF0aW8gPyAyIDogMSksIG51bGwsIGZhbHNlLCBwciwgYiwgZSk7XG5cdFx0XHRcdGUgKz0gXCJcIjsgLy9lbnN1cmVzIGl0J3MgYSBzdHJpbmdcblx0XHRcdFx0dmFyIGJhID0gYi5zcGxpdChcIiwgXCIpLmpvaW4oXCIsXCIpLnNwbGl0KFwiIFwiKSwgLy9iZWdpbm5pbmcgYXJyYXlcblx0XHRcdFx0XHRlYSA9IGUuc3BsaXQoXCIsIFwiKS5qb2luKFwiLFwiKS5zcGxpdChcIiBcIiksIC8vZW5kaW5nIGFycmF5XG5cdFx0XHRcdFx0bCA9IGJhLmxlbmd0aCxcblx0XHRcdFx0XHRhdXRvUm91bmQgPSAoX2F1dG9Sb3VuZCAhPT0gZmFsc2UpLFxuXHRcdFx0XHRcdGksIHhpLCBuaSwgYnYsIGV2LCBibnVtcywgZW51bXMsIGJuLCBoYXNBbHBoYSwgdGVtcCwgY3YsIHN0ciwgdXNlSFNMO1xuXHRcdFx0XHRpZiAoZS5pbmRleE9mKFwiLFwiKSAhPT0gLTEgfHwgYi5pbmRleE9mKFwiLFwiKSAhPT0gLTEpIHtcblx0XHRcdFx0XHRiYSA9IGJhLmpvaW4oXCIgXCIpLnJlcGxhY2UoX2NvbW1hc091dHNpZGVQYXJlbkV4cCwgXCIsIFwiKS5zcGxpdChcIiBcIik7XG5cdFx0XHRcdFx0ZWEgPSBlYS5qb2luKFwiIFwiKS5yZXBsYWNlKF9jb21tYXNPdXRzaWRlUGFyZW5FeHAsIFwiLCBcIikuc3BsaXQoXCIgXCIpO1xuXHRcdFx0XHRcdGwgPSBiYS5sZW5ndGg7XG5cdFx0XHRcdH1cblx0XHRcdFx0aWYgKGwgIT09IGVhLmxlbmd0aCkge1xuXHRcdFx0XHRcdC8vREVCVUc6IF9sb2coXCJtaXNtYXRjaGVkIGZvcm1hdHRpbmcgZGV0ZWN0ZWQgb24gXCIgKyBwICsgXCIgKFwiICsgYiArIFwiIHZzIFwiICsgZSArIFwiKVwiKTtcblx0XHRcdFx0XHRiYSA9IChkZmx0IHx8IFwiXCIpLnNwbGl0KFwiIFwiKTtcblx0XHRcdFx0XHRsID0gYmEubGVuZ3RoO1xuXHRcdFx0XHR9XG5cdFx0XHRcdHB0LnBsdWdpbiA9IHBsdWdpbjtcblx0XHRcdFx0cHQuc2V0UmF0aW8gPSBzZXRSYXRpbztcblx0XHRcdFx0X2NvbG9yRXhwLmxhc3RJbmRleCA9IDA7XG5cdFx0XHRcdGZvciAoaSA9IDA7IGkgPCBsOyBpKyspIHtcblx0XHRcdFx0XHRidiA9IGJhW2ldO1xuXHRcdFx0XHRcdGV2ID0gZWFbaV07XG5cdFx0XHRcdFx0Ym4gPSBwYXJzZUZsb2F0KGJ2KTtcblx0XHRcdFx0XHQvL2lmIHRoZSB2YWx1ZSBiZWdpbnMgd2l0aCBhIG51bWJlciAobW9zdCBjb21tb24pLiBJdCdzIGZpbmUgaWYgaXQgaGFzIGEgc3VmZml4IGxpa2UgcHhcblx0XHRcdFx0XHRpZiAoYm4gfHwgYm4gPT09IDApIHtcblx0XHRcdFx0XHRcdHB0LmFwcGVuZFh0cmEoXCJcIiwgYm4sIF9wYXJzZUNoYW5nZShldiwgYm4pLCBldi5yZXBsYWNlKF9yZWxOdW1FeHAsIFwiXCIpLCAoYXV0b1JvdW5kICYmIGV2LmluZGV4T2YoXCJweFwiKSAhPT0gLTEpLCB0cnVlKTtcblxuXHRcdFx0XHRcdC8vaWYgdGhlIHZhbHVlIGlzIGEgY29sb3Jcblx0XHRcdFx0XHR9IGVsc2UgaWYgKGNscnMgJiYgX2NvbG9yRXhwLnRlc3QoYnYpKSB7XG5cdFx0XHRcdFx0XHRzdHIgPSBldi5jaGFyQXQoZXYubGVuZ3RoIC0gMSkgPT09IFwiLFwiID8gXCIpLFwiIDogXCIpXCI7IC8vaWYgdGhlcmUncyBhIGNvbW1hIGF0IHRoZSBlbmQsIHJldGFpbiBpdC5cblx0XHRcdFx0XHRcdHVzZUhTTCA9IChldi5pbmRleE9mKFwiaHNsXCIpICE9PSAtMSAmJiBfc3VwcG9ydHNPcGFjaXR5KTtcblx0XHRcdFx0XHRcdGJ2ID0gX3BhcnNlQ29sb3IoYnYsIHVzZUhTTCk7XG5cdFx0XHRcdFx0XHRldiA9IF9wYXJzZUNvbG9yKGV2LCB1c2VIU0wpO1xuXHRcdFx0XHRcdFx0aGFzQWxwaGEgPSAoYnYubGVuZ3RoICsgZXYubGVuZ3RoID4gNik7XG5cdFx0XHRcdFx0XHRpZiAoaGFzQWxwaGEgJiYgIV9zdXBwb3J0c09wYWNpdHkgJiYgZXZbM10gPT09IDApIHsgLy9vbGRlciB2ZXJzaW9ucyBvZiBJRSBkb24ndCBzdXBwb3J0IHJnYmEoKSwgc28gaWYgdGhlIGRlc3RpbmF0aW9uIGFscGhhIGlzIDAsIGp1c3QgdXNlIFwidHJhbnNwYXJlbnRcIiBmb3IgdGhlIGVuZCBjb2xvclxuXHRcdFx0XHRcdFx0XHRwdFtcInhzXCIgKyBwdC5sXSArPSBwdC5sID8gXCIgdHJhbnNwYXJlbnRcIiA6IFwidHJhbnNwYXJlbnRcIjtcblx0XHRcdFx0XHRcdFx0cHQuZSA9IHB0LmUuc3BsaXQoZWFbaV0pLmpvaW4oXCJ0cmFuc3BhcmVudFwiKTtcblx0XHRcdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0XHRcdGlmICghX3N1cHBvcnRzT3BhY2l0eSkgeyAvL29sZCB2ZXJzaW9ucyBvZiBJRSBkb24ndCBzdXBwb3J0IHJnYmEoKS5cblx0XHRcdFx0XHRcdFx0XHRoYXNBbHBoYSA9IGZhbHNlO1xuXHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRcdGlmICh1c2VIU0wpIHtcblx0XHRcdFx0XHRcdFx0XHRwdC5hcHBlbmRYdHJhKChoYXNBbHBoYSA/IFwiaHNsYShcIiA6IFwiaHNsKFwiKSwgYnZbMF0sIF9wYXJzZUNoYW5nZShldlswXSwgYnZbMF0pLCBcIixcIiwgZmFsc2UsIHRydWUpXG5cdFx0XHRcdFx0XHRcdFx0XHQuYXBwZW5kWHRyYShcIlwiLCBidlsxXSwgX3BhcnNlQ2hhbmdlKGV2WzFdLCBidlsxXSksIFwiJSxcIiwgZmFsc2UpXG5cdFx0XHRcdFx0XHRcdFx0XHQuYXBwZW5kWHRyYShcIlwiLCBidlsyXSwgX3BhcnNlQ2hhbmdlKGV2WzJdLCBidlsyXSksIChoYXNBbHBoYSA/IFwiJSxcIiA6IFwiJVwiICsgc3RyKSwgZmFsc2UpO1xuXHRcdFx0XHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdFx0XHRcdHB0LmFwcGVuZFh0cmEoKGhhc0FscGhhID8gXCJyZ2JhKFwiIDogXCJyZ2IoXCIpLCBidlswXSwgZXZbMF0gLSBidlswXSwgXCIsXCIsIHRydWUsIHRydWUpXG5cdFx0XHRcdFx0XHRcdFx0XHQuYXBwZW5kWHRyYShcIlwiLCBidlsxXSwgZXZbMV0gLSBidlsxXSwgXCIsXCIsIHRydWUpXG5cdFx0XHRcdFx0XHRcdFx0XHQuYXBwZW5kWHRyYShcIlwiLCBidlsyXSwgZXZbMl0gLSBidlsyXSwgKGhhc0FscGhhID8gXCIsXCIgOiBzdHIpLCB0cnVlKTtcblx0XHRcdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0XHRcdGlmIChoYXNBbHBoYSkge1xuXHRcdFx0XHRcdFx0XHRcdGJ2ID0gKGJ2Lmxlbmd0aCA8IDQpID8gMSA6IGJ2WzNdO1xuXHRcdFx0XHRcdFx0XHRcdHB0LmFwcGVuZFh0cmEoXCJcIiwgYnYsICgoZXYubGVuZ3RoIDwgNCkgPyAxIDogZXZbM10pIC0gYnYsIHN0ciwgZmFsc2UpO1xuXHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRfY29sb3JFeHAubGFzdEluZGV4ID0gMDsgLy9vdGhlcndpc2UgdGhlIHRlc3QoKSBvbiB0aGUgUmVnRXhwIGNvdWxkIG1vdmUgdGhlIGxhc3RJbmRleCBhbmQgdGFpbnQgZnV0dXJlIHJlc3VsdHMuXG5cblx0XHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdFx0Ym51bXMgPSBidi5tYXRjaChfbnVtRXhwKTsgLy9nZXRzIGVhY2ggZ3JvdXAgb2YgbnVtYmVycyBpbiB0aGUgYmVnaW5uaW5nIHZhbHVlIHN0cmluZyBhbmQgZHJvcHMgdGhlbSBpbnRvIGFuIGFycmF5XG5cblx0XHRcdFx0XHRcdC8vaWYgbm8gbnVtYmVyIGlzIGZvdW5kLCB0cmVhdCBpdCBhcyBhIG5vbi10d2VlbmluZyB2YWx1ZSBhbmQganVzdCBhcHBlbmQgdGhlIHN0cmluZyB0byB0aGUgY3VycmVudCB4cy5cblx0XHRcdFx0XHRcdGlmICghYm51bXMpIHtcblx0XHRcdFx0XHRcdFx0cHRbXCJ4c1wiICsgcHQubF0gKz0gcHQubCA/IFwiIFwiICsgZXYgOiBldjtcblxuXHRcdFx0XHRcdFx0Ly9sb29wIHRocm91Z2ggYWxsIHRoZSBudW1iZXJzIHRoYXQgYXJlIGZvdW5kIGFuZCBjb25zdHJ1Y3QgdGhlIGV4dHJhIHZhbHVlcyBvbiB0aGUgcHQuXG5cdFx0XHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdFx0XHRlbnVtcyA9IGV2Lm1hdGNoKF9yZWxOdW1FeHApOyAvL2dldCBlYWNoIGdyb3VwIG9mIG51bWJlcnMgaW4gdGhlIGVuZCB2YWx1ZSBzdHJpbmcgYW5kIGRyb3AgdGhlbSBpbnRvIGFuIGFycmF5LiBXZSBhbGxvdyByZWxhdGl2ZSB2YWx1ZXMgdG9vLCBsaWtlICs9NTAgb3IgLT0uNVxuXHRcdFx0XHRcdFx0XHRpZiAoIWVudW1zIHx8IGVudW1zLmxlbmd0aCAhPT0gYm51bXMubGVuZ3RoKSB7XG5cdFx0XHRcdFx0XHRcdFx0Ly9ERUJVRzogX2xvZyhcIm1pc21hdGNoZWQgZm9ybWF0dGluZyBkZXRlY3RlZCBvbiBcIiArIHAgKyBcIiAoXCIgKyBiICsgXCIgdnMgXCIgKyBlICsgXCIpXCIpO1xuXHRcdFx0XHRcdFx0XHRcdHJldHVybiBwdDtcblx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0XHRuaSA9IDA7XG5cdFx0XHRcdFx0XHRcdGZvciAoeGkgPSAwOyB4aSA8IGJudW1zLmxlbmd0aDsgeGkrKykge1xuXHRcdFx0XHRcdFx0XHRcdGN2ID0gYm51bXNbeGldO1xuXHRcdFx0XHRcdFx0XHRcdHRlbXAgPSBidi5pbmRleE9mKGN2LCBuaSk7XG5cdFx0XHRcdFx0XHRcdFx0cHQuYXBwZW5kWHRyYShidi5zdWJzdHIobmksIHRlbXAgLSBuaSksIE51bWJlcihjdiksIF9wYXJzZUNoYW5nZShlbnVtc1t4aV0sIGN2KSwgXCJcIiwgKGF1dG9Sb3VuZCAmJiBidi5zdWJzdHIodGVtcCArIGN2Lmxlbmd0aCwgMikgPT09IFwicHhcIiksICh4aSA9PT0gMCkpO1xuXHRcdFx0XHRcdFx0XHRcdG5pID0gdGVtcCArIGN2Lmxlbmd0aDtcblx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0XHRwdFtcInhzXCIgKyBwdC5sXSArPSBidi5zdWJzdHIobmkpO1xuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXHRcdFx0XHQvL2lmIHRoZXJlIGFyZSByZWxhdGl2ZSB2YWx1ZXMgKFwiKz1cIiBvciBcIi09XCIgcHJlZml4KSwgd2UgbmVlZCB0byBhZGp1c3QgdGhlIGVuZGluZyB2YWx1ZSB0byBlbGltaW5hdGUgdGhlIHByZWZpeGVzIGFuZCBjb21iaW5lIHRoZSB2YWx1ZXMgcHJvcGVybHkuXG5cdFx0XHRcdGlmIChlLmluZGV4T2YoXCI9XCIpICE9PSAtMSkgaWYgKHB0LmRhdGEpIHtcblx0XHRcdFx0XHRzdHIgPSBwdC54czAgKyBwdC5kYXRhLnM7XG5cdFx0XHRcdFx0Zm9yIChpID0gMTsgaSA8IHB0Lmw7IGkrKykge1xuXHRcdFx0XHRcdFx0c3RyICs9IHB0W1wieHNcIiArIGldICsgcHQuZGF0YVtcInhuXCIgKyBpXTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0cHQuZSA9IHN0ciArIHB0W1wieHNcIiArIGldO1xuXHRcdFx0XHR9XG5cdFx0XHRcdGlmICghcHQubCkge1xuXHRcdFx0XHRcdHB0LnR5cGUgPSAtMTtcblx0XHRcdFx0XHRwdC54czAgPSBwdC5lO1xuXHRcdFx0XHR9XG5cdFx0XHRcdHJldHVybiBwdC54Zmlyc3QgfHwgcHQ7XG5cdFx0XHR9LFxuXHRcdFx0aSA9IDk7XG5cblxuXHRcdHAgPSBDU1NQcm9wVHdlZW4ucHJvdG90eXBlO1xuXHRcdHAubCA9IHAucHIgPSAwOyAvL2xlbmd0aCAobnVtYmVyIG9mIGV4dHJhIHByb3BlcnRpZXMgbGlrZSB4bjEsIHhuMiwgeG4zLCBldGMuXG5cdFx0d2hpbGUgKC0taSA+IDApIHtcblx0XHRcdHBbXCJ4blwiICsgaV0gPSAwO1xuXHRcdFx0cFtcInhzXCIgKyBpXSA9IFwiXCI7XG5cdFx0fVxuXHRcdHAueHMwID0gXCJcIjtcblx0XHRwLl9uZXh0ID0gcC5fcHJldiA9IHAueGZpcnN0ID0gcC5kYXRhID0gcC5wbHVnaW4gPSBwLnNldFJhdGlvID0gcC5yeHAgPSBudWxsO1xuXG5cblx0XHQvKipcblx0XHQgKiBBcHBlbmRzIGFuZCBleHRyYSB0d2VlbmluZyB2YWx1ZSB0byBhIENTU1Byb3BUd2VlbiBhbmQgYXV0b21hdGljYWxseSBtYW5hZ2VzIGFueSBwcmVmaXggYW5kIHN1ZmZpeCBzdHJpbmdzLiBUaGUgZmlyc3QgZXh0cmEgdmFsdWUgaXMgc3RvcmVkIGluIHRoZSBzIGFuZCBjIG9mIHRoZSBtYWluIENTU1Byb3BUd2VlbiBpbnN0YW5jZSwgYnV0IHRoZXJlYWZ0ZXIgYW55IGV4dHJhcyBhcmUgc3RvcmVkIGluIHRoZSB4bjEsIHhuMiwgeG4zLCBldGMuIFRoZSBwcmVmaXhlcyBhbmQgc3VmZml4ZXMgYXJlIHN0b3JlZCBpbiB0aGUgeHMwLCB4czEsIHhzMiwgZXRjLiBwcm9wZXJ0aWVzLiBGb3IgZXhhbXBsZSwgaWYgSSB3YWxrIHRocm91Z2ggYSBjbGlwIHZhbHVlIGxpa2UgXCJyZWN0KDEwcHgsIDVweCwgMHB4LCAyMHB4KVwiLCB0aGUgdmFsdWVzIHdvdWxkIGJlIHN0b3JlZCBsaWtlIHRoaXM6XG5cdFx0ICogeHMwOlwicmVjdChcIiwgczoxMCwgeHMxOlwicHgsIFwiLCB4bjE6NSwgeHMyOlwicHgsIFwiLCB4bjI6MCwgeHMzOlwicHgsIFwiLCB4bjM6MjAsIHhuNDpcInB4KVwiXG5cdFx0ICogQW5kIHRoZXknZCBhbGwgZ2V0IGpvaW5lZCB0b2dldGhlciB3aGVuIHRoZSBDU1NQbHVnaW4gcmVuZGVycyAoaW4gdGhlIHNldFJhdGlvKCkgbWV0aG9kKS5cblx0XHQgKiBAcGFyYW0ge3N0cmluZz19IHBmeCBQcmVmaXggKGlmIGFueSlcblx0XHQgKiBAcGFyYW0geyFudW1iZXJ9IHMgU3RhcnRpbmcgdmFsdWVcblx0XHQgKiBAcGFyYW0geyFudW1iZXJ9IGMgQ2hhbmdlIGluIG51bWVyaWMgdmFsdWUgb3ZlciB0aGUgY291cnNlIG9mIHRoZSBlbnRpcmUgdHdlZW4uIEZvciBleGFtcGxlLCBpZiB0aGUgc3RhcnQgaXMgNSBhbmQgdGhlIGVuZCBpcyAxMDAsIHRoZSBjaGFuZ2Ugd291bGQgYmUgOTUuXG5cdFx0ICogQHBhcmFtIHtzdHJpbmc9fSBzZnggU3VmZml4IChpZiBhbnkpXG5cdFx0ICogQHBhcmFtIHtib29sZWFuPX0gciBSb3VuZCAoaWYgdHJ1ZSkuXG5cdFx0ICogQHBhcmFtIHtib29sZWFuPX0gcGFkIElmIHRydWUsIHRoaXMgZXh0cmEgdmFsdWUgc2hvdWxkIGJlIHNlcGFyYXRlZCBieSB0aGUgcHJldmlvdXMgb25lIGJ5IGEgc3BhY2UuIElmIHRoZXJlIGlzIG5vIHByZXZpb3VzIGV4dHJhIGFuZCBwYWQgaXMgdHJ1ZSwgaXQgd2lsbCBhdXRvbWF0aWNhbGx5IGRyb3AgdGhlIHNwYWNlLlxuXHRcdCAqIEByZXR1cm4ge0NTU1Byb3BUd2Vlbn0gcmV0dXJucyBpdHNlbGYgc28gdGhhdCBtdWx0aXBsZSBtZXRob2RzIGNhbiBiZSBjaGFpbmVkIHRvZ2V0aGVyLlxuXHRcdCAqL1xuXHRcdHAuYXBwZW5kWHRyYSA9IGZ1bmN0aW9uKHBmeCwgcywgYywgc2Z4LCByLCBwYWQpIHtcblx0XHRcdHZhciBwdCA9IHRoaXMsXG5cdFx0XHRcdGwgPSBwdC5sO1xuXHRcdFx0cHRbXCJ4c1wiICsgbF0gKz0gKHBhZCAmJiBsKSA/IFwiIFwiICsgcGZ4IDogcGZ4IHx8IFwiXCI7XG5cdFx0XHRpZiAoIWMpIGlmIChsICE9PSAwICYmICFwdC5wbHVnaW4pIHsgLy90eXBpY2FsbHkgd2UnbGwgY29tYmluZSBub24tY2hhbmdpbmcgdmFsdWVzIHJpZ2h0IGludG8gdGhlIHhzIHRvIG9wdGltaXplIHBlcmZvcm1hbmNlLCBidXQgd2UgZG9uJ3QgY29tYmluZSB0aGVtIHdoZW4gdGhlcmUncyBhIHBsdWdpbiB0aGF0IHdpbGwgYmUgdHdlZW5pbmcgdGhlIHZhbHVlcyBiZWNhdXNlIGl0IG1heSBkZXBlbmQgb24gdGhlIHZhbHVlcyBiZWluZyBzcGxpdCBhcGFydCwgbGlrZSBmb3IgYSBiZXppZXIsIGlmIGEgdmFsdWUgZG9lc24ndCBjaGFuZ2UgYmV0d2VlbiB0aGUgZmlyc3QgYW5kIHNlY29uZCBpdGVyYXRpb24gYnV0IHRoZW4gaXQgZG9lcyBvbiB0aGUgM3JkLCB3ZSdsbCBydW4gaW50byB0cm91YmxlIGJlY2F1c2UgdGhlcmUncyBubyB4biBzbG90IGZvciB0aGF0IHZhbHVlIVxuXHRcdFx0XHRwdFtcInhzXCIgKyBsXSArPSBzICsgKHNmeCB8fCBcIlwiKTtcblx0XHRcdFx0cmV0dXJuIHB0O1xuXHRcdFx0fVxuXHRcdFx0cHQubCsrO1xuXHRcdFx0cHQudHlwZSA9IHB0LnNldFJhdGlvID8gMiA6IDE7XG5cdFx0XHRwdFtcInhzXCIgKyBwdC5sXSA9IHNmeCB8fCBcIlwiO1xuXHRcdFx0aWYgKGwgPiAwKSB7XG5cdFx0XHRcdHB0LmRhdGFbXCJ4blwiICsgbF0gPSBzICsgYztcblx0XHRcdFx0cHQucnhwW1wieG5cIiArIGxdID0gcjsgLy9yb3VuZCBleHRyYSBwcm9wZXJ0eSAod2UgbmVlZCB0byB0YXAgaW50byB0aGlzIGluIHRoZSBfcGFyc2VUb1Byb3h5KCkgbWV0aG9kKVxuXHRcdFx0XHRwdFtcInhuXCIgKyBsXSA9IHM7XG5cdFx0XHRcdGlmICghcHQucGx1Z2luKSB7XG5cdFx0XHRcdFx0cHQueGZpcnN0ID0gbmV3IENTU1Byb3BUd2VlbihwdCwgXCJ4blwiICsgbCwgcywgYywgcHQueGZpcnN0IHx8IHB0LCAwLCBwdC5uLCByLCBwdC5wcik7XG5cdFx0XHRcdFx0cHQueGZpcnN0LnhzMCA9IDA7IC8vanVzdCB0byBlbnN1cmUgdGhhdCB0aGUgcHJvcGVydHkgc3RheXMgbnVtZXJpYyB3aGljaCBoZWxwcyBtb2Rlcm4gYnJvd3NlcnMgc3BlZWQgdXAgcHJvY2Vzc2luZy4gUmVtZW1iZXIsIGluIHRoZSBzZXRSYXRpbygpIG1ldGhvZCwgd2UgZG8gcHQudFtwdC5wXSA9IHZhbCArIHB0LnhzMCBzbyBpZiBwdC54czAgaXMgXCJcIiAodGhlIGRlZmF1bHQpLCBpdCdsbCBjYXN0IHRoZSBlbmQgdmFsdWUgYXMgYSBzdHJpbmcuIFdoZW4gYSBwcm9wZXJ0eSBpcyBhIG51bWJlciBzb21ldGltZXMgYW5kIGEgc3RyaW5nIHNvbWV0aW1lcywgaXQgcHJldmVudHMgdGhlIGNvbXBpbGVyIGZyb20gbG9ja2luZyBpbiB0aGUgZGF0YSB0eXBlLCBzbG93aW5nIHRoaW5ncyBkb3duIHNsaWdodGx5LlxuXHRcdFx0XHR9XG5cdFx0XHRcdHJldHVybiBwdDtcblx0XHRcdH1cblx0XHRcdHB0LmRhdGEgPSB7czpzICsgY307XG5cdFx0XHRwdC5yeHAgPSB7fTtcblx0XHRcdHB0LnMgPSBzO1xuXHRcdFx0cHQuYyA9IGM7XG5cdFx0XHRwdC5yID0gcjtcblx0XHRcdHJldHVybiBwdDtcblx0XHR9O1xuXG5cdFx0LyoqXG5cdFx0ICogQGNvbnN0cnVjdG9yIEEgU3BlY2lhbFByb3AgaXMgYmFzaWNhbGx5IGEgY3NzIHByb3BlcnR5IHRoYXQgbmVlZHMgdG8gYmUgdHJlYXRlZCBpbiBhIG5vbi1zdGFuZGFyZCB3YXksIGxpa2UgaWYgaXQgbWF5IGNvbnRhaW4gYSBjb21wbGV4IHZhbHVlIGxpa2UgYm94U2hhZG93OlwiNXB4IDEwcHggMTVweCByZ2IoMjU1LCAxMDIsIDUxKVwiIG9yIGlmIGl0IGlzIGFzc29jaWF0ZWQgd2l0aCBhbm90aGVyIHBsdWdpbiBsaWtlIFRocm93UHJvcHNQbHVnaW4gb3IgQmV6aWVyUGx1Z2luLiBFdmVyeSBTcGVjaWFsUHJvcCBpcyBhc3NvY2lhdGVkIHdpdGggYSBwYXJ0aWN1bGFyIHByb3BlcnR5IG5hbWUgbGlrZSBcImJveFNoYWRvd1wiIG9yIFwidGhyb3dQcm9wc1wiIG9yIFwiYmV6aWVyXCIgYW5kIGl0IHdpbGwgaW50ZXJjZXB0IHRob3NlIHZhbHVlcyBpbiB0aGUgdmFycyBvYmplY3QgdGhhdCdzIHBhc3NlZCB0byB0aGUgQ1NTUGx1Z2luIGFuZCBoYW5kbGUgdGhlbSBhY2NvcmRpbmdseS5cblx0XHQgKiBAcGFyYW0geyFzdHJpbmd9IHAgUHJvcGVydHkgbmFtZSAobGlrZSBcImJveFNoYWRvd1wiIG9yIFwidGhyb3dQcm9wc1wiKVxuXHRcdCAqIEBwYXJhbSB7T2JqZWN0PX0gb3B0aW9ucyBBbiBvYmplY3QgY29udGFpbmluZyBhbnkgb2YgdGhlIGZvbGxvd2luZyBjb25maWd1cmF0aW9uIG9wdGlvbnM6XG5cdFx0ICogICAgICAgICAgICAgICAgICAgICAgLSBkZWZhdWx0VmFsdWU6IHRoZSBkZWZhdWx0IHZhbHVlXG5cdFx0ICogICAgICAgICAgICAgICAgICAgICAgLSBwYXJzZXI6IEEgZnVuY3Rpb24gdGhhdCBzaG91bGQgYmUgY2FsbGVkIHdoZW4gdGhlIGFzc29jaWF0ZWQgcHJvcGVydHkgbmFtZSBpcyBmb3VuZCBpbiB0aGUgdmFycy4gVGhpcyBmdW5jdGlvbiBzaG91bGQgcmV0dXJuIGEgQ1NTUHJvcFR3ZWVuIGluc3RhbmNlIGFuZCBpdCBzaG91bGQgZW5zdXJlIHRoYXQgaXQgaXMgcHJvcGVybHkgaW5zZXJ0ZWQgaW50byB0aGUgbGlua2VkIGxpc3QuIEl0IHdpbGwgcmVjZWl2ZSA0IHBhcmFtdGVyczogMSkgVGhlIHRhcmdldCwgMikgVGhlIHZhbHVlIGRlZmluZWQgaW4gdGhlIHZhcnMsIDMpIFRoZSBDU1NQbHVnaW4gaW5zdGFuY2UgKHdob3NlIF9maXJzdFBUIHNob3VsZCBiZSB1c2VkIGZvciB0aGUgbGlua2VkIGxpc3QpLCBhbmQgNCkgQSBjb21wdXRlZCBzdHlsZSBvYmplY3QgaWYgb25lIHdhcyBjYWxjdWxhdGVkICh0aGlzIGlzIGEgc3BlZWQgb3B0aW1pemF0aW9uIHRoYXQgYWxsb3dzIHJldHJpZXZhbCBvZiBzdGFydGluZyB2YWx1ZXMgcXVpY2tlcilcblx0XHQgKiAgICAgICAgICAgICAgICAgICAgICAtIGZvcm1hdHRlcjogYSBmdW5jdGlvbiB0aGF0IGZvcm1hdHMgYW55IHZhbHVlIHJlY2VpdmVkIGZvciB0aGlzIHNwZWNpYWwgcHJvcGVydHkgKGZvciBleGFtcGxlLCBib3hTaGFkb3cgY291bGQgdGFrZSBcIjVweCA1cHggcmVkXCIgYW5kIGZvcm1hdCBpdCB0byBcIjVweCA1cHggMHB4IDBweCByZWRcIiBzbyB0aGF0IGJvdGggdGhlIGJlZ2lubmluZyBhbmQgZW5kaW5nIHZhbHVlcyBoYXZlIGEgY29tbW9uIG9yZGVyIGFuZCBxdWFudGl0eSBvZiB2YWx1ZXMuKVxuXHRcdCAqICAgICAgICAgICAgICAgICAgICAgIC0gcHJlZml4OiBpZiB0cnVlLCB3ZSdsbCBkZXRlcm1pbmUgd2hldGhlciBvciBub3QgdGhpcyBwcm9wZXJ0eSByZXF1aXJlcyBhIHZlbmRvciBwcmVmaXggKGxpa2UgV2Via2l0IG9yIE1veiBvciBtcyBvciBPKVxuXHRcdCAqICAgICAgICAgICAgICAgICAgICAgIC0gY29sb3I6IHNldCB0aGlzIHRvIHRydWUgaWYgdGhlIHZhbHVlIGZvciB0aGlzIFNwZWNpYWxQcm9wIG1heSBjb250YWluIGNvbG9yLXJlbGF0ZWQgdmFsdWVzIGxpa2UgcmdiKCksIHJnYmEoKSwgZXRjLlxuXHRcdCAqICAgICAgICAgICAgICAgICAgICAgIC0gcHJpb3JpdHk6IHByaW9yaXR5IGluIHRoZSBsaW5rZWQgbGlzdCBvcmRlci4gSGlnaGVyIHByaW9yaXR5IFNwZWNpYWxQcm9wcyB3aWxsIGJlIHVwZGF0ZWQgYmVmb3JlIGxvd2VyIHByaW9yaXR5IG9uZXMuIFRoZSBkZWZhdWx0IHByaW9yaXR5IGlzIDAuXG5cdFx0ICogICAgICAgICAgICAgICAgICAgICAgLSBtdWx0aTogaWYgdHJ1ZSwgdGhlIGZvcm1hdHRlciBzaG91bGQgYWNjb21tb2RhdGUgYSBjb21tYS1kZWxpbWl0ZWQgbGlzdCBvZiB2YWx1ZXMsIGxpa2UgYm94U2hhZG93IGNvdWxkIGhhdmUgbXVsdGlwbGUgYm94U2hhZG93cyBsaXN0ZWQgb3V0LlxuXHRcdCAqICAgICAgICAgICAgICAgICAgICAgIC0gY29sbGFwc2libGU6IGlmIHRydWUsIHRoZSBmb3JtYXR0ZXIgc2hvdWxkIHRyZWF0IHRoZSB2YWx1ZSBsaWtlIGl0J3MgYSB0b3AvcmlnaHQvYm90dG9tL2xlZnQgdmFsdWUgdGhhdCBjb3VsZCBiZSBjb2xsYXBzZWQsIGxpa2UgXCI1cHhcIiB3b3VsZCBhcHBseSB0byBhbGwsIFwiNXB4LCAxMHB4XCIgd291bGQgdXNlIDVweCBmb3IgdG9wL2JvdHRvbSBhbmQgMTBweCBmb3IgcmlnaHQvbGVmdCwgZXRjLlxuXHRcdCAqICAgICAgICAgICAgICAgICAgICAgIC0ga2V5d29yZDogYSBzcGVjaWFsIGtleXdvcmQgdGhhdCBjYW4gW29wdGlvbmFsbHldIGJlIGZvdW5kIGluc2lkZSB0aGUgdmFsdWUgKGxpa2UgXCJpbnNldFwiIGZvciBib3hTaGFkb3cpLiBUaGlzIGFsbG93cyB1cyB0byB2YWxpZGF0ZSBiZWdpbm5pbmcvZW5kaW5nIHZhbHVlcyB0byBtYWtlIHN1cmUgdGhleSBtYXRjaCAoaWYgdGhlIGtleXdvcmQgaXMgZm91bmQgaW4gb25lLCBpdCdsbCBiZSBhZGRlZCB0byB0aGUgb3RoZXIgZm9yIGNvbnNpc3RlbmN5IGJ5IGRlZmF1bHQpLlxuXHRcdCAqL1xuXHRcdHZhciBTcGVjaWFsUHJvcCA9IGZ1bmN0aW9uKHAsIG9wdGlvbnMpIHtcblx0XHRcdFx0b3B0aW9ucyA9IG9wdGlvbnMgfHwge307XG5cdFx0XHRcdHRoaXMucCA9IG9wdGlvbnMucHJlZml4ID8gX2NoZWNrUHJvcFByZWZpeChwKSB8fCBwIDogcDtcblx0XHRcdFx0X3NwZWNpYWxQcm9wc1twXSA9IF9zcGVjaWFsUHJvcHNbdGhpcy5wXSA9IHRoaXM7XG5cdFx0XHRcdHRoaXMuZm9ybWF0ID0gb3B0aW9ucy5mb3JtYXR0ZXIgfHwgX2dldEZvcm1hdHRlcihvcHRpb25zLmRlZmF1bHRWYWx1ZSwgb3B0aW9ucy5jb2xvciwgb3B0aW9ucy5jb2xsYXBzaWJsZSwgb3B0aW9ucy5tdWx0aSk7XG5cdFx0XHRcdGlmIChvcHRpb25zLnBhcnNlcikge1xuXHRcdFx0XHRcdHRoaXMucGFyc2UgPSBvcHRpb25zLnBhcnNlcjtcblx0XHRcdFx0fVxuXHRcdFx0XHR0aGlzLmNscnMgPSBvcHRpb25zLmNvbG9yO1xuXHRcdFx0XHR0aGlzLm11bHRpID0gb3B0aW9ucy5tdWx0aTtcblx0XHRcdFx0dGhpcy5rZXl3b3JkID0gb3B0aW9ucy5rZXl3b3JkO1xuXHRcdFx0XHR0aGlzLmRmbHQgPSBvcHRpb25zLmRlZmF1bHRWYWx1ZTtcblx0XHRcdFx0dGhpcy5wciA9IG9wdGlvbnMucHJpb3JpdHkgfHwgMDtcblx0XHRcdH0sXG5cblx0XHRcdC8vc2hvcnRjdXQgZm9yIGNyZWF0aW5nIGEgbmV3IFNwZWNpYWxQcm9wIHRoYXQgY2FuIGFjY2VwdCBtdWx0aXBsZSBwcm9wZXJ0aWVzIGFzIGEgY29tbWEtZGVsaW1pdGVkIGxpc3QgKGhlbHBzIG1pbmlmaWNhdGlvbikuIGRmbHQgY2FuIGJlIGFuIGFycmF5IGZvciBtdWx0aXBsZSB2YWx1ZXMgKHdlIGRvbid0IGRvIGEgY29tbWEtZGVsaW1pdGVkIGxpc3QgYmVjYXVzZSB0aGUgZGVmYXVsdCB2YWx1ZSBtYXkgY29udGFpbiBjb21tYXMsIGxpa2UgcmVjdCgwcHgsMHB4LDBweCwwcHgpKS4gV2UgYXR0YWNoIHRoaXMgbWV0aG9kIHRvIHRoZSBTcGVjaWFsUHJvcCBjbGFzcy9vYmplY3QgaW5zdGVhZCBvZiB1c2luZyBhIHByaXZhdGUgX2NyZWF0ZVNwZWNpYWxQcm9wKCkgbWV0aG9kIHNvIHRoYXQgd2UgY2FuIHRhcCBpbnRvIGl0IGV4dGVybmFsbHkgaWYgbmVjZXNzYXJ5LCBsaWtlIGZyb20gYW5vdGhlciBwbHVnaW4uXG5cdFx0XHRfcmVnaXN0ZXJDb21wbGV4U3BlY2lhbFByb3AgPSBfaW50ZXJuYWxzLl9yZWdpc3RlckNvbXBsZXhTcGVjaWFsUHJvcCA9IGZ1bmN0aW9uKHAsIG9wdGlvbnMsIGRlZmF1bHRzKSB7XG5cdFx0XHRcdGlmICh0eXBlb2Yob3B0aW9ucykgIT09IFwib2JqZWN0XCIpIHtcblx0XHRcdFx0XHRvcHRpb25zID0ge3BhcnNlcjpkZWZhdWx0c307IC8vdG8gbWFrZSBiYWNrd2FyZHMgY29tcGF0aWJsZSB3aXRoIG9sZGVyIHZlcnNpb25zIG9mIEJlemllclBsdWdpbiBhbmQgVGhyb3dQcm9wc1BsdWdpblxuXHRcdFx0XHR9XG5cdFx0XHRcdHZhciBhID0gcC5zcGxpdChcIixcIiksXG5cdFx0XHRcdFx0ZCA9IG9wdGlvbnMuZGVmYXVsdFZhbHVlLFxuXHRcdFx0XHRcdGksIHRlbXA7XG5cdFx0XHRcdGRlZmF1bHRzID0gZGVmYXVsdHMgfHwgW2RdO1xuXHRcdFx0XHRmb3IgKGkgPSAwOyBpIDwgYS5sZW5ndGg7IGkrKykge1xuXHRcdFx0XHRcdG9wdGlvbnMucHJlZml4ID0gKGkgPT09IDAgJiYgb3B0aW9ucy5wcmVmaXgpO1xuXHRcdFx0XHRcdG9wdGlvbnMuZGVmYXVsdFZhbHVlID0gZGVmYXVsdHNbaV0gfHwgZDtcblx0XHRcdFx0XHR0ZW1wID0gbmV3IFNwZWNpYWxQcm9wKGFbaV0sIG9wdGlvbnMpO1xuXHRcdFx0XHR9XG5cdFx0XHR9LFxuXG5cdFx0XHQvL2NyZWF0ZXMgYSBwbGFjZWhvbGRlciBzcGVjaWFsIHByb3AgZm9yIGEgcGx1Z2luIHNvIHRoYXQgdGhlIHByb3BlcnR5IGdldHMgY2F1Z2h0IHRoZSBmaXJzdCB0aW1lIGEgdHdlZW4gb2YgaXQgaXMgYXR0ZW1wdGVkLCBhbmQgYXQgdGhhdCB0aW1lIGl0IG1ha2VzIHRoZSBwbHVnaW4gcmVnaXN0ZXIgaXRzZWxmLCB0aHVzIHRha2luZyBvdmVyIGZvciBhbGwgZnV0dXJlIHR3ZWVucyBvZiB0aGF0IHByb3BlcnR5LiBUaGlzIGFsbG93cyB1cyB0byBub3QgbWFuZGF0ZSB0aGF0IHRoaW5ncyBsb2FkIGluIGEgcGFydGljdWxhciBvcmRlciBhbmQgaXQgYWxzbyBhbGxvd3MgdXMgdG8gbG9nKCkgYW4gZXJyb3IgdGhhdCBpbmZvcm1zIHRoZSB1c2VyIHdoZW4gdGhleSBhdHRlbXB0IHRvIHR3ZWVuIGFuIGV4dGVybmFsIHBsdWdpbi1yZWxhdGVkIHByb3BlcnR5IHdpdGhvdXQgbG9hZGluZyBpdHMgLmpzIGZpbGUuXG5cdFx0XHRfcmVnaXN0ZXJQbHVnaW5Qcm9wID0gZnVuY3Rpb24ocCkge1xuXHRcdFx0XHRpZiAoIV9zcGVjaWFsUHJvcHNbcF0pIHtcblx0XHRcdFx0XHR2YXIgcGx1Z2luTmFtZSA9IHAuY2hhckF0KDApLnRvVXBwZXJDYXNlKCkgKyBwLnN1YnN0cigxKSArIFwiUGx1Z2luXCI7XG5cdFx0XHRcdFx0X3JlZ2lzdGVyQ29tcGxleFNwZWNpYWxQcm9wKHAsIHtwYXJzZXI6ZnVuY3Rpb24odCwgZSwgcCwgY3NzcCwgcHQsIHBsdWdpbiwgdmFycykge1xuXHRcdFx0XHRcdFx0dmFyIHBsdWdpbkNsYXNzID0gX2dsb2JhbHMuY29tLmdyZWVuc29jay5wbHVnaW5zW3BsdWdpbk5hbWVdO1xuXHRcdFx0XHRcdFx0aWYgKCFwbHVnaW5DbGFzcykge1xuXHRcdFx0XHRcdFx0XHRfbG9nKFwiRXJyb3I6IFwiICsgcGx1Z2luTmFtZSArIFwiIGpzIGZpbGUgbm90IGxvYWRlZC5cIik7XG5cdFx0XHRcdFx0XHRcdHJldHVybiBwdDtcblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdHBsdWdpbkNsYXNzLl9jc3NSZWdpc3RlcigpO1xuXHRcdFx0XHRcdFx0cmV0dXJuIF9zcGVjaWFsUHJvcHNbcF0ucGFyc2UodCwgZSwgcCwgY3NzcCwgcHQsIHBsdWdpbiwgdmFycyk7XG5cdFx0XHRcdFx0fX0pO1xuXHRcdFx0XHR9XG5cdFx0XHR9O1xuXG5cblx0XHRwID0gU3BlY2lhbFByb3AucHJvdG90eXBlO1xuXG5cdFx0LyoqXG5cdFx0ICogQWxpYXMgZm9yIF9wYXJzZUNvbXBsZXgoKSB0aGF0IGF1dG9tYXRpY2FsbHkgcGx1Z3MgaW4gY2VydGFpbiB2YWx1ZXMgZm9yIHRoaXMgU3BlY2lhbFByb3AsIGxpa2UgaXRzIHByb3BlcnR5IG5hbWUsIHdoZXRoZXIgb3Igbm90IGNvbG9ycyBzaG91bGQgYmUgc2Vuc2VkLCB0aGUgZGVmYXVsdCB2YWx1ZSwgYW5kIHByaW9yaXR5LiBJdCBhbHNvIGxvb2tzIGZvciBhbnkga2V5d29yZCB0aGF0IHRoZSBTcGVjaWFsUHJvcCBkZWZpbmVzIChsaWtlIFwiaW5zZXRcIiBmb3IgYm94U2hhZG93KSBhbmQgZW5zdXJlcyB0aGF0IHRoZSBiZWdpbm5pbmcgYW5kIGVuZGluZyB2YWx1ZXMgaGF2ZSB0aGUgc2FtZSBudW1iZXIgb2YgdmFsdWVzIGZvciBTcGVjaWFsUHJvcHMgd2hlcmUgbXVsdGkgaXMgdHJ1ZSAobGlrZSBib3hTaGFkb3cgYW5kIHRleHRTaGFkb3cgY2FuIGhhdmUgYSBjb21tYS1kZWxpbWl0ZWQgbGlzdClcblx0XHQgKiBAcGFyYW0geyFPYmplY3R9IHQgdGFyZ2V0IGVsZW1lbnRcblx0XHQgKiBAcGFyYW0geyhzdHJpbmd8bnVtYmVyfG9iamVjdCl9IGIgYmVnaW5uaW5nIHZhbHVlXG5cdFx0ICogQHBhcmFtIHsoc3RyaW5nfG51bWJlcnxvYmplY3QpfSBlIGVuZGluZyAoZGVzdGluYXRpb24pIHZhbHVlXG5cdFx0ICogQHBhcmFtIHtDU1NQcm9wVHdlZW49fSBwdCBuZXh0IENTU1Byb3BUd2VlbiBpbiB0aGUgbGlua2VkIGxpc3Rcblx0XHQgKiBAcGFyYW0ge1R3ZWVuUGx1Z2luPX0gcGx1Z2luIElmIGFub3RoZXIgcGx1Z2luIHdpbGwgYmUgdHdlZW5pbmcgdGhlIGNvbXBsZXggdmFsdWUsIHRoYXQgVHdlZW5QbHVnaW4gaW5zdGFuY2UgZ29lcyBoZXJlLlxuXHRcdCAqIEBwYXJhbSB7ZnVuY3Rpb249fSBzZXRSYXRpbyBJZiBhIGN1c3RvbSBzZXRSYXRpbygpIG1ldGhvZCBzaG91bGQgYmUgdXNlZCB0byBoYW5kbGUgdGhpcyBjb21wbGV4IHZhbHVlLCB0aGF0IGdvZXMgaGVyZS5cblx0XHQgKiBAcmV0dXJuIHtDU1NQcm9wVHdlZW49fSBGaXJzdCBDU1NQcm9wVHdlZW4gaW4gdGhlIGxpbmtlZCBsaXN0XG5cdFx0ICovXG5cdFx0cC5wYXJzZUNvbXBsZXggPSBmdW5jdGlvbih0LCBiLCBlLCBwdCwgcGx1Z2luLCBzZXRSYXRpbykge1xuXHRcdFx0dmFyIGt3ZCA9IHRoaXMua2V5d29yZCxcblx0XHRcdFx0aSwgYmEsIGVhLCBsLCBiaSwgZWk7XG5cdFx0XHQvL2lmIHRoaXMgU3BlY2lhbFByb3AncyB2YWx1ZSBjYW4gY29udGFpbiBhIGNvbW1hLWRlbGltaXRlZCBsaXN0IG9mIHZhbHVlcyAobGlrZSBib3hTaGFkb3cgb3IgdGV4dFNoYWRvdyksIHdlIG11c3QgcGFyc2UgdGhlbSBpbiBhIHNwZWNpYWwgd2F5LCBhbmQgbG9vayBmb3IgYSBrZXl3b3JkIChsaWtlIFwiaW5zZXRcIiBmb3IgYm94U2hhZG93KSBhbmQgZW5zdXJlIHRoYXQgdGhlIGJlZ2lubmluZyBhbmQgZW5kaW5nIEJPVEggaGF2ZSBpdCBpZiB0aGUgZW5kIGRlZmluZXMgaXQgYXMgc3VjaC4gV2UgYWxzbyBtdXN0IGVuc3VyZSB0aGF0IHRoZXJlIGFyZSBhbiBlcXVhbCBudW1iZXIgb2YgdmFsdWVzIHNwZWNpZmllZCAod2UgY2FuJ3QgdHdlZW4gMSBib3hTaGFkb3cgdG8gMyBmb3IgZXhhbXBsZSlcblx0XHRcdGlmICh0aGlzLm11bHRpKSBpZiAoX2NvbW1hc091dHNpZGVQYXJlbkV4cC50ZXN0KGUpIHx8IF9jb21tYXNPdXRzaWRlUGFyZW5FeHAudGVzdChiKSkge1xuXHRcdFx0XHRiYSA9IGIucmVwbGFjZShfY29tbWFzT3V0c2lkZVBhcmVuRXhwLCBcInxcIikuc3BsaXQoXCJ8XCIpO1xuXHRcdFx0XHRlYSA9IGUucmVwbGFjZShfY29tbWFzT3V0c2lkZVBhcmVuRXhwLCBcInxcIikuc3BsaXQoXCJ8XCIpO1xuXHRcdFx0fSBlbHNlIGlmIChrd2QpIHtcblx0XHRcdFx0YmEgPSBbYl07XG5cdFx0XHRcdGVhID0gW2VdO1xuXHRcdFx0fVxuXHRcdFx0aWYgKGVhKSB7XG5cdFx0XHRcdGwgPSAoZWEubGVuZ3RoID4gYmEubGVuZ3RoKSA/IGVhLmxlbmd0aCA6IGJhLmxlbmd0aDtcblx0XHRcdFx0Zm9yIChpID0gMDsgaSA8IGw7IGkrKykge1xuXHRcdFx0XHRcdGIgPSBiYVtpXSA9IGJhW2ldIHx8IHRoaXMuZGZsdDtcblx0XHRcdFx0XHRlID0gZWFbaV0gPSBlYVtpXSB8fCB0aGlzLmRmbHQ7XG5cdFx0XHRcdFx0aWYgKGt3ZCkge1xuXHRcdFx0XHRcdFx0YmkgPSBiLmluZGV4T2Yoa3dkKTtcblx0XHRcdFx0XHRcdGVpID0gZS5pbmRleE9mKGt3ZCk7XG5cdFx0XHRcdFx0XHRpZiAoYmkgIT09IGVpKSB7XG5cdFx0XHRcdFx0XHRcdGlmIChlaSA9PT0gLTEpIHsgLy9pZiB0aGUga2V5d29yZCBpc24ndCBpbiB0aGUgZW5kIHZhbHVlLCByZW1vdmUgaXQgZnJvbSB0aGUgYmVnaW5uaW5nIG9uZS5cblx0XHRcdFx0XHRcdFx0XHRiYVtpXSA9IGJhW2ldLnNwbGl0KGt3ZCkuam9pbihcIlwiKTtcblx0XHRcdFx0XHRcdFx0fSBlbHNlIGlmIChiaSA9PT0gLTEpIHsgLy9pZiB0aGUga2V5d29yZCBpc24ndCBpbiB0aGUgYmVnaW5uaW5nLCBhZGQgaXQuXG5cdFx0XHRcdFx0XHRcdFx0YmFbaV0gKz0gXCIgXCIgKyBrd2Q7XG5cdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblx0XHRcdFx0YiA9IGJhLmpvaW4oXCIsIFwiKTtcblx0XHRcdFx0ZSA9IGVhLmpvaW4oXCIsIFwiKTtcblx0XHRcdH1cblx0XHRcdHJldHVybiBfcGFyc2VDb21wbGV4KHQsIHRoaXMucCwgYiwgZSwgdGhpcy5jbHJzLCB0aGlzLmRmbHQsIHB0LCB0aGlzLnByLCBwbHVnaW4sIHNldFJhdGlvKTtcblx0XHR9O1xuXG5cdFx0LyoqXG5cdFx0ICogQWNjZXB0cyBhIHRhcmdldCBhbmQgZW5kIHZhbHVlIGFuZCBzcGl0cyBiYWNrIGEgQ1NTUHJvcFR3ZWVuIHRoYXQgaGFzIGJlZW4gaW5zZXJ0ZWQgaW50byB0aGUgQ1NTUGx1Z2luJ3MgbGlua2VkIGxpc3QgYW5kIGNvbmZvcm1zIHdpdGggYWxsIHRoZSBjb252ZW50aW9ucyB3ZSB1c2UgaW50ZXJuYWxseSwgbGlrZSB0eXBlOi0xLCAwLCAxLCBvciAyLCBzZXR0aW5nIHVwIGFueSBleHRyYSBwcm9wZXJ0eSB0d2VlbnMsIHByaW9yaXR5LCBldGMuIEZvciBleGFtcGxlLCBpZiB3ZSBoYXZlIGEgYm94U2hhZG93IFNwZWNpYWxQcm9wIGFuZCBjYWxsOlxuXHRcdCAqIHRoaXMuX2ZpcnN0UFQgPSBzcC5wYXJzZShlbGVtZW50LCBcIjVweCAxMHB4IDIwcHggcmdiKDI1NTAsMTAyLDUxKVwiLCBcImJveFNoYWRvd1wiLCB0aGlzKTtcblx0XHQgKiBJdCBzaG91bGQgZmlndXJlIG91dCB0aGUgc3RhcnRpbmcgdmFsdWUgb2YgdGhlIGVsZW1lbnQncyBib3hTaGFkb3csIGNvbXBhcmUgaXQgdG8gdGhlIHByb3ZpZGVkIGVuZCB2YWx1ZSBhbmQgY3JlYXRlIGFsbCB0aGUgbmVjZXNzYXJ5IENTU1Byb3BUd2VlbnMgb2YgdGhlIGFwcHJvcHJpYXRlIHR5cGVzIHRvIHR3ZWVuIHRoZSBib3hTaGFkb3cuIFRoZSBDU1NQcm9wVHdlZW4gdGhhdCBnZXRzIHNwaXQgYmFjayBzaG91bGQgYWxyZWFkeSBiZSBpbnNlcnRlZCBpbnRvIHRoZSBsaW5rZWQgbGlzdCAodGhlIDR0aCBwYXJhbWV0ZXIgaXMgdGhlIGN1cnJlbnQgaGVhZCwgc28gcHJlcGVuZCB0byB0aGF0KS5cblx0XHQgKiBAcGFyYW0geyFPYmplY3R9IHQgVGFyZ2V0IG9iamVjdCB3aG9zZSBwcm9wZXJ0eSBpcyBiZWluZyB0d2VlbmVkXG5cdFx0ICogQHBhcmFtIHtPYmplY3R9IGUgRW5kIHZhbHVlIGFzIHByb3ZpZGVkIGluIHRoZSB2YXJzIG9iamVjdCAodHlwaWNhbGx5IGEgc3RyaW5nLCBidXQgbm90IGFsd2F5cyAtIGxpa2UgYSB0aHJvd1Byb3BzIHdvdWxkIGJlIGFuIG9iamVjdCkuXG5cdFx0ICogQHBhcmFtIHshc3RyaW5nfSBwIFByb3BlcnR5IG5hbWVcblx0XHQgKiBAcGFyYW0geyFDU1NQbHVnaW59IGNzc3AgVGhlIENTU1BsdWdpbiBpbnN0YW5jZSB0aGF0IHNob3VsZCBiZSBhc3NvY2lhdGVkIHdpdGggdGhpcyB0d2Vlbi5cblx0XHQgKiBAcGFyYW0gez9DU1NQcm9wVHdlZW59IHB0IFRoZSBDU1NQcm9wVHdlZW4gdGhhdCBpcyB0aGUgY3VycmVudCBoZWFkIG9mIHRoZSBsaW5rZWQgbGlzdCAod2UnbGwgcHJlcGVuZCB0byBpdClcblx0XHQgKiBAcGFyYW0ge1R3ZWVuUGx1Z2luPX0gcGx1Z2luIElmIGEgcGx1Z2luIHdpbGwgYmUgdXNlZCB0byB0d2VlbiB0aGUgcGFyc2VkIHZhbHVlLCB0aGlzIGlzIHRoZSBwbHVnaW4gaW5zdGFuY2UuXG5cdFx0ICogQHBhcmFtIHtPYmplY3Q9fSB2YXJzIE9yaWdpbmFsIHZhcnMgb2JqZWN0IHRoYXQgY29udGFpbnMgdGhlIGRhdGEgZm9yIHBhcnNpbmcuXG5cdFx0ICogQHJldHVybiB7Q1NTUHJvcFR3ZWVufSBUaGUgZmlyc3QgQ1NTUHJvcFR3ZWVuIGluIHRoZSBsaW5rZWQgbGlzdCB3aGljaCBpbmNsdWRlcyB0aGUgbmV3IG9uZShzKSBhZGRlZCBieSB0aGUgcGFyc2UoKSBjYWxsLlxuXHRcdCAqL1xuXHRcdHAucGFyc2UgPSBmdW5jdGlvbih0LCBlLCBwLCBjc3NwLCBwdCwgcGx1Z2luLCB2YXJzKSB7XG5cdFx0XHRyZXR1cm4gdGhpcy5wYXJzZUNvbXBsZXgodC5zdHlsZSwgdGhpcy5mb3JtYXQoX2dldFN0eWxlKHQsIHRoaXMucCwgX2NzLCBmYWxzZSwgdGhpcy5kZmx0KSksIHRoaXMuZm9ybWF0KGUpLCBwdCwgcGx1Z2luKTtcblx0XHR9O1xuXG5cdFx0LyoqXG5cdFx0ICogUmVnaXN0ZXJzIGEgc3BlY2lhbCBwcm9wZXJ0eSB0aGF0IHNob3VsZCBiZSBpbnRlcmNlcHRlZCBmcm9tIGFueSBcImNzc1wiIG9iamVjdHMgZGVmaW5lZCBpbiB0d2VlbnMuIFRoaXMgYWxsb3dzIHlvdSB0byBoYW5kbGUgdGhlbSBob3dldmVyIHlvdSB3YW50IHdpdGhvdXQgQ1NTUGx1Z2luIGRvaW5nIGl0IGZvciB5b3UuIFRoZSAybmQgcGFyYW1ldGVyIHNob3VsZCBiZSBhIGZ1bmN0aW9uIHRoYXQgYWNjZXB0cyAzIHBhcmFtZXRlcnM6XG5cdFx0ICogIDEpIFRhcmdldCBvYmplY3Qgd2hvc2UgcHJvcGVydHkgc2hvdWxkIGJlIHR3ZWVuZWQgKHR5cGljYWxseSBhIERPTSBlbGVtZW50KVxuXHRcdCAqICAyKSBUaGUgZW5kL2Rlc3RpbmF0aW9uIHZhbHVlIChjb3VsZCBiZSBhIHN0cmluZywgbnVtYmVyLCBvYmplY3QsIG9yIHdoYXRldmVyIHlvdSB3YW50KVxuXHRcdCAqICAzKSBUaGUgdHdlZW4gaW5zdGFuY2UgKHlvdSBwcm9iYWJseSBkb24ndCBuZWVkIHRvIHdvcnJ5IGFib3V0IHRoaXMsIGJ1dCBpdCBjYW4gYmUgdXNlZnVsIGZvciBsb29raW5nIHVwIGluZm9ybWF0aW9uIGxpa2UgdGhlIGR1cmF0aW9uKVxuXHRcdCAqXG5cdFx0ICogVGhlbiwgeW91ciBmdW5jdGlvbiBzaG91bGQgcmV0dXJuIGEgZnVuY3Rpb24gd2hpY2ggd2lsbCBiZSBjYWxsZWQgZWFjaCB0aW1lIHRoZSB0d2VlbiBnZXRzIHJlbmRlcmVkLCBwYXNzaW5nIGEgbnVtZXJpYyBcInJhdGlvXCIgcGFyYW1ldGVyIHRvIHlvdXIgZnVuY3Rpb24gdGhhdCBpbmRpY2F0ZXMgdGhlIGNoYW5nZSBmYWN0b3IgKHVzdWFsbHkgYmV0d2VlbiAwIGFuZCAxKS4gRm9yIGV4YW1wbGU6XG5cdFx0ICpcblx0XHQgKiBDU1NQbHVnaW4ucmVnaXN0ZXJTcGVjaWFsUHJvcChcIm15Q3VzdG9tUHJvcFwiLCBmdW5jdGlvbih0YXJnZXQsIHZhbHVlLCB0d2Vlbikge1xuXHRcdCAqICAgICAgdmFyIHN0YXJ0ID0gdGFyZ2V0LnN0eWxlLndpZHRoO1xuXHRcdCAqICAgICAgcmV0dXJuIGZ1bmN0aW9uKHJhdGlvKSB7XG5cdFx0ICogICAgICAgICAgICAgIHRhcmdldC5zdHlsZS53aWR0aCA9IChzdGFydCArIHZhbHVlICogcmF0aW8pICsgXCJweFwiO1xuXHRcdCAqICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcInNldCB3aWR0aCB0byBcIiArIHRhcmdldC5zdHlsZS53aWR0aCk7XG5cdFx0ICogICAgICAgICAgfVxuXHRcdCAqIH0sIDApO1xuXHRcdCAqXG5cdFx0ICogVGhlbiwgd2hlbiBJIGRvIHRoaXMgdHdlZW4sIGl0IHdpbGwgdHJpZ2dlciBteSBzcGVjaWFsIHByb3BlcnR5OlxuXHRcdCAqXG5cdFx0ICogVHdlZW5MaXRlLnRvKGVsZW1lbnQsIDEsIHtjc3M6e215Q3VzdG9tUHJvcDoxMDB9fSk7XG5cdFx0ICpcblx0XHQgKiBJbiB0aGUgZXhhbXBsZSwgb2YgY291cnNlLCB3ZSdyZSBqdXN0IGNoYW5naW5nIHRoZSB3aWR0aCwgYnV0IHlvdSBjYW4gZG8gYW55dGhpbmcgeW91IHdhbnQuXG5cdFx0ICpcblx0XHQgKiBAcGFyYW0geyFzdHJpbmd9IG5hbWUgUHJvcGVydHkgbmFtZSAob3IgY29tbWEtZGVsaW1pdGVkIGxpc3Qgb2YgcHJvcGVydHkgbmFtZXMpIHRoYXQgc2hvdWxkIGJlIGludGVyY2VwdGVkIGFuZCBoYW5kbGVkIGJ5IHlvdXIgZnVuY3Rpb24uIEZvciBleGFtcGxlLCBpZiBJIGRlZmluZSBcIm15Q3VzdG9tUHJvcFwiLCB0aGVuIGl0IHdvdWxkIGhhbmRsZSB0aGF0IHBvcnRpb24gb2YgdGhlIGZvbGxvd2luZyB0d2VlbjogVHdlZW5MaXRlLnRvKGVsZW1lbnQsIDEsIHtjc3M6e215Q3VzdG9tUHJvcDoxMDB9fSlcblx0XHQgKiBAcGFyYW0geyFmdW5jdGlvbihPYmplY3QsIE9iamVjdCwgT2JqZWN0LCBzdHJpbmcpOmZ1bmN0aW9uKG51bWJlcil9IG9uSW5pdFR3ZWVuIFRoZSBmdW5jdGlvbiB0aGF0IHdpbGwgYmUgY2FsbGVkIHdoZW4gYSB0d2VlbiBvZiB0aGlzIHNwZWNpYWwgcHJvcGVydHkgaXMgcGVyZm9ybWVkLiBUaGUgZnVuY3Rpb24gd2lsbCByZWNlaXZlIDQgcGFyYW1ldGVyczogMSkgVGFyZ2V0IG9iamVjdCB0aGF0IHNob3VsZCBiZSB0d2VlbmVkLCAyKSBWYWx1ZSB0aGF0IHdhcyBwYXNzZWQgdG8gdGhlIHR3ZWVuLCAzKSBUaGUgdHdlZW4gaW5zdGFuY2UgaXRzZWxmIChyYXJlbHkgdXNlZCksIGFuZCA0KSBUaGUgcHJvcGVydHkgbmFtZSB0aGF0J3MgYmVpbmcgdHdlZW5lZC4gWW91ciBmdW5jdGlvbiBzaG91bGQgcmV0dXJuIGEgZnVuY3Rpb24gdGhhdCBzaG91bGQgYmUgY2FsbGVkIG9uIGV2ZXJ5IHVwZGF0ZSBvZiB0aGUgdHdlZW4uIFRoYXQgZnVuY3Rpb24gd2lsbCByZWNlaXZlIGEgc2luZ2xlIHBhcmFtZXRlciB0aGF0IGlzIGEgXCJjaGFuZ2UgZmFjdG9yXCIgdmFsdWUgKHR5cGljYWxseSBiZXR3ZWVuIDAgYW5kIDEpIGluZGljYXRpbmcgdGhlIGFtb3VudCBvZiBjaGFuZ2UgYXMgYSByYXRpby4gWW91IGNhbiB1c2UgdGhpcyB0byBkZXRlcm1pbmUgaG93IHRvIHNldCB0aGUgdmFsdWVzIGFwcHJvcHJpYXRlbHkgaW4geW91ciBmdW5jdGlvbi5cblx0XHQgKiBAcGFyYW0ge251bWJlcj19IHByaW9yaXR5IFByaW9yaXR5IHRoYXQgaGVscHMgdGhlIGVuZ2luZSBkZXRlcm1pbmUgdGhlIG9yZGVyIGluIHdoaWNoIHRvIHNldCB0aGUgcHJvcGVydGllcyAoZGVmYXVsdDogMCkuIEhpZ2hlciBwcmlvcml0eSBwcm9wZXJ0aWVzIHdpbGwgYmUgdXBkYXRlZCBiZWZvcmUgbG93ZXIgcHJpb3JpdHkgb25lcy5cblx0XHQgKi9cblx0XHRDU1NQbHVnaW4ucmVnaXN0ZXJTcGVjaWFsUHJvcCA9IGZ1bmN0aW9uKG5hbWUsIG9uSW5pdFR3ZWVuLCBwcmlvcml0eSkge1xuXHRcdFx0X3JlZ2lzdGVyQ29tcGxleFNwZWNpYWxQcm9wKG5hbWUsIHtwYXJzZXI6ZnVuY3Rpb24odCwgZSwgcCwgY3NzcCwgcHQsIHBsdWdpbiwgdmFycykge1xuXHRcdFx0XHR2YXIgcnYgPSBuZXcgQ1NTUHJvcFR3ZWVuKHQsIHAsIDAsIDAsIHB0LCAyLCBwLCBmYWxzZSwgcHJpb3JpdHkpO1xuXHRcdFx0XHRydi5wbHVnaW4gPSBwbHVnaW47XG5cdFx0XHRcdHJ2LnNldFJhdGlvID0gb25Jbml0VHdlZW4odCwgZSwgY3NzcC5fdHdlZW4sIHApO1xuXHRcdFx0XHRyZXR1cm4gcnY7XG5cdFx0XHR9LCBwcmlvcml0eTpwcmlvcml0eX0pO1xuXHRcdH07XG5cblxuXG5cblxuXG5cdFx0Ly90cmFuc2Zvcm0tcmVsYXRlZCBtZXRob2RzIGFuZCBwcm9wZXJ0aWVzXG5cdFx0Q1NTUGx1Z2luLnVzZVNWR1RyYW5zZm9ybUF0dHIgPSBfaXNTYWZhcmkgfHwgX2lzRmlyZWZveDsgLy9TYWZhcmkgYW5kIEZpcmVmb3ggYm90aCBoYXZlIHNvbWUgcmVuZGVyaW5nIGJ1Z3Mgd2hlbiBhcHBseWluZyBDU1MgdHJhbnNmb3JtcyB0byBTVkcgZWxlbWVudHMsIHNvIGRlZmF1bHQgdG8gdXNpbmcgdGhlIFwidHJhbnNmb3JtXCIgYXR0cmlidXRlIGluc3RlYWQgKHVzZXJzIGNhbiBvdmVycmlkZSB0aGlzKS5cblx0XHR2YXIgX3RyYW5zZm9ybVByb3BzID0gKFwic2NhbGVYLHNjYWxlWSxzY2FsZVoseCx5LHosc2tld1gsc2tld1kscm90YXRpb24scm90YXRpb25YLHJvdGF0aW9uWSxwZXJzcGVjdGl2ZSx4UGVyY2VudCx5UGVyY2VudFwiKS5zcGxpdChcIixcIiksXG5cdFx0XHRfdHJhbnNmb3JtUHJvcCA9IF9jaGVja1Byb3BQcmVmaXgoXCJ0cmFuc2Zvcm1cIiksIC8vdGhlIEphdmFzY3JpcHQgKGNhbWVsQ2FzZSkgdHJhbnNmb3JtIHByb3BlcnR5LCBsaWtlIG1zVHJhbnNmb3JtLCBXZWJraXRUcmFuc2Zvcm0sIE1velRyYW5zZm9ybSwgb3IgT1RyYW5zZm9ybS5cblx0XHRcdF90cmFuc2Zvcm1Qcm9wQ1NTID0gX3ByZWZpeENTUyArIFwidHJhbnNmb3JtXCIsXG5cdFx0XHRfdHJhbnNmb3JtT3JpZ2luUHJvcCA9IF9jaGVja1Byb3BQcmVmaXgoXCJ0cmFuc2Zvcm1PcmlnaW5cIiksXG5cdFx0XHRfc3VwcG9ydHMzRCA9IChfY2hlY2tQcm9wUHJlZml4KFwicGVyc3BlY3RpdmVcIikgIT09IG51bGwpLFxuXHRcdFx0VHJhbnNmb3JtID0gX2ludGVybmFscy5UcmFuc2Zvcm0gPSBmdW5jdGlvbigpIHtcblx0XHRcdFx0dGhpcy5wZXJzcGVjdGl2ZSA9IHBhcnNlRmxvYXQoQ1NTUGx1Z2luLmRlZmF1bHRUcmFuc2Zvcm1QZXJzcGVjdGl2ZSkgfHwgMDtcblx0XHRcdFx0dGhpcy5mb3JjZTNEID0gKENTU1BsdWdpbi5kZWZhdWx0Rm9yY2UzRCA9PT0gZmFsc2UgfHwgIV9zdXBwb3J0czNEKSA/IGZhbHNlIDogQ1NTUGx1Z2luLmRlZmF1bHRGb3JjZTNEIHx8IFwiYXV0b1wiO1xuXHRcdFx0fSxcblx0XHRcdF9TVkdFbGVtZW50ID0gd2luZG93LlNWR0VsZW1lbnQsXG5cdFx0XHRfdXNlU1ZHVHJhbnNmb3JtQXR0cixcblx0XHRcdC8vU29tZSBicm93c2VycyAobGlrZSBGaXJlZm94IGFuZCBJRSkgZG9uJ3QgaG9ub3IgdHJhbnNmb3JtLW9yaWdpbiBwcm9wZXJseSBpbiBTVkcgZWxlbWVudHMsIHNvIHdlIG5lZWQgdG8gbWFudWFsbHkgYWRqdXN0IHRoZSBtYXRyaXggYWNjb3JkaW5nbHkuIFdlIGZlYXR1cmUgZGV0ZWN0IGhlcmUgcmF0aGVyIHRoYW4gYWx3YXlzIGRvaW5nIHRoZSBjb252ZXJzaW9uIGZvciBjZXJ0YWluIGJyb3dzZXJzIGJlY2F1c2UgdGhleSBtYXkgZml4IHRoZSBwcm9ibGVtIGF0IHNvbWUgcG9pbnQgaW4gdGhlIGZ1dHVyZS5cblxuXHRcdFx0X2NyZWF0ZVNWRyA9IGZ1bmN0aW9uKHR5cGUsIGNvbnRhaW5lciwgYXR0cmlidXRlcykge1xuXHRcdFx0XHR2YXIgZWxlbWVudCA9IF9kb2MuY3JlYXRlRWxlbWVudE5TKFwiaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmdcIiwgdHlwZSksXG5cdFx0XHRcdFx0cmVnID0gLyhbYS16XSkoW0EtWl0pL2csXG5cdFx0XHRcdFx0cDtcblx0XHRcdFx0Zm9yIChwIGluIGF0dHJpYnV0ZXMpIHtcblx0XHRcdFx0XHRlbGVtZW50LnNldEF0dHJpYnV0ZU5TKG51bGwsIHAucmVwbGFjZShyZWcsIFwiJDEtJDJcIikudG9Mb3dlckNhc2UoKSwgYXR0cmlidXRlc1twXSk7XG5cdFx0XHRcdH1cblx0XHRcdFx0Y29udGFpbmVyLmFwcGVuZENoaWxkKGVsZW1lbnQpO1xuXHRcdFx0XHRyZXR1cm4gZWxlbWVudDtcblx0XHRcdH0sXG5cdFx0XHRfZG9jRWxlbWVudCA9IF9kb2MuZG9jdW1lbnRFbGVtZW50LFxuXHRcdFx0X2ZvcmNlU1ZHVHJhbnNmb3JtQXR0ciA9IChmdW5jdGlvbigpIHtcblx0XHRcdFx0Ly9JRSBhbmQgQW5kcm9pZCBzdG9jayBkb24ndCBzdXBwb3J0IENTUyB0cmFuc2Zvcm1zIG9uIFNWRyBlbGVtZW50cywgc28gd2UgbXVzdCB3cml0ZSB0aGVtIHRvIHRoZSBcInRyYW5zZm9ybVwiIGF0dHJpYnV0ZS4gV2UgcG9wdWxhdGUgdGhpcyB2YXJpYWJsZSBpbiB0aGUgX3BhcnNlVHJhbnNmb3JtKCkgbWV0aG9kLCBhbmQgb25seSBpZi93aGVuIHdlIGNvbWUgYWNyb3NzIGFuIFNWRyBlbGVtZW50XG5cdFx0XHRcdHZhciBmb3JjZSA9IF9pZVZlcnMgfHwgKC9BbmRyb2lkL2kudGVzdChfYWdlbnQpICYmICF3aW5kb3cuY2hyb21lKSxcblx0XHRcdFx0XHRzdmcsIHJlY3QsIHdpZHRoO1xuXHRcdFx0XHRpZiAoX2RvYy5jcmVhdGVFbGVtZW50TlMgJiYgIWZvcmNlKSB7IC8vSUU4IGFuZCBlYXJsaWVyIGRvZXNuJ3Qgc3VwcG9ydCBTVkcgYW55d2F5XG5cdFx0XHRcdFx0c3ZnID0gX2NyZWF0ZVNWRyhcInN2Z1wiLCBfZG9jRWxlbWVudCk7XG5cdFx0XHRcdFx0cmVjdCA9IF9jcmVhdGVTVkcoXCJyZWN0XCIsIHN2Zywge3dpZHRoOjEwMCwgaGVpZ2h0OjUwLCB4OjEwMH0pO1xuXHRcdFx0XHRcdHdpZHRoID0gcmVjdC5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKS53aWR0aDtcblx0XHRcdFx0XHRyZWN0LnN0eWxlW190cmFuc2Zvcm1PcmlnaW5Qcm9wXSA9IFwiNTAlIDUwJVwiO1xuXHRcdFx0XHRcdHJlY3Quc3R5bGVbX3RyYW5zZm9ybVByb3BdID0gXCJzY2FsZVgoMC41KVwiO1xuXHRcdFx0XHRcdGZvcmNlID0gKHdpZHRoID09PSByZWN0LmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpLndpZHRoICYmICEoX2lzRmlyZWZveCAmJiBfc3VwcG9ydHMzRCkpOyAvL25vdGU6IEZpcmVmb3ggZmFpbHMgdGhlIHRlc3QgZXZlbiB0aG91Z2ggaXQgZG9lcyBzdXBwb3J0IENTUyB0cmFuc2Zvcm1zIGluIDNELiBTaW5jZSB3ZSBjYW4ndCBwdXNoIDNEIHN0dWZmIGludG8gdGhlIHRyYW5zZm9ybSBhdHRyaWJ1dGUsIHdlIGZvcmNlIEZpcmVmb3ggdG8gcGFzcyB0aGUgdGVzdCBoZXJlIChhcyBsb25nIGFzIGl0IGRvZXMgdHJ1bHkgc3VwcG9ydCAzRCkuXG5cdFx0XHRcdFx0X2RvY0VsZW1lbnQucmVtb3ZlQ2hpbGQoc3ZnKTtcblx0XHRcdFx0fVxuXHRcdFx0XHRyZXR1cm4gZm9yY2U7XG5cdFx0XHR9KSgpLFxuXHRcdFx0X3BhcnNlU1ZHT3JpZ2luID0gZnVuY3Rpb24oZSwgbG9jYWwsIGRlY29yYXRlZSwgYWJzb2x1dGUsIHNtb290aE9yaWdpbikge1xuXHRcdFx0XHR2YXIgdG0gPSBlLl9nc1RyYW5zZm9ybSxcblx0XHRcdFx0XHRtID0gX2dldE1hdHJpeChlLCB0cnVlKSxcblx0XHRcdFx0XHR2LCB4LCB5LCB4T3JpZ2luLCB5T3JpZ2luLCBhLCBiLCBjLCBkLCB0eCwgdHksIGRldGVybWluYW50LCB4T3JpZ2luT2xkLCB5T3JpZ2luT2xkO1xuXHRcdFx0XHRpZiAodG0pIHtcblx0XHRcdFx0XHR4T3JpZ2luT2xkID0gdG0ueE9yaWdpbjsgLy9yZWNvcmQgdGhlIG9yaWdpbmFsIHZhbHVlcyBiZWZvcmUgd2UgYWx0ZXIgdGhlbS5cblx0XHRcdFx0XHR5T3JpZ2luT2xkID0gdG0ueU9yaWdpbjtcblx0XHRcdFx0fVxuXHRcdFx0XHRpZiAoIWFic29sdXRlIHx8ICh2ID0gYWJzb2x1dGUuc3BsaXQoXCIgXCIpKS5sZW5ndGggPCAyKSB7XG5cdFx0XHRcdFx0YiA9IGUuZ2V0QkJveCgpO1xuXHRcdFx0XHRcdGxvY2FsID0gX3BhcnNlUG9zaXRpb24obG9jYWwpLnNwbGl0KFwiIFwiKTtcblx0XHRcdFx0XHR2ID0gWyhsb2NhbFswXS5pbmRleE9mKFwiJVwiKSAhPT0gLTEgPyBwYXJzZUZsb2F0KGxvY2FsWzBdKSAvIDEwMCAqIGIud2lkdGggOiBwYXJzZUZsb2F0KGxvY2FsWzBdKSkgKyBiLngsXG5cdFx0XHRcdFx0XHQgKGxvY2FsWzFdLmluZGV4T2YoXCIlXCIpICE9PSAtMSA/IHBhcnNlRmxvYXQobG9jYWxbMV0pIC8gMTAwICogYi5oZWlnaHQgOiBwYXJzZUZsb2F0KGxvY2FsWzFdKSkgKyBiLnldO1xuXHRcdFx0XHR9XG5cdFx0XHRcdGRlY29yYXRlZS54T3JpZ2luID0geE9yaWdpbiA9IHBhcnNlRmxvYXQodlswXSk7XG5cdFx0XHRcdGRlY29yYXRlZS55T3JpZ2luID0geU9yaWdpbiA9IHBhcnNlRmxvYXQodlsxXSk7XG5cdFx0XHRcdGlmIChhYnNvbHV0ZSAmJiBtICE9PSBfaWRlbnRpdHkyRE1hdHJpeCkgeyAvL2lmIHN2Z09yaWdpbiBpcyBiZWluZyBzZXQsIHdlIG11c3QgaW52ZXJ0IHRoZSBtYXRyaXggYW5kIGRldGVybWluZSB3aGVyZSB0aGUgYWJzb2x1dGUgcG9pbnQgaXMsIGZhY3RvcmluZyBpbiB0aGUgY3VycmVudCB0cmFuc2Zvcm1zLiBPdGhlcndpc2UsIHRoZSBzdmdPcmlnaW4gd291bGQgYmUgYmFzZWQgb24gdGhlIGVsZW1lbnQncyBub24tdHJhbnNmb3JtZWQgcG9zaXRpb24gb24gdGhlIGNhbnZhcy5cblx0XHRcdFx0XHRhID0gbVswXTtcblx0XHRcdFx0XHRiID0gbVsxXTtcblx0XHRcdFx0XHRjID0gbVsyXTtcblx0XHRcdFx0XHRkID0gbVszXTtcblx0XHRcdFx0XHR0eCA9IG1bNF07XG5cdFx0XHRcdFx0dHkgPSBtWzVdO1xuXHRcdFx0XHRcdGRldGVybWluYW50ID0gKGEgKiBkIC0gYiAqIGMpO1xuXHRcdFx0XHRcdHggPSB4T3JpZ2luICogKGQgLyBkZXRlcm1pbmFudCkgKyB5T3JpZ2luICogKC1jIC8gZGV0ZXJtaW5hbnQpICsgKChjICogdHkgLSBkICogdHgpIC8gZGV0ZXJtaW5hbnQpO1xuXHRcdFx0XHRcdHkgPSB4T3JpZ2luICogKC1iIC8gZGV0ZXJtaW5hbnQpICsgeU9yaWdpbiAqIChhIC8gZGV0ZXJtaW5hbnQpIC0gKChhICogdHkgLSBiICogdHgpIC8gZGV0ZXJtaW5hbnQpO1xuXHRcdFx0XHRcdHhPcmlnaW4gPSBkZWNvcmF0ZWUueE9yaWdpbiA9IHZbMF0gPSB4O1xuXHRcdFx0XHRcdHlPcmlnaW4gPSBkZWNvcmF0ZWUueU9yaWdpbiA9IHZbMV0gPSB5O1xuXHRcdFx0XHR9XG5cdFx0XHRcdGlmICh0bSkgeyAvL2F2b2lkIGp1bXAgd2hlbiB0cmFuc2Zvcm1PcmlnaW4gaXMgY2hhbmdlZCAtIGFkanVzdCB0aGUgeC95IHZhbHVlcyBhY2NvcmRpbmdseVxuXHRcdFx0XHRcdGlmIChzbW9vdGhPcmlnaW4gfHwgKHNtb290aE9yaWdpbiAhPT0gZmFsc2UgJiYgQ1NTUGx1Z2luLmRlZmF1bHRTbW9vdGhPcmlnaW4gIT09IGZhbHNlKSkge1xuXHRcdFx0XHRcdFx0eCA9IHhPcmlnaW4gLSB4T3JpZ2luT2xkO1xuXHRcdFx0XHRcdFx0eSA9IHlPcmlnaW4gLSB5T3JpZ2luT2xkO1xuXHRcdFx0XHRcdFx0Ly9vcmlnaW5hbGx5LCB3ZSBzaW1wbHkgYWRqdXN0ZWQgdGhlIHggYW5kIHkgdmFsdWVzLCBidXQgdGhhdCB3b3VsZCBjYXVzZSBwcm9ibGVtcyBpZiwgZm9yIGV4YW1wbGUsIHlvdSBjcmVhdGVkIGEgcm90YXRpb25hbCB0d2VlbiBwYXJ0LXdheSB0aHJvdWdoIGFuIHgveSB0d2Vlbi4gTWFuYWdpbmcgdGhlIG9mZnNldCBpbiBhIHNlcGFyYXRlIHZhcmlhYmxlIGdpdmVzIHVzIHVsdGltYXRlIGZsZXhpYmlsaXR5LlxuXHRcdFx0XHRcdFx0Ly90bS54IC09IHggLSAoeCAqIG1bMF0gKyB5ICogbVsyXSk7XG5cdFx0XHRcdFx0XHQvL3RtLnkgLT0geSAtICh4ICogbVsxXSArIHkgKiBtWzNdKTtcblx0XHRcdFx0XHRcdHRtLnhPZmZzZXQgKz0gKHggKiBtWzBdICsgeSAqIG1bMl0pIC0geDtcblx0XHRcdFx0XHRcdHRtLnlPZmZzZXQgKz0gKHggKiBtWzFdICsgeSAqIG1bM10pIC0geTtcblx0XHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdFx0dG0ueE9mZnNldCA9IHRtLnlPZmZzZXQgPSAwO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXHRcdFx0XHRlLnNldEF0dHJpYnV0ZShcImRhdGEtc3ZnLW9yaWdpblwiLCB2LmpvaW4oXCIgXCIpKTtcblx0XHRcdH0sXG5cdFx0XHRfaXNTVkcgPSBmdW5jdGlvbihlKSB7XG5cdFx0XHRcdHJldHVybiAhIShfU1ZHRWxlbWVudCAmJiB0eXBlb2YoZS5nZXRCQm94KSA9PT0gXCJmdW5jdGlvblwiICYmIGUuZ2V0Q1RNICYmICghZS5wYXJlbnROb2RlIHx8IChlLnBhcmVudE5vZGUuZ2V0QkJveCAmJiBlLnBhcmVudE5vZGUuZ2V0Q1RNKSkpO1xuXHRcdFx0fSxcblx0XHRcdF9pZGVudGl0eTJETWF0cml4ID0gWzEsMCwwLDEsMCwwXSxcblx0XHRcdF9nZXRNYXRyaXggPSBmdW5jdGlvbihlLCBmb3JjZTJEKSB7XG5cdFx0XHRcdHZhciB0bSA9IGUuX2dzVHJhbnNmb3JtIHx8IG5ldyBUcmFuc2Zvcm0oKSxcblx0XHRcdFx0XHRybmQgPSAxMDAwMDAsXG5cdFx0XHRcdFx0aXNEZWZhdWx0LCBzLCBtLCBuLCBkZWM7XG5cdFx0XHRcdGlmIChfdHJhbnNmb3JtUHJvcCkge1xuXHRcdFx0XHRcdHMgPSBfZ2V0U3R5bGUoZSwgX3RyYW5zZm9ybVByb3BDU1MsIG51bGwsIHRydWUpO1xuXHRcdFx0XHR9IGVsc2UgaWYgKGUuY3VycmVudFN0eWxlKSB7XG5cdFx0XHRcdFx0Ly9mb3Igb2xkZXIgdmVyc2lvbnMgb2YgSUUsIHdlIG5lZWQgdG8gaW50ZXJwcmV0IHRoZSBmaWx0ZXIgcG9ydGlvbiB0aGF0IGlzIGluIHRoZSBmb3JtYXQ6IHByb2dpZDpEWEltYWdlVHJhbnNmb3JtLk1pY3Jvc29mdC5NYXRyaXgoTTExPTYuMTIzMjMzOTk1NzM2NzY2ZS0xNywgTTEyPS0xLCBNMjE9MSwgTTIyPTYuMTIzMjMzOTk1NzM2NzY2ZS0xNywgc2l6aW5nTWV0aG9kPSdhdXRvIGV4cGFuZCcpIE5vdGljZSB0aGF0IHdlIG5lZWQgdG8gc3dhcCBiIGFuZCBjIGNvbXBhcmVkIHRvIGEgbm9ybWFsIG1hdHJpeC5cblx0XHRcdFx0XHRzID0gZS5jdXJyZW50U3R5bGUuZmlsdGVyLm1hdGNoKF9pZUdldE1hdHJpeEV4cCk7XG5cdFx0XHRcdFx0cyA9IChzICYmIHMubGVuZ3RoID09PSA0KSA/IFtzWzBdLnN1YnN0cig0KSwgTnVtYmVyKHNbMl0uc3Vic3RyKDQpKSwgTnVtYmVyKHNbMV0uc3Vic3RyKDQpKSwgc1szXS5zdWJzdHIoNCksICh0bS54IHx8IDApLCAodG0ueSB8fCAwKV0uam9pbihcIixcIikgOiBcIlwiO1xuXHRcdFx0XHR9XG5cdFx0XHRcdGlzRGVmYXVsdCA9ICghcyB8fCBzID09PSBcIm5vbmVcIiB8fCBzID09PSBcIm1hdHJpeCgxLCAwLCAwLCAxLCAwLCAwKVwiKTtcblx0XHRcdFx0aWYgKHRtLnN2ZyB8fCAoZS5nZXRCQm94ICYmIF9pc1NWRyhlKSkpIHtcblx0XHRcdFx0XHRpZiAoaXNEZWZhdWx0ICYmIChlLnN0eWxlW190cmFuc2Zvcm1Qcm9wXSArIFwiXCIpLmluZGV4T2YoXCJtYXRyaXhcIikgIT09IC0xKSB7IC8vc29tZSBicm93c2VycyAobGlrZSBDaHJvbWUgNDApIGRvbid0IGNvcnJlY3RseSByZXBvcnQgdHJhbnNmb3JtcyB0aGF0IGFyZSBhcHBsaWVkIGlubGluZSBvbiBhbiBTVkcgZWxlbWVudCAodGhleSBkb24ndCBnZXQgaW5jbHVkZWQgaW4gdGhlIGNvbXB1dGVkIHN0eWxlKSwgc28gd2UgZG91YmxlLWNoZWNrIGhlcmUgYW5kIGFjY2VwdCBtYXRyaXggdmFsdWVzXG5cdFx0XHRcdFx0XHRzID0gZS5zdHlsZVtfdHJhbnNmb3JtUHJvcF07XG5cdFx0XHRcdFx0XHRpc0RlZmF1bHQgPSAwO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHRtID0gZS5nZXRBdHRyaWJ1dGUoXCJ0cmFuc2Zvcm1cIik7XG5cdFx0XHRcdFx0aWYgKGlzRGVmYXVsdCAmJiBtKSB7XG5cdFx0XHRcdFx0XHRpZiAobS5pbmRleE9mKFwibWF0cml4XCIpICE9PSAtMSkgeyAvL2p1c3QgaW4gY2FzZSB0aGVyZSdzIGEgXCJ0cmFuc2Zvcm1cIiB2YWx1ZSBzcGVjaWZpZWQgYXMgYW4gYXR0cmlidXRlIGluc3RlYWQgb2YgQ1NTIHN0eWxlLiBBY2NlcHQgZWl0aGVyIGEgbWF0cml4KCkgb3Igc2ltcGxlIHRyYW5zbGF0ZSgpIHZhbHVlIHRob3VnaC5cblx0XHRcdFx0XHRcdFx0cyA9IG07XG5cdFx0XHRcdFx0XHRcdGlzRGVmYXVsdCA9IDA7XG5cdFx0XHRcdFx0XHR9IGVsc2UgaWYgKG0uaW5kZXhPZihcInRyYW5zbGF0ZVwiKSAhPT0gLTEpIHtcblx0XHRcdFx0XHRcdFx0cyA9IFwibWF0cml4KDEsMCwwLDEsXCIgKyBtLm1hdGNoKC8oPzpcXC18XFxiKVtcXGRcXC1cXC5lXStcXGIvZ2kpLmpvaW4oXCIsXCIpICsgXCIpXCI7XG5cdFx0XHRcdFx0XHRcdGlzRGVmYXVsdCA9IDA7XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cdFx0XHRcdGlmIChpc0RlZmF1bHQpIHtcblx0XHRcdFx0XHRyZXR1cm4gX2lkZW50aXR5MkRNYXRyaXg7XG5cdFx0XHRcdH1cblx0XHRcdFx0Ly9zcGxpdCB0aGUgbWF0cml4IHZhbHVlcyBvdXQgaW50byBhbiBhcnJheSAobSBmb3IgbWF0cml4KVxuXHRcdFx0XHRtID0gKHMgfHwgXCJcIikubWF0Y2goLyg/OlxcLXxcXGIpW1xcZFxcLVxcLmVdK1xcYi9naSkgfHwgW107XG5cdFx0XHRcdGkgPSBtLmxlbmd0aDtcblx0XHRcdFx0d2hpbGUgKC0taSA+IC0xKSB7XG5cdFx0XHRcdFx0biA9IE51bWJlcihtW2ldKTtcblx0XHRcdFx0XHRtW2ldID0gKGRlYyA9IG4gLSAobiB8PSAwKSkgPyAoKGRlYyAqIHJuZCArIChkZWMgPCAwID8gLTAuNSA6IDAuNSkpIHwgMCkgLyBybmQgKyBuIDogbjsgLy9jb252ZXJ0IHN0cmluZ3MgdG8gTnVtYmVycyBhbmQgcm91bmQgdG8gNSBkZWNpbWFsIHBsYWNlcyB0byBhdm9pZCBpc3N1ZXMgd2l0aCB0aW55IG51bWJlcnMuIFJvdWdobHkgMjB4IGZhc3RlciB0aGFuIE51bWJlci50b0ZpeGVkKCkuIFdlIGFsc28gbXVzdCBtYWtlIHN1cmUgdG8gcm91bmQgYmVmb3JlIGRpdmlkaW5nIHNvIHRoYXQgdmFsdWVzIGxpa2UgMC45OTk5OTk5OTk5IGJlY29tZSAxIHRvIGF2b2lkIGdsaXRjaGVzIGluIGJyb3dzZXIgcmVuZGVyaW5nIGFuZCBpbnRlcnByZXRhdGlvbiBvZiBmbGlwcGVkL3JvdGF0ZWQgM0QgbWF0cmljZXMuIEFuZCBkb24ndCBqdXN0IG11bHRpcGx5IHRoZSBudW1iZXIgYnkgcm5kLCBmbG9vciBpdCwgYW5kIHRoZW4gZGl2aWRlIGJ5IHJuZCBiZWNhdXNlIHRoZSBiaXR3aXNlIG9wZXJhdGlvbnMgbWF4IG91dCBhdCBhIDMyLWJpdCBzaWduZWQgaW50ZWdlciwgdGh1cyBpdCBjb3VsZCBnZXQgY2xpcHBlZCBhdCBhIHJlbGF0aXZlbHkgbG93IHZhbHVlIChsaWtlIDIyLDAwMC4wMDAwMCBmb3IgZXhhbXBsZSkuXG5cdFx0XHRcdH1cblx0XHRcdFx0cmV0dXJuIChmb3JjZTJEICYmIG0ubGVuZ3RoID4gNikgPyBbbVswXSwgbVsxXSwgbVs0XSwgbVs1XSwgbVsxMl0sIG1bMTNdXSA6IG07XG5cdFx0XHR9LFxuXG5cdFx0XHQvKipcblx0XHRcdCAqIFBhcnNlcyB0aGUgdHJhbnNmb3JtIHZhbHVlcyBmb3IgYW4gZWxlbWVudCwgcmV0dXJuaW5nIGFuIG9iamVjdCB3aXRoIHgsIHksIHosIHNjYWxlWCwgc2NhbGVZLCBzY2FsZVosIHJvdGF0aW9uLCByb3RhdGlvblgsIHJvdGF0aW9uWSwgc2tld1gsIGFuZCBza2V3WSBwcm9wZXJ0aWVzLiBOb3RlOiBieSBkZWZhdWx0IChmb3IgcGVyZm9ybWFuY2UgcmVhc29ucyksIGFsbCBza2V3aW5nIGlzIGNvbWJpbmVkIGludG8gc2tld1ggYW5kIHJvdGF0aW9uIGJ1dCBza2V3WSBzdGlsbCBoYXMgYSBwbGFjZSBpbiB0aGUgdHJhbnNmb3JtIG9iamVjdCBzbyB0aGF0IHdlIGNhbiByZWNvcmQgaG93IG11Y2ggb2YgdGhlIHNrZXcgaXMgYXR0cmlidXRlZCB0byBza2V3WCB2cyBza2V3WS4gUmVtZW1iZXIsIGEgc2tld1kgb2YgMTAgbG9va3MgdGhlIHNhbWUgYXMgYSByb3RhdGlvbiBvZiAxMCBhbmQgc2tld1ggb2YgLTEwLlxuXHRcdFx0ICogQHBhcmFtIHshT2JqZWN0fSB0IHRhcmdldCBlbGVtZW50XG5cdFx0XHQgKiBAcGFyYW0ge09iamVjdD19IGNzIGNvbXB1dGVkIHN0eWxlIG9iamVjdCAob3B0aW9uYWwpXG5cdFx0XHQgKiBAcGFyYW0ge2Jvb2xlYW49fSByZWMgaWYgdHJ1ZSwgdGhlIHRyYW5zZm9ybSB2YWx1ZXMgd2lsbCBiZSByZWNvcmRlZCB0byB0aGUgdGFyZ2V0IGVsZW1lbnQncyBfZ3NUcmFuc2Zvcm0gb2JqZWN0LCBsaWtlIHRhcmdldC5fZ3NUcmFuc2Zvcm0gPSB7eDowLCB5OjAsIHo6MCwgc2NhbGVYOjEuLi59XG5cdFx0XHQgKiBAcGFyYW0ge2Jvb2xlYW49fSBwYXJzZSBpZiB0cnVlLCB3ZSdsbCBpZ25vcmUgYW55IF9nc1RyYW5zZm9ybSB2YWx1ZXMgdGhhdCBhbHJlYWR5IGV4aXN0IG9uIHRoZSBlbGVtZW50LCBhbmQgZm9yY2UgYSByZXBhcnNpbmcgb2YgdGhlIGNzcyAoY2FsY3VsYXRlZCBzdHlsZSlcblx0XHRcdCAqIEByZXR1cm4ge29iamVjdH0gb2JqZWN0IGNvbnRhaW5pbmcgYWxsIG9mIHRoZSB0cmFuc2Zvcm0gcHJvcGVydGllcy92YWx1ZXMgbGlrZSB7eDowLCB5OjAsIHo6MCwgc2NhbGVYOjEuLi59XG5cdFx0XHQgKi9cblx0XHRcdF9nZXRUcmFuc2Zvcm0gPSBfaW50ZXJuYWxzLmdldFRyYW5zZm9ybSA9IGZ1bmN0aW9uKHQsIGNzLCByZWMsIHBhcnNlKSB7XG5cdFx0XHRcdGlmICh0Ll9nc1RyYW5zZm9ybSAmJiByZWMgJiYgIXBhcnNlKSB7XG5cdFx0XHRcdFx0cmV0dXJuIHQuX2dzVHJhbnNmb3JtOyAvL2lmIHRoZSBlbGVtZW50IGFscmVhZHkgaGFzIGEgX2dzVHJhbnNmb3JtLCB1c2UgdGhhdC4gTm90ZTogc29tZSBicm93c2VycyBkb24ndCBhY2N1cmF0ZWx5IHJldHVybiB0aGUgY2FsY3VsYXRlZCBzdHlsZSBmb3IgdGhlIHRyYW5zZm9ybSAocGFydGljdWxhcmx5IGZvciBTVkcpLCBzbyBpdCdzIGFsbW9zdCBhbHdheXMgc2FmZXN0IHRvIGp1c3QgdXNlIHRoZSB2YWx1ZXMgd2UndmUgYWxyZWFkeSBhcHBsaWVkIHJhdGhlciB0aGFuIHJlLXBhcnNpbmcgdGhpbmdzLlxuXHRcdFx0XHR9XG5cdFx0XHRcdHZhciB0bSA9IHJlYyA/IHQuX2dzVHJhbnNmb3JtIHx8IG5ldyBUcmFuc2Zvcm0oKSA6IG5ldyBUcmFuc2Zvcm0oKSxcblx0XHRcdFx0XHRpbnZYID0gKHRtLnNjYWxlWCA8IDApLCAvL2luIG9yZGVyIHRvIGludGVycHJldCB0aGluZ3MgcHJvcGVybHksIHdlIG5lZWQgdG8ga25vdyBpZiB0aGUgdXNlciBhcHBsaWVkIGEgbmVnYXRpdmUgc2NhbGVYIHByZXZpb3VzbHkgc28gdGhhdCB3ZSBjYW4gYWRqdXN0IHRoZSByb3RhdGlvbiBhbmQgc2tld1ggYWNjb3JkaW5nbHkuIE90aGVyd2lzZSwgaWYgd2UgYWx3YXlzIGludGVycHJldCBhIGZsaXBwZWQgbWF0cml4IGFzIGFmZmVjdGluZyBzY2FsZVkgYW5kIHRoZSB1c2VyIG9ubHkgd2FudHMgdG8gdHdlZW4gdGhlIHNjYWxlWCBvbiBtdWx0aXBsZSBzZXF1ZW50aWFsIHR3ZWVucywgaXQgd291bGQga2VlcCB0aGUgbmVnYXRpdmUgc2NhbGVZIHdpdGhvdXQgdGhhdCBiZWluZyB0aGUgdXNlcidzIGludGVudC5cblx0XHRcdFx0XHRtaW4gPSAwLjAwMDAyLFxuXHRcdFx0XHRcdHJuZCA9IDEwMDAwMCxcblx0XHRcdFx0XHR6T3JpZ2luID0gX3N1cHBvcnRzM0QgPyBwYXJzZUZsb2F0KF9nZXRTdHlsZSh0LCBfdHJhbnNmb3JtT3JpZ2luUHJvcCwgY3MsIGZhbHNlLCBcIjAgMCAwXCIpLnNwbGl0KFwiIFwiKVsyXSkgfHwgdG0uek9yaWdpbiAgfHwgMCA6IDAsXG5cdFx0XHRcdFx0ZGVmYXVsdFRyYW5zZm9ybVBlcnNwZWN0aXZlID0gcGFyc2VGbG9hdChDU1NQbHVnaW4uZGVmYXVsdFRyYW5zZm9ybVBlcnNwZWN0aXZlKSB8fCAwLFxuXHRcdFx0XHRcdG0sIGksIHNjYWxlWCwgc2NhbGVZLCByb3RhdGlvbiwgc2tld1g7XG5cblx0XHRcdFx0dG0uc3ZnID0gISEodC5nZXRCQm94ICYmIF9pc1NWRyh0KSk7XG5cdFx0XHRcdGlmICh0bS5zdmcpIHtcblx0XHRcdFx0XHRfcGFyc2VTVkdPcmlnaW4odCwgX2dldFN0eWxlKHQsIF90cmFuc2Zvcm1PcmlnaW5Qcm9wLCBfY3MsIGZhbHNlLCBcIjUwJSA1MCVcIikgKyBcIlwiLCB0bSwgdC5nZXRBdHRyaWJ1dGUoXCJkYXRhLXN2Zy1vcmlnaW5cIikpO1xuXHRcdFx0XHRcdF91c2VTVkdUcmFuc2Zvcm1BdHRyID0gQ1NTUGx1Z2luLnVzZVNWR1RyYW5zZm9ybUF0dHIgfHwgX2ZvcmNlU1ZHVHJhbnNmb3JtQXR0cjtcblx0XHRcdFx0fVxuXHRcdFx0XHRtID0gX2dldE1hdHJpeCh0KTtcblx0XHRcdFx0aWYgKG0gIT09IF9pZGVudGl0eTJETWF0cml4KSB7XG5cblx0XHRcdFx0XHRpZiAobS5sZW5ndGggPT09IDE2KSB7XG5cdFx0XHRcdFx0XHQvL3dlJ2xsIG9ubHkgbG9vayBhdCB0aGVzZSBwb3NpdGlvbi1yZWxhdGVkIDYgdmFyaWFibGVzIGZpcnN0IGJlY2F1c2UgaWYgeC95L3ogYWxsIG1hdGNoLCBpdCdzIHJlbGF0aXZlbHkgc2FmZSB0byBhc3N1bWUgd2UgZG9uJ3QgbmVlZCB0byByZS1wYXJzZSBldmVyeXRoaW5nIHdoaWNoIHJpc2tzIGxvc2luZyBpbXBvcnRhbnQgcm90YXRpb25hbCBpbmZvcm1hdGlvbiAobGlrZSByb3RhdGlvblg6MTgwIHBsdXMgcm90YXRpb25ZOjE4MCB3b3VsZCBsb29rIHRoZSBzYW1lIGFzIHJvdGF0aW9uOjE4MCAtIHRoZXJlJ3Mgbm8gd2F5IHRvIGtub3cgZm9yIHN1cmUgd2hpY2ggZGlyZWN0aW9uIHdhcyB0YWtlbiBiYXNlZCBzb2xlbHkgb24gdGhlIG1hdHJpeDNkKCkgdmFsdWVzKVxuXHRcdFx0XHRcdFx0dmFyIGExMSA9IG1bMF0sIGEyMSA9IG1bMV0sIGEzMSA9IG1bMl0sIGE0MSA9IG1bM10sXG5cdFx0XHRcdFx0XHRcdGExMiA9IG1bNF0sIGEyMiA9IG1bNV0sIGEzMiA9IG1bNl0sIGE0MiA9IG1bN10sXG5cdFx0XHRcdFx0XHRcdGExMyA9IG1bOF0sIGEyMyA9IG1bOV0sIGEzMyA9IG1bMTBdLFxuXHRcdFx0XHRcdFx0XHRhMTQgPSBtWzEyXSwgYTI0ID0gbVsxM10sIGEzNCA9IG1bMTRdLFxuXHRcdFx0XHRcdFx0XHRhNDMgPSBtWzExXSxcblx0XHRcdFx0XHRcdFx0YW5nbGUgPSBNYXRoLmF0YW4yKGEzMiwgYTMzKSxcblx0XHRcdFx0XHRcdFx0dDEsIHQyLCB0MywgdDQsIGNvcywgc2luO1xuXG5cdFx0XHRcdFx0XHQvL3dlIG1hbnVhbGx5IGNvbXBlbnNhdGUgZm9yIG5vbi16ZXJvIHogY29tcG9uZW50IG9mIHRyYW5zZm9ybU9yaWdpbiB0byB3b3JrIGFyb3VuZCBidWdzIGluIFNhZmFyaVxuXHRcdFx0XHRcdFx0aWYgKHRtLnpPcmlnaW4pIHtcblx0XHRcdFx0XHRcdFx0YTM0ID0gLXRtLnpPcmlnaW47XG5cdFx0XHRcdFx0XHRcdGExNCA9IGExMyphMzQtbVsxMl07XG5cdFx0XHRcdFx0XHRcdGEyNCA9IGEyMyphMzQtbVsxM107XG5cdFx0XHRcdFx0XHRcdGEzNCA9IGEzMyphMzQrdG0uek9yaWdpbi1tWzE0XTtcblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdHRtLnJvdGF0aW9uWCA9IGFuZ2xlICogX1JBRDJERUc7XG5cdFx0XHRcdFx0XHQvL3JvdGF0aW9uWFxuXHRcdFx0XHRcdFx0aWYgKGFuZ2xlKSB7XG5cdFx0XHRcdFx0XHRcdGNvcyA9IE1hdGguY29zKC1hbmdsZSk7XG5cdFx0XHRcdFx0XHRcdHNpbiA9IE1hdGguc2luKC1hbmdsZSk7XG5cdFx0XHRcdFx0XHRcdHQxID0gYTEyKmNvcythMTMqc2luO1xuXHRcdFx0XHRcdFx0XHR0MiA9IGEyMipjb3MrYTIzKnNpbjtcblx0XHRcdFx0XHRcdFx0dDMgPSBhMzIqY29zK2EzMypzaW47XG5cdFx0XHRcdFx0XHRcdGExMyA9IGExMiotc2luK2ExMypjb3M7XG5cdFx0XHRcdFx0XHRcdGEyMyA9IGEyMiotc2luK2EyMypjb3M7XG5cdFx0XHRcdFx0XHRcdGEzMyA9IGEzMiotc2luK2EzMypjb3M7XG5cdFx0XHRcdFx0XHRcdGE0MyA9IGE0Miotc2luK2E0Mypjb3M7XG5cdFx0XHRcdFx0XHRcdGExMiA9IHQxO1xuXHRcdFx0XHRcdFx0XHRhMjIgPSB0Mjtcblx0XHRcdFx0XHRcdFx0YTMyID0gdDM7XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHQvL3JvdGF0aW9uWVxuXHRcdFx0XHRcdFx0YW5nbGUgPSBNYXRoLmF0YW4yKC1hMzEsIGEzMyk7XG5cdFx0XHRcdFx0XHR0bS5yb3RhdGlvblkgPSBhbmdsZSAqIF9SQUQyREVHO1xuXHRcdFx0XHRcdFx0aWYgKGFuZ2xlKSB7XG5cdFx0XHRcdFx0XHRcdGNvcyA9IE1hdGguY29zKC1hbmdsZSk7XG5cdFx0XHRcdFx0XHRcdHNpbiA9IE1hdGguc2luKC1hbmdsZSk7XG5cdFx0XHRcdFx0XHRcdHQxID0gYTExKmNvcy1hMTMqc2luO1xuXHRcdFx0XHRcdFx0XHR0MiA9IGEyMSpjb3MtYTIzKnNpbjtcblx0XHRcdFx0XHRcdFx0dDMgPSBhMzEqY29zLWEzMypzaW47XG5cdFx0XHRcdFx0XHRcdGEyMyA9IGEyMSpzaW4rYTIzKmNvcztcblx0XHRcdFx0XHRcdFx0YTMzID0gYTMxKnNpbithMzMqY29zO1xuXHRcdFx0XHRcdFx0XHRhNDMgPSBhNDEqc2luK2E0Mypjb3M7XG5cdFx0XHRcdFx0XHRcdGExMSA9IHQxO1xuXHRcdFx0XHRcdFx0XHRhMjEgPSB0Mjtcblx0XHRcdFx0XHRcdFx0YTMxID0gdDM7XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHQvL3JvdGF0aW9uWlxuXHRcdFx0XHRcdFx0YW5nbGUgPSBNYXRoLmF0YW4yKGEyMSwgYTExKTtcblx0XHRcdFx0XHRcdHRtLnJvdGF0aW9uID0gYW5nbGUgKiBfUkFEMkRFRztcblx0XHRcdFx0XHRcdGlmIChhbmdsZSkge1xuXHRcdFx0XHRcdFx0XHRjb3MgPSBNYXRoLmNvcygtYW5nbGUpO1xuXHRcdFx0XHRcdFx0XHRzaW4gPSBNYXRoLnNpbigtYW5nbGUpO1xuXHRcdFx0XHRcdFx0XHRhMTEgPSBhMTEqY29zK2ExMipzaW47XG5cdFx0XHRcdFx0XHRcdHQyID0gYTIxKmNvcythMjIqc2luO1xuXHRcdFx0XHRcdFx0XHRhMjIgPSBhMjEqLXNpbithMjIqY29zO1xuXHRcdFx0XHRcdFx0XHRhMzIgPSBhMzEqLXNpbithMzIqY29zO1xuXHRcdFx0XHRcdFx0XHRhMjEgPSB0Mjtcblx0XHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdFx0aWYgKHRtLnJvdGF0aW9uWCAmJiBNYXRoLmFicyh0bS5yb3RhdGlvblgpICsgTWF0aC5hYnModG0ucm90YXRpb24pID4gMzU5LjkpIHsgLy93aGVuIHJvdGF0aW9uWSBpcyBzZXQsIGl0IHdpbGwgb2Z0ZW4gYmUgcGFyc2VkIGFzIDE4MCBkZWdyZWVzIGRpZmZlcmVudCB0aGFuIGl0IHNob3VsZCBiZSwgYW5kIHJvdGF0aW9uWCBhbmQgcm90YXRpb24gYm90aCBiZWluZyAxODAgKGl0IGxvb2tzIHRoZSBzYW1lKSwgc28gd2UgYWRqdXN0IGZvciB0aGF0IGhlcmUuXG5cdFx0XHRcdFx0XHRcdHRtLnJvdGF0aW9uWCA9IHRtLnJvdGF0aW9uID0gMDtcblx0XHRcdFx0XHRcdFx0dG0ucm90YXRpb25ZID0gMTgwIC0gdG0ucm90YXRpb25ZO1xuXHRcdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0XHR0bS5zY2FsZVggPSAoKE1hdGguc3FydChhMTEgKiBhMTEgKyBhMjEgKiBhMjEpICogcm5kICsgMC41KSB8IDApIC8gcm5kO1xuXHRcdFx0XHRcdFx0dG0uc2NhbGVZID0gKChNYXRoLnNxcnQoYTIyICogYTIyICsgYTIzICogYTIzKSAqIHJuZCArIDAuNSkgfCAwKSAvIHJuZDtcblx0XHRcdFx0XHRcdHRtLnNjYWxlWiA9ICgoTWF0aC5zcXJ0KGEzMiAqIGEzMiArIGEzMyAqIGEzMykgKiBybmQgKyAwLjUpIHwgMCkgLyBybmQ7XG5cdFx0XHRcdFx0XHR0bS5za2V3WCA9IDA7XG5cdFx0XHRcdFx0XHR0bS5wZXJzcGVjdGl2ZSA9IGE0MyA/IDEgLyAoKGE0MyA8IDApID8gLWE0MyA6IGE0MykgOiAwO1xuXHRcdFx0XHRcdFx0dG0ueCA9IGExNDtcblx0XHRcdFx0XHRcdHRtLnkgPSBhMjQ7XG5cdFx0XHRcdFx0XHR0bS56ID0gYTM0O1xuXHRcdFx0XHRcdFx0aWYgKHRtLnN2Zykge1xuXHRcdFx0XHRcdFx0XHR0bS54IC09IHRtLnhPcmlnaW4gLSAodG0ueE9yaWdpbiAqIGExMSAtIHRtLnlPcmlnaW4gKiBhMTIpO1xuXHRcdFx0XHRcdFx0XHR0bS55IC09IHRtLnlPcmlnaW4gLSAodG0ueU9yaWdpbiAqIGEyMSAtIHRtLnhPcmlnaW4gKiBhMjIpO1xuXHRcdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0fSBlbHNlIGlmICgoIV9zdXBwb3J0czNEIHx8IHBhcnNlIHx8ICFtLmxlbmd0aCB8fCB0bS54ICE9PSBtWzRdIHx8IHRtLnkgIT09IG1bNV0gfHwgKCF0bS5yb3RhdGlvblggJiYgIXRtLnJvdGF0aW9uWSkpICYmICEodG0ueCAhPT0gdW5kZWZpbmVkICYmIF9nZXRTdHlsZSh0LCBcImRpc3BsYXlcIiwgY3MpID09PSBcIm5vbmVcIikpIHsgLy9zb21ldGltZXMgYSA2LWVsZW1lbnQgbWF0cml4IGlzIHJldHVybmVkIGV2ZW4gd2hlbiB3ZSBwZXJmb3JtZWQgM0QgdHJhbnNmb3JtcywgbGlrZSBpZiByb3RhdGlvblggYW5kIHJvdGF0aW9uWSBhcmUgMTgwLiBJbiBjYXNlcyBsaWtlIHRoaXMsIHdlIHN0aWxsIG5lZWQgdG8gaG9ub3IgdGhlIDNEIHRyYW5zZm9ybXMuIElmIHdlIGp1c3QgcmVseSBvbiB0aGUgMkQgaW5mbywgaXQgY291bGQgYWZmZWN0IGhvdyB0aGUgZGF0YSBpcyBpbnRlcnByZXRlZCwgbGlrZSBzY2FsZVkgbWlnaHQgZ2V0IHNldCB0byAtMSBvciByb3RhdGlvbiBjb3VsZCBnZXQgb2Zmc2V0IGJ5IDE4MCBkZWdyZWVzLiBGb3IgZXhhbXBsZSwgZG8gYSBUd2VlbkxpdGUudG8oZWxlbWVudCwgMSwge2Nzczp7cm90YXRpb25YOjE4MCwgcm90YXRpb25ZOjE4MH19KSBhbmQgdGhlbiBsYXRlciwgVHdlZW5MaXRlLnRvKGVsZW1lbnQsIDEsIHtjc3M6e3JvdGF0aW9uWDowfX0pIGFuZCB3aXRob3V0IHRoaXMgY29uZGl0aW9uYWwgbG9naWMgaW4gcGxhY2UsIGl0J2QganVtcCB0byBhIHN0YXRlIG9mIGJlaW5nIHVucm90YXRlZCB3aGVuIHRoZSAybmQgdHdlZW4gc3RhcnRzLiBUaGVuIGFnYWluLCB3ZSBuZWVkIHRvIGhvbm9yIHRoZSBmYWN0IHRoYXQgdGhlIHVzZXIgQ09VTEQgYWx0ZXIgdGhlIHRyYW5zZm9ybXMgb3V0c2lkZSBvZiBDU1NQbHVnaW4sIGxpa2UgYnkgbWFudWFsbHkgYXBwbHlpbmcgbmV3IGNzcywgc28gd2UgdHJ5IHRvIHNlbnNlIHRoYXQgYnkgbG9va2luZyBhdCB4IGFuZCB5IGJlY2F1c2UgaWYgdGhvc2UgY2hhbmdlZCwgd2Uga25vdyB0aGUgY2hhbmdlcyB3ZXJlIG1hZGUgb3V0c2lkZSBDU1NQbHVnaW4gYW5kIHdlIGZvcmNlIGEgcmVpbnRlcnByZXRhdGlvbiBvZiB0aGUgbWF0cml4IHZhbHVlcy4gQWxzbywgaW4gV2Via2l0IGJyb3dzZXJzLCBpZiB0aGUgZWxlbWVudCdzIFwiZGlzcGxheVwiIGlzIFwibm9uZVwiLCBpdHMgY2FsY3VsYXRlZCBzdHlsZSB2YWx1ZSB3aWxsIGFsd2F5cyByZXR1cm4gZW1wdHksIHNvIGlmIHdlJ3ZlIGFscmVhZHkgcmVjb3JkZWQgdGhlIHZhbHVlcyBpbiB0aGUgX2dzVHJhbnNmb3JtIG9iamVjdCwgd2UnbGwganVzdCByZWx5IG9uIHRob3NlLlxuXHRcdFx0XHRcdFx0dmFyIGsgPSAobS5sZW5ndGggPj0gNiksXG5cdFx0XHRcdFx0XHRcdGEgPSBrID8gbVswXSA6IDEsXG5cdFx0XHRcdFx0XHRcdGIgPSBtWzFdIHx8IDAsXG5cdFx0XHRcdFx0XHRcdGMgPSBtWzJdIHx8IDAsXG5cdFx0XHRcdFx0XHRcdGQgPSBrID8gbVszXSA6IDE7XG5cdFx0XHRcdFx0XHR0bS54ID0gbVs0XSB8fCAwO1xuXHRcdFx0XHRcdFx0dG0ueSA9IG1bNV0gfHwgMDtcblx0XHRcdFx0XHRcdHNjYWxlWCA9IE1hdGguc3FydChhICogYSArIGIgKiBiKTtcblx0XHRcdFx0XHRcdHNjYWxlWSA9IE1hdGguc3FydChkICogZCArIGMgKiBjKTtcblx0XHRcdFx0XHRcdHJvdGF0aW9uID0gKGEgfHwgYikgPyBNYXRoLmF0YW4yKGIsIGEpICogX1JBRDJERUcgOiB0bS5yb3RhdGlvbiB8fCAwOyAvL25vdGU6IGlmIHNjYWxlWCBpcyAwLCB3ZSBjYW5ub3QgYWNjdXJhdGVseSBtZWFzdXJlIHJvdGF0aW9uLiBTYW1lIGZvciBza2V3WCB3aXRoIGEgc2NhbGVZIG9mIDAuIFRoZXJlZm9yZSwgd2UgZGVmYXVsdCB0byB0aGUgcHJldmlvdXNseSByZWNvcmRlZCB2YWx1ZSAob3IgemVybyBpZiB0aGF0IGRvZXNuJ3QgZXhpc3QpLlxuXHRcdFx0XHRcdFx0c2tld1ggPSAoYyB8fCBkKSA/IE1hdGguYXRhbjIoYywgZCkgKiBfUkFEMkRFRyArIHJvdGF0aW9uIDogdG0uc2tld1ggfHwgMDtcblx0XHRcdFx0XHRcdGlmIChNYXRoLmFicyhza2V3WCkgPiA5MCAmJiBNYXRoLmFicyhza2V3WCkgPCAyNzApIHtcblx0XHRcdFx0XHRcdFx0aWYgKGludlgpIHtcblx0XHRcdFx0XHRcdFx0XHRzY2FsZVggKj0gLTE7XG5cdFx0XHRcdFx0XHRcdFx0c2tld1ggKz0gKHJvdGF0aW9uIDw9IDApID8gMTgwIDogLTE4MDtcblx0XHRcdFx0XHRcdFx0XHRyb3RhdGlvbiArPSAocm90YXRpb24gPD0gMCkgPyAxODAgOiAtMTgwO1xuXHRcdFx0XHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdFx0XHRcdHNjYWxlWSAqPSAtMTtcblx0XHRcdFx0XHRcdFx0XHRza2V3WCArPSAoc2tld1ggPD0gMCkgPyAxODAgOiAtMTgwO1xuXHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHR0bS5zY2FsZVggPSBzY2FsZVg7XG5cdFx0XHRcdFx0XHR0bS5zY2FsZVkgPSBzY2FsZVk7XG5cdFx0XHRcdFx0XHR0bS5yb3RhdGlvbiA9IHJvdGF0aW9uO1xuXHRcdFx0XHRcdFx0dG0uc2tld1ggPSBza2V3WDtcblx0XHRcdFx0XHRcdGlmIChfc3VwcG9ydHMzRCkge1xuXHRcdFx0XHRcdFx0XHR0bS5yb3RhdGlvblggPSB0bS5yb3RhdGlvblkgPSB0bS56ID0gMDtcblx0XHRcdFx0XHRcdFx0dG0ucGVyc3BlY3RpdmUgPSBkZWZhdWx0VHJhbnNmb3JtUGVyc3BlY3RpdmU7XG5cdFx0XHRcdFx0XHRcdHRtLnNjYWxlWiA9IDE7XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRpZiAodG0uc3ZnKSB7XG5cdFx0XHRcdFx0XHRcdHRtLnggLT0gdG0ueE9yaWdpbiAtICh0bS54T3JpZ2luICogYSArIHRtLnlPcmlnaW4gKiBjKTtcblx0XHRcdFx0XHRcdFx0dG0ueSAtPSB0bS55T3JpZ2luIC0gKHRtLnhPcmlnaW4gKiBiICsgdG0ueU9yaWdpbiAqIGQpO1xuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHR0bS56T3JpZ2luID0gek9yaWdpbjtcblx0XHRcdFx0XHQvL3NvbWUgYnJvd3NlcnMgaGF2ZSBhIGhhcmQgdGltZSB3aXRoIHZlcnkgc21hbGwgdmFsdWVzIGxpa2UgMi40NDkyOTM1OTgyOTQ3MDY0ZS0xNiAobm90aWNlIHRoZSBcImUtXCIgdG93YXJkcyB0aGUgZW5kKSBhbmQgd291bGQgcmVuZGVyIHRoZSBvYmplY3Qgc2xpZ2h0bHkgb2ZmLiBTbyB3ZSByb3VuZCB0byAwIGluIHRoZXNlIGNhc2VzLiBUaGUgY29uZGl0aW9uYWwgbG9naWMgaGVyZSBpcyBmYXN0ZXIgdGhhbiBjYWxsaW5nIE1hdGguYWJzKCkuIEFsc28sIGJyb3dzZXJzIHRlbmQgdG8gcmVuZGVyIGEgU0xJR0hUTFkgcm90YXRlZCBvYmplY3QgaW4gYSBmdXp6eSB3YXksIHNvIHdlIG5lZWQgdG8gc25hcCB0byBleGFjdGx5IDAgd2hlbiBhcHByb3ByaWF0ZS5cblx0XHRcdFx0XHRmb3IgKGkgaW4gdG0pIHtcblx0XHRcdFx0XHRcdGlmICh0bVtpXSA8IG1pbikgaWYgKHRtW2ldID4gLW1pbikge1xuXHRcdFx0XHRcdFx0XHR0bVtpXSA9IDA7XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cdFx0XHRcdC8vREVCVUc6IF9sb2coXCJwYXJzZWQgcm90YXRpb24gb2YgXCIgKyB0LmdldEF0dHJpYnV0ZShcImlkXCIpK1wiOiBcIisodG0ucm90YXRpb25YKStcIiwgXCIrKHRtLnJvdGF0aW9uWSkrXCIsIFwiKyh0bS5yb3RhdGlvbikrXCIsIHNjYWxlOiBcIit0bS5zY2FsZVgrXCIsIFwiK3RtLnNjYWxlWStcIiwgXCIrdG0uc2NhbGVaK1wiLCBwb3NpdGlvbjogXCIrdG0ueCtcIiwgXCIrdG0ueStcIiwgXCIrdG0ueitcIiwgcGVyc3BlY3RpdmU6IFwiK3RtLnBlcnNwZWN0aXZlKyBcIiwgb3JpZ2luOiBcIisgdG0ueE9yaWdpbisgXCIsXCIrIHRtLnlPcmlnaW4pO1xuXHRcdFx0XHRpZiAocmVjKSB7XG5cdFx0XHRcdFx0dC5fZ3NUcmFuc2Zvcm0gPSB0bTsgLy9yZWNvcmQgdG8gdGhlIG9iamVjdCdzIF9nc1RyYW5zZm9ybSB3aGljaCB3ZSB1c2Ugc28gdGhhdCB0d2VlbnMgY2FuIGNvbnRyb2wgaW5kaXZpZHVhbCBwcm9wZXJ0aWVzIGluZGVwZW5kZW50bHkgKHdlIG5lZWQgYWxsIHRoZSBwcm9wZXJ0aWVzIHRvIGFjY3VyYXRlbHkgcmVjb21wb3NlIHRoZSBtYXRyaXggaW4gdGhlIHNldFJhdGlvKCkgbWV0aG9kKVxuXHRcdFx0XHRcdGlmICh0bS5zdmcpIHsgLy9pZiB3ZSdyZSBzdXBwb3NlZCB0byBhcHBseSB0cmFuc2Zvcm1zIHRvIHRoZSBTVkcgZWxlbWVudCdzIFwidHJhbnNmb3JtXCIgYXR0cmlidXRlLCBtYWtlIHN1cmUgdGhlcmUgYXJlbid0IGFueSBDU1MgdHJhbnNmb3JtcyBhcHBsaWVkIG9yIHRoZXknbGwgb3ZlcnJpZGUgdGhlIGF0dHJpYnV0ZSBvbmVzLiBBbHNvIGNsZWFyIHRoZSB0cmFuc2Zvcm0gYXR0cmlidXRlIGlmIHdlJ3JlIHVzaW5nIENTUywganVzdCB0byBiZSBjbGVhbi5cblx0XHRcdFx0XHRcdGlmIChfdXNlU1ZHVHJhbnNmb3JtQXR0ciAmJiB0LnN0eWxlW190cmFuc2Zvcm1Qcm9wXSkge1xuXHRcdFx0XHRcdFx0XHRUd2VlbkxpdGUuZGVsYXllZENhbGwoMC4wMDEsIGZ1bmN0aW9uKCl7IC8vaWYgd2UgYXBwbHkgdGhpcyByaWdodCBhd2F5IChiZWZvcmUgYW55dGhpbmcgaGFzIHJlbmRlcmVkKSwgd2UgcmlzayB0aGVyZSBiZWluZyBubyB0cmFuc2Zvcm1zIGZvciBhIGJyaWVmIG1vbWVudCBhbmQgaXQgYWxzbyBpbnRlcmZlcmVzIHdpdGggYWRqdXN0aW5nIHRoZSB0cmFuc2Zvcm1PcmlnaW4gaW4gYSB0d2VlbiB3aXRoIGltbWVkaWF0ZVJlbmRlcjp0cnVlIChpdCdkIHRyeSByZWFkaW5nIHRoZSBtYXRyaXggYW5kIGl0IHdvdWxkbid0IGhhdmUgdGhlIGFwcHJvcHJpYXRlIGRhdGEgaW4gcGxhY2UgYmVjYXVzZSB3ZSBqdXN0IHJlbW92ZWQgaXQpLlxuXHRcdFx0XHRcdFx0XHRcdF9yZW1vdmVQcm9wKHQuc3R5bGUsIF90cmFuc2Zvcm1Qcm9wKTtcblx0XHRcdFx0XHRcdFx0fSk7XG5cdFx0XHRcdFx0XHR9IGVsc2UgaWYgKCFfdXNlU1ZHVHJhbnNmb3JtQXR0ciAmJiB0LmdldEF0dHJpYnV0ZShcInRyYW5zZm9ybVwiKSkge1xuXHRcdFx0XHRcdFx0XHRUd2VlbkxpdGUuZGVsYXllZENhbGwoMC4wMDEsIGZ1bmN0aW9uKCl7XG5cdFx0XHRcdFx0XHRcdFx0dC5yZW1vdmVBdHRyaWJ1dGUoXCJ0cmFuc2Zvcm1cIik7XG5cdFx0XHRcdFx0XHRcdH0pO1xuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXHRcdFx0XHRyZXR1cm4gdG07XG5cdFx0XHR9LFxuXG5cdFx0XHQvL2ZvciBzZXR0aW5nIDJEIHRyYW5zZm9ybXMgaW4gSUU2LCBJRTcsIGFuZCBJRTggKG11c3QgdXNlIGEgXCJmaWx0ZXJcIiB0byBlbXVsYXRlIHRoZSBiZWhhdmlvciBvZiBtb2Rlcm4gZGF5IGJyb3dzZXIgdHJhbnNmb3Jtcylcblx0XHRcdF9zZXRJRVRyYW5zZm9ybVJhdGlvID0gZnVuY3Rpb24odikge1xuXHRcdFx0XHR2YXIgdCA9IHRoaXMuZGF0YSwgLy9yZWZlcnMgdG8gdGhlIGVsZW1lbnQncyBfZ3NUcmFuc2Zvcm0gb2JqZWN0XG5cdFx0XHRcdFx0YW5nID0gLXQucm90YXRpb24gKiBfREVHMlJBRCxcblx0XHRcdFx0XHRza2V3ID0gYW5nICsgdC5za2V3WCAqIF9ERUcyUkFELFxuXHRcdFx0XHRcdHJuZCA9IDEwMDAwMCxcblx0XHRcdFx0XHRhID0gKChNYXRoLmNvcyhhbmcpICogdC5zY2FsZVggKiBybmQpIHwgMCkgLyBybmQsXG5cdFx0XHRcdFx0YiA9ICgoTWF0aC5zaW4oYW5nKSAqIHQuc2NhbGVYICogcm5kKSB8IDApIC8gcm5kLFxuXHRcdFx0XHRcdGMgPSAoKE1hdGguc2luKHNrZXcpICogLXQuc2NhbGVZICogcm5kKSB8IDApIC8gcm5kLFxuXHRcdFx0XHRcdGQgPSAoKE1hdGguY29zKHNrZXcpICogdC5zY2FsZVkgKiBybmQpIHwgMCkgLyBybmQsXG5cdFx0XHRcdFx0c3R5bGUgPSB0aGlzLnQuc3R5bGUsXG5cdFx0XHRcdFx0Y3MgPSB0aGlzLnQuY3VycmVudFN0eWxlLFxuXHRcdFx0XHRcdGZpbHRlcnMsIHZhbDtcblx0XHRcdFx0aWYgKCFjcykge1xuXHRcdFx0XHRcdHJldHVybjtcblx0XHRcdFx0fVxuXHRcdFx0XHR2YWwgPSBiOyAvL2p1c3QgZm9yIHN3YXBwaW5nIHRoZSB2YXJpYWJsZXMgYW4gaW52ZXJ0aW5nIHRoZW0gKHJldXNlZCBcInZhbFwiIHRvIGF2b2lkIGNyZWF0aW5nIGFub3RoZXIgdmFyaWFibGUgaW4gbWVtb3J5KS4gSUUncyBmaWx0ZXIgbWF0cml4IHVzZXMgYSBub24tc3RhbmRhcmQgbWF0cml4IGNvbmZpZ3VyYXRpb24gKGFuZ2xlIGdvZXMgdGhlIG9wcG9zaXRlIHdheSwgYW5kIGIgYW5kIGMgYXJlIHJldmVyc2VkIGFuZCBpbnZlcnRlZClcblx0XHRcdFx0YiA9IC1jO1xuXHRcdFx0XHRjID0gLXZhbDtcblx0XHRcdFx0ZmlsdGVycyA9IGNzLmZpbHRlcjtcblx0XHRcdFx0c3R5bGUuZmlsdGVyID0gXCJcIjsgLy9yZW1vdmUgZmlsdGVycyBzbyB0aGF0IHdlIGNhbiBhY2N1cmF0ZWx5IG1lYXN1cmUgb2Zmc2V0V2lkdGgvb2Zmc2V0SGVpZ2h0XG5cdFx0XHRcdHZhciB3ID0gdGhpcy50Lm9mZnNldFdpZHRoLFxuXHRcdFx0XHRcdGggPSB0aGlzLnQub2Zmc2V0SGVpZ2h0LFxuXHRcdFx0XHRcdGNsaXAgPSAoY3MucG9zaXRpb24gIT09IFwiYWJzb2x1dGVcIiksXG5cdFx0XHRcdFx0bSA9IFwicHJvZ2lkOkRYSW1hZ2VUcmFuc2Zvcm0uTWljcm9zb2Z0Lk1hdHJpeChNMTE9XCIgKyBhICsgXCIsIE0xMj1cIiArIGIgKyBcIiwgTTIxPVwiICsgYyArIFwiLCBNMjI9XCIgKyBkLFxuXHRcdFx0XHRcdG94ID0gdC54ICsgKHcgKiB0LnhQZXJjZW50IC8gMTAwKSxcblx0XHRcdFx0XHRveSA9IHQueSArIChoICogdC55UGVyY2VudCAvIDEwMCksXG5cdFx0XHRcdFx0ZHgsIGR5O1xuXG5cdFx0XHRcdC8vaWYgdHJhbnNmb3JtT3JpZ2luIGlzIGJlaW5nIHVzZWQsIGFkanVzdCB0aGUgb2Zmc2V0IHggYW5kIHlcblx0XHRcdFx0aWYgKHQub3ggIT0gbnVsbCkge1xuXHRcdFx0XHRcdGR4ID0gKCh0Lm94cCkgPyB3ICogdC5veCAqIDAuMDEgOiB0Lm94KSAtIHcgLyAyO1xuXHRcdFx0XHRcdGR5ID0gKCh0Lm95cCkgPyBoICogdC5veSAqIDAuMDEgOiB0Lm95KSAtIGggLyAyO1xuXHRcdFx0XHRcdG94ICs9IGR4IC0gKGR4ICogYSArIGR5ICogYik7XG5cdFx0XHRcdFx0b3kgKz0gZHkgLSAoZHggKiBjICsgZHkgKiBkKTtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdGlmICghY2xpcCkge1xuXHRcdFx0XHRcdG0gKz0gXCIsIHNpemluZ01ldGhvZD0nYXV0byBleHBhbmQnKVwiO1xuXHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdGR4ID0gKHcgLyAyKTtcblx0XHRcdFx0XHRkeSA9IChoIC8gMik7XG5cdFx0XHRcdFx0Ly90cmFuc2xhdGUgdG8gZW5zdXJlIHRoYXQgdHJhbnNmb3JtYXRpb25zIG9jY3VyIGFyb3VuZCB0aGUgY29ycmVjdCBvcmlnaW4gKGRlZmF1bHQgaXMgY2VudGVyKS5cblx0XHRcdFx0XHRtICs9IFwiLCBEeD1cIiArIChkeCAtIChkeCAqIGEgKyBkeSAqIGIpICsgb3gpICsgXCIsIER5PVwiICsgKGR5IC0gKGR4ICogYyArIGR5ICogZCkgKyBveSkgKyBcIilcIjtcblx0XHRcdFx0fVxuXHRcdFx0XHRpZiAoZmlsdGVycy5pbmRleE9mKFwiRFhJbWFnZVRyYW5zZm9ybS5NaWNyb3NvZnQuTWF0cml4KFwiKSAhPT0gLTEpIHtcblx0XHRcdFx0XHRzdHlsZS5maWx0ZXIgPSBmaWx0ZXJzLnJlcGxhY2UoX2llU2V0TWF0cml4RXhwLCBtKTtcblx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRzdHlsZS5maWx0ZXIgPSBtICsgXCIgXCIgKyBmaWx0ZXJzOyAvL3dlIG11c3QgYWx3YXlzIHB1dCB0aGUgdHJhbnNmb3JtL21hdHJpeCBGSVJTVCAoYmVmb3JlIGFscGhhKG9wYWNpdHk9eHgpKSB0byBhdm9pZCBhbiBJRSBidWcgdGhhdCBzbGljZXMgcGFydCBvZiB0aGUgb2JqZWN0IHdoZW4gcm90YXRpb24gaXMgYXBwbGllZCB3aXRoIGFscGhhLlxuXHRcdFx0XHR9XG5cblx0XHRcdFx0Ly9hdCB0aGUgZW5kIG9yIGJlZ2lubmluZyBvZiB0aGUgdHdlZW4sIGlmIHRoZSBtYXRyaXggaXMgbm9ybWFsICgxLCAwLCAwLCAxKSBhbmQgb3BhY2l0eSBpcyAxMDAgKG9yIGRvZXNuJ3QgZXhpc3QpLCByZW1vdmUgdGhlIGZpbHRlciB0byBpbXByb3ZlIGJyb3dzZXIgcGVyZm9ybWFuY2UuXG5cdFx0XHRcdGlmICh2ID09PSAwIHx8IHYgPT09IDEpIGlmIChhID09PSAxKSBpZiAoYiA9PT0gMCkgaWYgKGMgPT09IDApIGlmIChkID09PSAxKSBpZiAoIWNsaXAgfHwgbS5pbmRleE9mKFwiRHg9MCwgRHk9MFwiKSAhPT0gLTEpIGlmICghX29wYWNpdHlFeHAudGVzdChmaWx0ZXJzKSB8fCBwYXJzZUZsb2F0KFJlZ0V4cC4kMSkgPT09IDEwMCkgaWYgKGZpbHRlcnMuaW5kZXhPZihcImdyYWRpZW50KFwiICYmIGZpbHRlcnMuaW5kZXhPZihcIkFscGhhXCIpKSA9PT0gLTEpIHtcblx0XHRcdFx0XHRzdHlsZS5yZW1vdmVBdHRyaWJ1dGUoXCJmaWx0ZXJcIik7XG5cdFx0XHRcdH1cblxuXHRcdFx0XHQvL3dlIG11c3Qgc2V0IHRoZSBtYXJnaW5zIEFGVEVSIGFwcGx5aW5nIHRoZSBmaWx0ZXIgaW4gb3JkZXIgdG8gYXZvaWQgc29tZSBidWdzIGluIElFOCB0aGF0IGNvdWxkIChpbiByYXJlIHNjZW5hcmlvcykgY2F1c2UgdGhlbSB0byBiZSBpZ25vcmVkIGludGVybWl0dGVudGx5ICh2aWJyYXRpb24pLlxuXHRcdFx0XHRpZiAoIWNsaXApIHtcblx0XHRcdFx0XHR2YXIgbXVsdCA9IChfaWVWZXJzIDwgOCkgPyAxIDogLTEsIC8vaW4gSW50ZXJuZXQgRXhwbG9yZXIgNyBhbmQgYmVmb3JlLCB0aGUgYm94IG1vZGVsIGlzIGJyb2tlbiwgY2F1c2luZyB0aGUgYnJvd3NlciB0byB0cmVhdCB0aGUgd2lkdGgvaGVpZ2h0IG9mIHRoZSBhY3R1YWwgcm90YXRlZCBmaWx0ZXJlZCBpbWFnZSBhcyB0aGUgd2lkdGgvaGVpZ2h0IG9mIHRoZSBib3ggaXRzZWxmLCBidXQgTWljcm9zb2Z0IGNvcnJlY3RlZCB0aGF0IGluIElFOC4gV2UgbXVzdCB1c2UgYSBuZWdhdGl2ZSBvZmZzZXQgaW4gSUU4IG9uIHRoZSByaWdodC9ib3R0b21cblx0XHRcdFx0XHRcdG1hcmcsIHByb3AsIGRpZjtcblx0XHRcdFx0XHRkeCA9IHQuaWVPZmZzZXRYIHx8IDA7XG5cdFx0XHRcdFx0ZHkgPSB0LmllT2Zmc2V0WSB8fCAwO1xuXHRcdFx0XHRcdHQuaWVPZmZzZXRYID0gTWF0aC5yb3VuZCgodyAtICgoYSA8IDAgPyAtYSA6IGEpICogdyArIChiIDwgMCA/IC1iIDogYikgKiBoKSkgLyAyICsgb3gpO1xuXHRcdFx0XHRcdHQuaWVPZmZzZXRZID0gTWF0aC5yb3VuZCgoaCAtICgoZCA8IDAgPyAtZCA6IGQpICogaCArIChjIDwgMCA/IC1jIDogYykgKiB3KSkgLyAyICsgb3kpO1xuXHRcdFx0XHRcdGZvciAoaSA9IDA7IGkgPCA0OyBpKyspIHtcblx0XHRcdFx0XHRcdHByb3AgPSBfbWFyZ2luc1tpXTtcblx0XHRcdFx0XHRcdG1hcmcgPSBjc1twcm9wXTtcblx0XHRcdFx0XHRcdC8vd2UgbmVlZCB0byBnZXQgdGhlIGN1cnJlbnQgbWFyZ2luIGluIGNhc2UgaXQgaXMgYmVpbmcgdHdlZW5lZCBzZXBhcmF0ZWx5ICh3ZSB3YW50IHRvIHJlc3BlY3QgdGhhdCB0d2VlbidzIGNoYW5nZXMpXG5cdFx0XHRcdFx0XHR2YWwgPSAobWFyZy5pbmRleE9mKFwicHhcIikgIT09IC0xKSA/IHBhcnNlRmxvYXQobWFyZykgOiBfY29udmVydFRvUGl4ZWxzKHRoaXMudCwgcHJvcCwgcGFyc2VGbG9hdChtYXJnKSwgbWFyZy5yZXBsYWNlKF9zdWZmaXhFeHAsIFwiXCIpKSB8fCAwO1xuXHRcdFx0XHRcdFx0aWYgKHZhbCAhPT0gdFtwcm9wXSkge1xuXHRcdFx0XHRcdFx0XHRkaWYgPSAoaSA8IDIpID8gLXQuaWVPZmZzZXRYIDogLXQuaWVPZmZzZXRZOyAvL2lmIGFub3RoZXIgdHdlZW4gaXMgY29udHJvbGxpbmcgYSBtYXJnaW4sIHdlIGNhbm5vdCBvbmx5IGFwcGx5IHRoZSBkaWZmZXJlbmNlIGluIHRoZSBpZU9mZnNldHMsIHNvIHdlIGVzc2VudGlhbGx5IHplcm8tb3V0IHRoZSBkeCBhbmQgZHkgaGVyZSBpbiB0aGF0IGNhc2UuIFdlIHJlY29yZCB0aGUgbWFyZ2luKHMpIGxhdGVyIHNvIHRoYXQgd2UgY2FuIGtlZXAgY29tcGFyaW5nIHRoZW0sIG1ha2luZyB0aGlzIGNvZGUgdmVyeSBmbGV4aWJsZS5cblx0XHRcdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0XHRcdGRpZiA9IChpIDwgMikgPyBkeCAtIHQuaWVPZmZzZXRYIDogZHkgLSB0LmllT2Zmc2V0WTtcblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdHN0eWxlW3Byb3BdID0gKHRbcHJvcF0gPSBNYXRoLnJvdW5kKCB2YWwgLSBkaWYgKiAoKGkgPT09IDAgfHwgaSA9PT0gMikgPyAxIDogbXVsdCkgKSkgKyBcInB4XCI7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cdFx0XHR9LFxuXG5cdFx0XHQvKiB0cmFuc2xhdGVzIGEgc3VwZXIgc21hbGwgZGVjaW1hbCB0byBhIHN0cmluZyBXSVRIT1VUIHNjaWVudGlmaWMgbm90YXRpb25cblx0XHRcdF9zYWZlRGVjaW1hbCA9IGZ1bmN0aW9uKG4pIHtcblx0XHRcdFx0dmFyIHMgPSAobiA8IDAgPyAtbiA6IG4pICsgXCJcIixcblx0XHRcdFx0XHRhID0gcy5zcGxpdChcImUtXCIpO1xuXHRcdFx0XHRyZXR1cm4gKG4gPCAwID8gXCItMC5cIiA6IFwiMC5cIikgKyBuZXcgQXJyYXkocGFyc2VJbnQoYVsxXSwgMTApIHx8IDApLmpvaW4oXCIwXCIpICsgYVswXS5zcGxpdChcIi5cIikuam9pbihcIlwiKTtcblx0XHRcdH0sXG5cdFx0XHQqL1xuXG5cdFx0XHRfc2V0VHJhbnNmb3JtUmF0aW8gPSBfaW50ZXJuYWxzLnNldDNEVHJhbnNmb3JtUmF0aW8gPSBfaW50ZXJuYWxzLnNldFRyYW5zZm9ybVJhdGlvID0gZnVuY3Rpb24odikge1xuXHRcdFx0XHR2YXIgdCA9IHRoaXMuZGF0YSwgLy9yZWZlcnMgdG8gdGhlIGVsZW1lbnQncyBfZ3NUcmFuc2Zvcm0gb2JqZWN0XG5cdFx0XHRcdFx0c3R5bGUgPSB0aGlzLnQuc3R5bGUsXG5cdFx0XHRcdFx0YW5nbGUgPSB0LnJvdGF0aW9uLFxuXHRcdFx0XHRcdHJvdGF0aW9uWCA9IHQucm90YXRpb25YLFxuXHRcdFx0XHRcdHJvdGF0aW9uWSA9IHQucm90YXRpb25ZLFxuXHRcdFx0XHRcdHN4ID0gdC5zY2FsZVgsXG5cdFx0XHRcdFx0c3kgPSB0LnNjYWxlWSxcblx0XHRcdFx0XHRzeiA9IHQuc2NhbGVaLFxuXHRcdFx0XHRcdHggPSB0LngsXG5cdFx0XHRcdFx0eSA9IHQueSxcblx0XHRcdFx0XHR6ID0gdC56LFxuXHRcdFx0XHRcdGlzU1ZHID0gdC5zdmcsXG5cdFx0XHRcdFx0cGVyc3BlY3RpdmUgPSB0LnBlcnNwZWN0aXZlLFxuXHRcdFx0XHRcdGZvcmNlM0QgPSB0LmZvcmNlM0QsXG5cdFx0XHRcdFx0YTExLCBhMTIsIGExMywgYTIxLCBhMjIsIGEyMywgYTMxLCBhMzIsIGEzMywgYTQxLCBhNDIsIGE0Myxcblx0XHRcdFx0XHR6T3JpZ2luLCBtaW4sIGNvcywgc2luLCB0MSwgdDIsIHRyYW5zZm9ybSwgY29tbWEsIHplcm8sIHNrZXcsIHJuZDtcblx0XHRcdFx0Ly9jaGVjayB0byBzZWUgaWYgd2Ugc2hvdWxkIHJlbmRlciBhcyAyRCAoYW5kIFNWR3MgbXVzdCB1c2UgMkQgd2hlbiBfdXNlU1ZHVHJhbnNmb3JtQXR0ciBpcyB0cnVlKVxuXHRcdFx0XHRpZiAoKCgoKHYgPT09IDEgfHwgdiA9PT0gMCkgJiYgZm9yY2UzRCA9PT0gXCJhdXRvXCIgJiYgKHRoaXMudHdlZW4uX3RvdGFsVGltZSA9PT0gdGhpcy50d2Vlbi5fdG90YWxEdXJhdGlvbiB8fCAhdGhpcy50d2Vlbi5fdG90YWxUaW1lKSkgfHwgIWZvcmNlM0QpICYmICF6ICYmICFwZXJzcGVjdGl2ZSAmJiAhcm90YXRpb25ZICYmICFyb3RhdGlvblggJiYgc3ogPT09IDEpIHx8IChfdXNlU1ZHVHJhbnNmb3JtQXR0ciAmJiBpc1NWRykgfHwgIV9zdXBwb3J0czNEKSB7IC8vb24gdGhlIGZpbmFsIHJlbmRlciAod2hpY2ggY291bGQgYmUgMCBmb3IgYSBmcm9tIHR3ZWVuKSwgaWYgdGhlcmUgYXJlIG5vIDNEIGFzcGVjdHMsIHJlbmRlciBpbiAyRCB0byBmcmVlIHVwIG1lbW9yeSBhbmQgaW1wcm92ZSBwZXJmb3JtYW5jZSBlc3BlY2lhbGx5IG9uIG1vYmlsZSBkZXZpY2VzLiBDaGVjayB0aGUgdHdlZW4ncyB0b3RhbFRpbWUvdG90YWxEdXJhdGlvbiB0b28gaW4gb3JkZXIgdG8gbWFrZSBzdXJlIGl0IGRvZXNuJ3QgaGFwcGVuIGJldHdlZW4gcmVwZWF0cyBpZiBpdCdzIGEgcmVwZWF0aW5nIHR3ZWVuLlxuXG5cdFx0XHRcdFx0Ly8yRFxuXHRcdFx0XHRcdGlmIChhbmdsZSB8fCB0LnNrZXdYIHx8IGlzU1ZHKSB7XG5cdFx0XHRcdFx0XHRhbmdsZSAqPSBfREVHMlJBRDtcblx0XHRcdFx0XHRcdHNrZXcgPSB0LnNrZXdYICogX0RFRzJSQUQ7XG5cdFx0XHRcdFx0XHRybmQgPSAxMDAwMDA7XG5cdFx0XHRcdFx0XHRhMTEgPSBNYXRoLmNvcyhhbmdsZSkgKiBzeDtcblx0XHRcdFx0XHRcdGEyMSA9IE1hdGguc2luKGFuZ2xlKSAqIHN4O1xuXHRcdFx0XHRcdFx0YTEyID0gTWF0aC5zaW4oYW5nbGUgLSBza2V3KSAqIC1zeTtcblx0XHRcdFx0XHRcdGEyMiA9IE1hdGguY29zKGFuZ2xlIC0gc2tldykgKiBzeTtcblx0XHRcdFx0XHRcdGlmIChza2V3ICYmIHQuc2tld1R5cGUgPT09IFwic2ltcGxlXCIpIHsgLy9ieSBkZWZhdWx0LCB3ZSBjb21wZW5zYXRlIHNrZXdpbmcgb24gdGhlIG90aGVyIGF4aXMgdG8gbWFrZSBpdCBsb29rIG1vcmUgbmF0dXJhbCwgYnV0IHlvdSBjYW4gc2V0IHRoZSBza2V3VHlwZSB0byBcInNpbXBsZVwiIHRvIHVzZSB0aGUgdW5jb21wZW5zYXRlZCBza2V3aW5nIHRoYXQgQ1NTIGRvZXNcblx0XHRcdFx0XHRcdFx0dDEgPSBNYXRoLnRhbihza2V3KTtcblx0XHRcdFx0XHRcdFx0dDEgPSBNYXRoLnNxcnQoMSArIHQxICogdDEpO1xuXHRcdFx0XHRcdFx0XHRhMTIgKj0gdDE7XG5cdFx0XHRcdFx0XHRcdGEyMiAqPSB0MTtcblx0XHRcdFx0XHRcdFx0aWYgKHQuc2tld1kpIHtcblx0XHRcdFx0XHRcdFx0XHRhMTEgKj0gdDE7XG5cdFx0XHRcdFx0XHRcdFx0YTIxICo9IHQxO1xuXHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRpZiAoaXNTVkcpIHtcblx0XHRcdFx0XHRcdFx0eCArPSB0LnhPcmlnaW4gLSAodC54T3JpZ2luICogYTExICsgdC55T3JpZ2luICogYTEyKSArIHQueE9mZnNldDtcblx0XHRcdFx0XHRcdFx0eSArPSB0LnlPcmlnaW4gLSAodC54T3JpZ2luICogYTIxICsgdC55T3JpZ2luICogYTIyKSArIHQueU9mZnNldDtcblx0XHRcdFx0XHRcdFx0aWYgKF91c2VTVkdUcmFuc2Zvcm1BdHRyICYmICh0LnhQZXJjZW50IHx8IHQueVBlcmNlbnQpKSB7IC8vVGhlIFNWRyBzcGVjIGRvZXNuJ3Qgc3VwcG9ydCBwZXJjZW50YWdlLWJhc2VkIHRyYW5zbGF0aW9uIGluIHRoZSBcInRyYW5zZm9ybVwiIGF0dHJpYnV0ZSwgc28gd2UgbWVyZ2UgaXQgaW50byB0aGUgbWF0cml4IHRvIHNpbXVsYXRlIGl0LlxuXHRcdFx0XHRcdFx0XHRcdG1pbiA9IHRoaXMudC5nZXRCQm94KCk7XG5cdFx0XHRcdFx0XHRcdFx0eCArPSB0LnhQZXJjZW50ICogMC4wMSAqIG1pbi53aWR0aDtcblx0XHRcdFx0XHRcdFx0XHR5ICs9IHQueVBlcmNlbnQgKiAwLjAxICogbWluLmhlaWdodDtcblx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0XHRtaW4gPSAwLjAwMDAwMTtcblx0XHRcdFx0XHRcdFx0aWYgKHggPCBtaW4pIGlmICh4ID4gLW1pbikge1xuXHRcdFx0XHRcdFx0XHRcdHggPSAwO1xuXHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRcdGlmICh5IDwgbWluKSBpZiAoeSA+IC1taW4pIHtcblx0XHRcdFx0XHRcdFx0XHR5ID0gMDtcblx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0dHJhbnNmb3JtID0gKCgoYTExICogcm5kKSB8IDApIC8gcm5kKSArIFwiLFwiICsgKCgoYTIxICogcm5kKSB8IDApIC8gcm5kKSArIFwiLFwiICsgKCgoYTEyICogcm5kKSB8IDApIC8gcm5kKSArIFwiLFwiICsgKCgoYTIyICogcm5kKSB8IDApIC8gcm5kKSArIFwiLFwiICsgeCArIFwiLFwiICsgeSArIFwiKVwiO1xuXHRcdFx0XHRcdFx0aWYgKGlzU1ZHICYmIF91c2VTVkdUcmFuc2Zvcm1BdHRyKSB7XG5cdFx0XHRcdFx0XHRcdHRoaXMudC5zZXRBdHRyaWJ1dGUoXCJ0cmFuc2Zvcm1cIiwgXCJtYXRyaXgoXCIgKyB0cmFuc2Zvcm0pO1xuXHRcdFx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRcdFx0Ly9zb21lIGJyb3dzZXJzIGhhdmUgYSBoYXJkIHRpbWUgd2l0aCB2ZXJ5IHNtYWxsIHZhbHVlcyBsaWtlIDIuNDQ5MjkzNTk4Mjk0NzA2NGUtMTYgKG5vdGljZSB0aGUgXCJlLVwiIHRvd2FyZHMgdGhlIGVuZCkgYW5kIHdvdWxkIHJlbmRlciB0aGUgb2JqZWN0IHNsaWdodGx5IG9mZi4gU28gd2Ugcm91bmQgdG8gNSBkZWNpbWFsIHBsYWNlcy5cblx0XHRcdFx0XHRcdFx0c3R5bGVbX3RyYW5zZm9ybVByb3BdID0gKCh0LnhQZXJjZW50IHx8IHQueVBlcmNlbnQpID8gXCJ0cmFuc2xhdGUoXCIgKyB0LnhQZXJjZW50ICsgXCIlLFwiICsgdC55UGVyY2VudCArIFwiJSkgbWF0cml4KFwiIDogXCJtYXRyaXgoXCIpICsgdHJhbnNmb3JtO1xuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0XHRzdHlsZVtfdHJhbnNmb3JtUHJvcF0gPSAoKHQueFBlcmNlbnQgfHwgdC55UGVyY2VudCkgPyBcInRyYW5zbGF0ZShcIiArIHQueFBlcmNlbnQgKyBcIiUsXCIgKyB0LnlQZXJjZW50ICsgXCIlKSBtYXRyaXgoXCIgOiBcIm1hdHJpeChcIikgKyBzeCArIFwiLDAsMCxcIiArIHN5ICsgXCIsXCIgKyB4ICsgXCIsXCIgKyB5ICsgXCIpXCI7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdHJldHVybjtcblxuXHRcdFx0XHR9XG5cdFx0XHRcdGlmIChfaXNGaXJlZm94KSB7IC8vRmlyZWZveCBoYXMgYSBidWcgKGF0IGxlYXN0IGluIHYyNSkgdGhhdCBjYXVzZXMgaXQgdG8gcmVuZGVyIHRoZSB0cmFuc3BhcmVudCBwYXJ0IG9mIDMyLWJpdCBQTkcgaW1hZ2VzIGFzIGJsYWNrIHdoZW4gZGlzcGxheWVkIGluc2lkZSBhbiBpZnJhbWUgYW5kIHRoZSAzRCBzY2FsZSBpcyB2ZXJ5IHNtYWxsIGFuZCBkb2Vzbid0IGNoYW5nZSBzdWZmaWNpZW50bHkgZW5vdWdoIGJldHdlZW4gcmVuZGVycyAobGlrZSBpZiB5b3UgdXNlIGEgUG93ZXI0LmVhc2VJbk91dCB0byBzY2FsZSBmcm9tIDAgdG8gMSB3aGVyZSB0aGUgYmVnaW5uaW5nIHZhbHVlcyBvbmx5IGNoYW5nZSBhIHRpbnkgYW1vdW50IHRvIGJlZ2luIHRoZSB0d2VlbiBiZWZvcmUgYWNjZWxlcmF0aW5nKS4gSW4gdGhpcyBjYXNlLCB3ZSBmb3JjZSB0aGUgc2NhbGUgdG8gYmUgMC4wMDAwMiBpbnN0ZWFkIHdoaWNoIGlzIHZpc3VhbGx5IHRoZSBzYW1lIGJ1dCB3b3JrcyBhcm91bmQgdGhlIEZpcmVmb3ggaXNzdWUuXG5cdFx0XHRcdFx0bWluID0gMC4wMDAxO1xuXHRcdFx0XHRcdGlmIChzeCA8IG1pbiAmJiBzeCA+IC1taW4pIHtcblx0XHRcdFx0XHRcdHN4ID0gc3ogPSAwLjAwMDAyO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHRpZiAoc3kgPCBtaW4gJiYgc3kgPiAtbWluKSB7XG5cdFx0XHRcdFx0XHRzeSA9IHN6ID0gMC4wMDAwMjtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0aWYgKHBlcnNwZWN0aXZlICYmICF0LnogJiYgIXQucm90YXRpb25YICYmICF0LnJvdGF0aW9uWSkgeyAvL0ZpcmVmb3ggaGFzIGEgYnVnIHRoYXQgY2F1c2VzIGVsZW1lbnRzIHRvIGhhdmUgYW4gb2RkIHN1cGVyLXRoaW4sIGJyb2tlbi9kb3R0ZWQgYmxhY2sgYm9yZGVyIG9uIGVsZW1lbnRzIHRoYXQgaGF2ZSBhIHBlcnNwZWN0aXZlIHNldCBidXQgYXJlbid0IHV0aWxpemluZyAzRCBzcGFjZSAobm8gcm90YXRpb25YLCByb3RhdGlvblksIG9yIHopLlxuXHRcdFx0XHRcdFx0cGVyc3BlY3RpdmUgPSAwO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXHRcdFx0XHRpZiAoYW5nbGUgfHwgdC5za2V3WCkge1xuXHRcdFx0XHRcdGFuZ2xlICo9IF9ERUcyUkFEO1xuXHRcdFx0XHRcdGNvcyA9IGExMSA9IE1hdGguY29zKGFuZ2xlKTtcblx0XHRcdFx0XHRzaW4gPSBhMjEgPSBNYXRoLnNpbihhbmdsZSk7XG5cdFx0XHRcdFx0aWYgKHQuc2tld1gpIHtcblx0XHRcdFx0XHRcdGFuZ2xlIC09IHQuc2tld1ggKiBfREVHMlJBRDtcblx0XHRcdFx0XHRcdGNvcyA9IE1hdGguY29zKGFuZ2xlKTtcblx0XHRcdFx0XHRcdHNpbiA9IE1hdGguc2luKGFuZ2xlKTtcblx0XHRcdFx0XHRcdGlmICh0LnNrZXdUeXBlID09PSBcInNpbXBsZVwiKSB7IC8vYnkgZGVmYXVsdCwgd2UgY29tcGVuc2F0ZSBza2V3aW5nIG9uIHRoZSBvdGhlciBheGlzIHRvIG1ha2UgaXQgbG9vayBtb3JlIG5hdHVyYWwsIGJ1dCB5b3UgY2FuIHNldCB0aGUgc2tld1R5cGUgdG8gXCJzaW1wbGVcIiB0byB1c2UgdGhlIHVuY29tcGVuc2F0ZWQgc2tld2luZyB0aGF0IENTUyBkb2VzXG5cdFx0XHRcdFx0XHRcdHQxID0gTWF0aC50YW4odC5za2V3WCAqIF9ERUcyUkFEKTtcblx0XHRcdFx0XHRcdFx0dDEgPSBNYXRoLnNxcnQoMSArIHQxICogdDEpO1xuXHRcdFx0XHRcdFx0XHRjb3MgKj0gdDE7XG5cdFx0XHRcdFx0XHRcdHNpbiAqPSB0MTtcblx0XHRcdFx0XHRcdFx0aWYgKHQuc2tld1kpIHtcblx0XHRcdFx0XHRcdFx0XHRhMTEgKj0gdDE7XG5cdFx0XHRcdFx0XHRcdFx0YTIxICo9IHQxO1xuXHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdGExMiA9IC1zaW47XG5cdFx0XHRcdFx0YTIyID0gY29zO1xuXG5cdFx0XHRcdH0gZWxzZSBpZiAoIXJvdGF0aW9uWSAmJiAhcm90YXRpb25YICYmIHN6ID09PSAxICYmICFwZXJzcGVjdGl2ZSAmJiAhaXNTVkcpIHsgLy9pZiB3ZSdyZSBvbmx5IHRyYW5zbGF0aW5nIGFuZC9vciAyRCBzY2FsaW5nLCB0aGlzIGlzIGZhc3Rlci4uLlxuXHRcdFx0XHRcdHN0eWxlW190cmFuc2Zvcm1Qcm9wXSA9ICgodC54UGVyY2VudCB8fCB0LnlQZXJjZW50KSA/IFwidHJhbnNsYXRlKFwiICsgdC54UGVyY2VudCArIFwiJSxcIiArIHQueVBlcmNlbnQgKyBcIiUpIHRyYW5zbGF0ZTNkKFwiIDogXCJ0cmFuc2xhdGUzZChcIikgKyB4ICsgXCJweCxcIiArIHkgKyBcInB4LFwiICsgeiArXCJweClcIiArICgoc3ggIT09IDEgfHwgc3kgIT09IDEpID8gXCIgc2NhbGUoXCIgKyBzeCArIFwiLFwiICsgc3kgKyBcIilcIiA6IFwiXCIpO1xuXHRcdFx0XHRcdHJldHVybjtcblx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRhMTEgPSBhMjIgPSAxO1xuXHRcdFx0XHRcdGExMiA9IGEyMSA9IDA7XG5cdFx0XHRcdH1cblx0XHRcdFx0Ly8gS0VZICBJTkRFWCAgIEFGRkVDVFNcblx0XHRcdFx0Ly8gYTExICAwICAgICAgIHJvdGF0aW9uLCByb3RhdGlvblksIHNjYWxlWFxuXHRcdFx0XHQvLyBhMjEgIDEgICAgICAgcm90YXRpb24sIHJvdGF0aW9uWSwgc2NhbGVYXG5cdFx0XHRcdC8vIGEzMSAgMiAgICAgICByb3RhdGlvblksIHNjYWxlWFxuXHRcdFx0XHQvLyBhNDEgIDMgICAgICAgcm90YXRpb25ZLCBzY2FsZVhcblx0XHRcdFx0Ly8gYTEyICA0ICAgICAgIHJvdGF0aW9uLCBza2V3WCwgcm90YXRpb25YLCBzY2FsZVlcblx0XHRcdFx0Ly8gYTIyICA1ICAgICAgIHJvdGF0aW9uLCBza2V3WCwgcm90YXRpb25YLCBzY2FsZVlcblx0XHRcdFx0Ly8gYTMyICA2ICAgICAgIHJvdGF0aW9uWCwgc2NhbGVZXG5cdFx0XHRcdC8vIGE0MiAgNyAgICAgICByb3RhdGlvblgsIHNjYWxlWVxuXHRcdFx0XHQvLyBhMTMgIDggICAgICAgcm90YXRpb25ZLCByb3RhdGlvblgsIHNjYWxlWlxuXHRcdFx0XHQvLyBhMjMgIDkgICAgICAgcm90YXRpb25ZLCByb3RhdGlvblgsIHNjYWxlWlxuXHRcdFx0XHQvLyBhMzMgIDEwICAgICAgcm90YXRpb25ZLCByb3RhdGlvblgsIHNjYWxlWlxuXHRcdFx0XHQvLyBhNDMgIDExICAgICAgcm90YXRpb25ZLCByb3RhdGlvblgsIHBlcnNwZWN0aXZlLCBzY2FsZVpcblx0XHRcdFx0Ly8gYTE0ICAxMiAgICAgIHgsIHpPcmlnaW4sIHN2Z09yaWdpblxuXHRcdFx0XHQvLyBhMjQgIDEzICAgICAgeSwgek9yaWdpbiwgc3ZnT3JpZ2luXG5cdFx0XHRcdC8vIGEzNCAgMTQgICAgICB6LCB6T3JpZ2luXG5cdFx0XHRcdC8vIGE0NCAgMTVcblx0XHRcdFx0Ly8gcm90YXRpb246IE1hdGguYXRhbjIoYTIxLCBhMTEpXG5cdFx0XHRcdC8vIHJvdGF0aW9uWTogTWF0aC5hdGFuMihhMTMsIGEzMykgKG9yIE1hdGguYXRhbjIoYTEzLCBhMTEpKVxuXHRcdFx0XHQvLyByb3RhdGlvblg6IE1hdGguYXRhbjIoYTMyLCBhMzMpXG5cdFx0XHRcdGEzMyA9IDE7XG5cdFx0XHRcdGExMyA9IGEyMyA9IGEzMSA9IGEzMiA9IGE0MSA9IGE0MiA9IDA7XG5cdFx0XHRcdGE0MyA9IChwZXJzcGVjdGl2ZSkgPyAtMSAvIHBlcnNwZWN0aXZlIDogMDtcblx0XHRcdFx0ek9yaWdpbiA9IHQuek9yaWdpbjtcblx0XHRcdFx0bWluID0gMC4wMDAwMDE7IC8vdGhyZXNob2xkIGJlbG93IHdoaWNoIGJyb3dzZXJzIHVzZSBzY2llbnRpZmljIG5vdGF0aW9uIHdoaWNoIHdvbid0IHdvcmsuXG5cdFx0XHRcdGNvbW1hID0gXCIsXCI7XG5cdFx0XHRcdHplcm8gPSBcIjBcIjtcblx0XHRcdFx0YW5nbGUgPSByb3RhdGlvblkgKiBfREVHMlJBRDtcblx0XHRcdFx0aWYgKGFuZ2xlKSB7XG5cdFx0XHRcdFx0Y29zID0gTWF0aC5jb3MoYW5nbGUpO1xuXHRcdFx0XHRcdHNpbiA9IE1hdGguc2luKGFuZ2xlKTtcblx0XHRcdFx0XHRhMzEgPSAtc2luO1xuXHRcdFx0XHRcdGE0MSA9IGE0Myotc2luO1xuXHRcdFx0XHRcdGExMyA9IGExMSpzaW47XG5cdFx0XHRcdFx0YTIzID0gYTIxKnNpbjtcblx0XHRcdFx0XHRhMzMgPSBjb3M7XG5cdFx0XHRcdFx0YTQzICo9IGNvcztcblx0XHRcdFx0XHRhMTEgKj0gY29zO1xuXHRcdFx0XHRcdGEyMSAqPSBjb3M7XG5cdFx0XHRcdH1cblx0XHRcdFx0YW5nbGUgPSByb3RhdGlvblggKiBfREVHMlJBRDtcblx0XHRcdFx0aWYgKGFuZ2xlKSB7XG5cdFx0XHRcdFx0Y29zID0gTWF0aC5jb3MoYW5nbGUpO1xuXHRcdFx0XHRcdHNpbiA9IE1hdGguc2luKGFuZ2xlKTtcblx0XHRcdFx0XHR0MSA9IGExMipjb3MrYTEzKnNpbjtcblx0XHRcdFx0XHR0MiA9IGEyMipjb3MrYTIzKnNpbjtcblx0XHRcdFx0XHRhMzIgPSBhMzMqc2luO1xuXHRcdFx0XHRcdGE0MiA9IGE0MypzaW47XG5cdFx0XHRcdFx0YTEzID0gYTEyKi1zaW4rYTEzKmNvcztcblx0XHRcdFx0XHRhMjMgPSBhMjIqLXNpbithMjMqY29zO1xuXHRcdFx0XHRcdGEzMyA9IGEzMypjb3M7XG5cdFx0XHRcdFx0YTQzID0gYTQzKmNvcztcblx0XHRcdFx0XHRhMTIgPSB0MTtcblx0XHRcdFx0XHRhMjIgPSB0Mjtcblx0XHRcdFx0fVxuXHRcdFx0XHRpZiAoc3ogIT09IDEpIHtcblx0XHRcdFx0XHRhMTMqPXN6O1xuXHRcdFx0XHRcdGEyMyo9c3o7XG5cdFx0XHRcdFx0YTMzKj1zejtcblx0XHRcdFx0XHRhNDMqPXN6O1xuXHRcdFx0XHR9XG5cdFx0XHRcdGlmIChzeSAhPT0gMSkge1xuXHRcdFx0XHRcdGExMio9c3k7XG5cdFx0XHRcdFx0YTIyKj1zeTtcblx0XHRcdFx0XHRhMzIqPXN5O1xuXHRcdFx0XHRcdGE0Mio9c3k7XG5cdFx0XHRcdH1cblx0XHRcdFx0aWYgKHN4ICE9PSAxKSB7XG5cdFx0XHRcdFx0YTExKj1zeDtcblx0XHRcdFx0XHRhMjEqPXN4O1xuXHRcdFx0XHRcdGEzMSo9c3g7XG5cdFx0XHRcdFx0YTQxKj1zeDtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdGlmICh6T3JpZ2luIHx8IGlzU1ZHKSB7XG5cdFx0XHRcdFx0aWYgKHpPcmlnaW4pIHtcblx0XHRcdFx0XHRcdHggKz0gYTEzKi16T3JpZ2luO1xuXHRcdFx0XHRcdFx0eSArPSBhMjMqLXpPcmlnaW47XG5cdFx0XHRcdFx0XHR6ICs9IGEzMyotek9yaWdpbit6T3JpZ2luO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHRpZiAoaXNTVkcpIHsgLy9kdWUgdG8gYnVncyBpbiBzb21lIGJyb3dzZXJzLCB3ZSBuZWVkIHRvIG1hbmFnZSB0aGUgdHJhbnNmb3JtLW9yaWdpbiBvZiBTVkcgbWFudWFsbHlcblx0XHRcdFx0XHRcdHggKz0gdC54T3JpZ2luIC0gKHQueE9yaWdpbiAqIGExMSArIHQueU9yaWdpbiAqIGExMikgKyB0LnhPZmZzZXQ7XG5cdFx0XHRcdFx0XHR5ICs9IHQueU9yaWdpbiAtICh0LnhPcmlnaW4gKiBhMjEgKyB0LnlPcmlnaW4gKiBhMjIpICsgdC55T2Zmc2V0O1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHRpZiAoeCA8IG1pbiAmJiB4ID4gLW1pbikge1xuXHRcdFx0XHRcdFx0eCA9IHplcm87XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdGlmICh5IDwgbWluICYmIHkgPiAtbWluKSB7XG5cdFx0XHRcdFx0XHR5ID0gemVybztcblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0aWYgKHogPCBtaW4gJiYgeiA+IC1taW4pIHtcblx0XHRcdFx0XHRcdHogPSAwOyAvL2Rvbid0IHVzZSBzdHJpbmcgYmVjYXVzZSB3ZSBjYWxjdWxhdGUgcGVyc3BlY3RpdmUgbGF0ZXIgYW5kIG5lZWQgdGhlIG51bWJlci5cblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblxuXHRcdFx0XHQvL29wdGltaXplZCB3YXkgb2YgY29uY2F0ZW5hdGluZyBhbGwgdGhlIHZhbHVlcyBpbnRvIGEgc3RyaW5nLiBJZiB3ZSBkbyBpdCBhbGwgaW4gb25lIHNob3QsIGl0J3Mgc2xvd2VyIGJlY2F1c2Ugb2YgdGhlIHdheSBicm93c2VycyBoYXZlIHRvIGNyZWF0ZSB0ZW1wIHN0cmluZ3MgYW5kIHRoZSB3YXkgaXQgYWZmZWN0cyBtZW1vcnkuIElmIHdlIGRvIGl0IHBpZWNlLWJ5LXBpZWNlIHdpdGggKz0sIGl0J3MgYSBiaXQgc2xvd2VyIHRvby4gV2UgZm91bmQgdGhhdCBkb2luZyBpdCBpbiB0aGVzZSBzaXplZCBjaHVua3Mgd29ya3MgYmVzdCBvdmVyYWxsOlxuXHRcdFx0XHR0cmFuc2Zvcm0gPSAoKHQueFBlcmNlbnQgfHwgdC55UGVyY2VudCkgPyBcInRyYW5zbGF0ZShcIiArIHQueFBlcmNlbnQgKyBcIiUsXCIgKyB0LnlQZXJjZW50ICsgXCIlKSBtYXRyaXgzZChcIiA6IFwibWF0cml4M2QoXCIpO1xuXHRcdFx0XHR0cmFuc2Zvcm0gKz0gKChhMTEgPCBtaW4gJiYgYTExID4gLW1pbikgPyB6ZXJvIDogYTExKSArIGNvbW1hICsgKChhMjEgPCBtaW4gJiYgYTIxID4gLW1pbikgPyB6ZXJvIDogYTIxKSArIGNvbW1hICsgKChhMzEgPCBtaW4gJiYgYTMxID4gLW1pbikgPyB6ZXJvIDogYTMxKTtcblx0XHRcdFx0dHJhbnNmb3JtICs9IGNvbW1hICsgKChhNDEgPCBtaW4gJiYgYTQxID4gLW1pbikgPyB6ZXJvIDogYTQxKSArIGNvbW1hICsgKChhMTIgPCBtaW4gJiYgYTEyID4gLW1pbikgPyB6ZXJvIDogYTEyKSArIGNvbW1hICsgKChhMjIgPCBtaW4gJiYgYTIyID4gLW1pbikgPyB6ZXJvIDogYTIyKTtcblx0XHRcdFx0aWYgKHJvdGF0aW9uWCB8fCByb3RhdGlvblkgfHwgc3ogIT09IDEpIHsgLy9wZXJmb3JtYW5jZSBvcHRpbWl6YXRpb24gKG9mdGVuIHRoZXJlJ3Mgbm8gcm90YXRpb25YIG9yIHJvdGF0aW9uWSwgc28gd2UgY2FuIHNraXAgdGhlc2UgY2FsY3VsYXRpb25zKVxuXHRcdFx0XHRcdHRyYW5zZm9ybSArPSBjb21tYSArICgoYTMyIDwgbWluICYmIGEzMiA+IC1taW4pID8gemVybyA6IGEzMikgKyBjb21tYSArICgoYTQyIDwgbWluICYmIGE0MiA+IC1taW4pID8gemVybyA6IGE0MikgKyBjb21tYSArICgoYTEzIDwgbWluICYmIGExMyA+IC1taW4pID8gemVybyA6IGExMyk7XG5cdFx0XHRcdFx0dHJhbnNmb3JtICs9IGNvbW1hICsgKChhMjMgPCBtaW4gJiYgYTIzID4gLW1pbikgPyB6ZXJvIDogYTIzKSArIGNvbW1hICsgKChhMzMgPCBtaW4gJiYgYTMzID4gLW1pbikgPyB6ZXJvIDogYTMzKSArIGNvbW1hICsgKChhNDMgPCBtaW4gJiYgYTQzID4gLW1pbikgPyB6ZXJvIDogYTQzKSArIGNvbW1hO1xuXHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdHRyYW5zZm9ybSArPSBcIiwwLDAsMCwwLDEsMCxcIjtcblx0XHRcdFx0fVxuXHRcdFx0XHR0cmFuc2Zvcm0gKz0geCArIGNvbW1hICsgeSArIGNvbW1hICsgeiArIGNvbW1hICsgKHBlcnNwZWN0aXZlID8gKDEgKyAoLXogLyBwZXJzcGVjdGl2ZSkpIDogMSkgKyBcIilcIjtcblxuXHRcdFx0XHRzdHlsZVtfdHJhbnNmb3JtUHJvcF0gPSB0cmFuc2Zvcm07XG5cdFx0XHR9O1xuXG5cdFx0cCA9IFRyYW5zZm9ybS5wcm90b3R5cGU7XG5cdFx0cC54ID0gcC55ID0gcC56ID0gcC5za2V3WCA9IHAuc2tld1kgPSBwLnJvdGF0aW9uID0gcC5yb3RhdGlvblggPSBwLnJvdGF0aW9uWSA9IHAuek9yaWdpbiA9IHAueFBlcmNlbnQgPSBwLnlQZXJjZW50ID0gcC54T2Zmc2V0ID0gcC55T2Zmc2V0ID0gMDtcblx0XHRwLnNjYWxlWCA9IHAuc2NhbGVZID0gcC5zY2FsZVogPSAxO1xuXG5cdFx0X3JlZ2lzdGVyQ29tcGxleFNwZWNpYWxQcm9wKFwidHJhbnNmb3JtLHNjYWxlLHNjYWxlWCxzY2FsZVksc2NhbGVaLHgseSx6LHJvdGF0aW9uLHJvdGF0aW9uWCxyb3RhdGlvblkscm90YXRpb25aLHNrZXdYLHNrZXdZLHNob3J0Um90YXRpb24sc2hvcnRSb3RhdGlvblgsc2hvcnRSb3RhdGlvblksc2hvcnRSb3RhdGlvblosdHJhbnNmb3JtT3JpZ2luLHN2Z09yaWdpbix0cmFuc2Zvcm1QZXJzcGVjdGl2ZSxkaXJlY3Rpb25hbFJvdGF0aW9uLHBhcnNlVHJhbnNmb3JtLGZvcmNlM0Qsc2tld1R5cGUseFBlcmNlbnQseVBlcmNlbnQsc21vb3RoT3JpZ2luXCIsIHtwYXJzZXI6ZnVuY3Rpb24odCwgZSwgcCwgY3NzcCwgcHQsIHBsdWdpbiwgdmFycykge1xuXHRcdFx0aWYgKGNzc3AuX2xhc3RQYXJzZWRUcmFuc2Zvcm0gPT09IHZhcnMpIHsgcmV0dXJuIHB0OyB9IC8vb25seSBuZWVkIHRvIHBhcnNlIHRoZSB0cmFuc2Zvcm0gb25jZSwgYW5kIG9ubHkgaWYgdGhlIGJyb3dzZXIgc3VwcG9ydHMgaXQuXG5cdFx0XHRjc3NwLl9sYXN0UGFyc2VkVHJhbnNmb3JtID0gdmFycztcblx0XHRcdHZhciBvcmlnaW5hbEdTVHJhbnNmb3JtID0gdC5fZ3NUcmFuc2Zvcm0sXG5cdFx0XHRcdHN0eWxlID0gdC5zdHlsZSxcblx0XHRcdFx0bWluID0gMC4wMDAwMDEsXG5cdFx0XHRcdGkgPSBfdHJhbnNmb3JtUHJvcHMubGVuZ3RoLFxuXHRcdFx0XHR2ID0gdmFycyxcblx0XHRcdFx0ZW5kUm90YXRpb25zID0ge30sXG5cdFx0XHRcdHRyYW5zZm9ybU9yaWdpblN0cmluZyA9IFwidHJhbnNmb3JtT3JpZ2luXCIsXG5cdFx0XHRcdG0xLCBtMiwgc2tld1ksIGNvcHksIG9yaWcsIGhhczNELCBoYXNDaGFuZ2UsIGRyLCB4LCB5O1xuXHRcdFx0aWYgKHZhcnMuZGlzcGxheSkgeyAvL2lmIHRoZSB1c2VyIGlzIHNldHRpbmcgZGlzcGxheSBkdXJpbmcgdGhpcyB0d2VlbiwgaXQgbWF5IG5vdCBiZSBpbnN0YW50aWF0ZWQgeWV0IGJ1dCB3ZSBtdXN0IGZvcmNlIGl0IGhlcmUgaW4gb3JkZXIgdG8gZ2V0IGFjY3VyYXRlIHJlYWRpbmdzLiBJZiBkaXNwbGF5IGlzIFwibm9uZVwiLCBzb21lIGJyb3dzZXJzIHJlZnVzZSB0byByZXBvcnQgdGhlIHRyYW5zZm9ybSBwcm9wZXJ0aWVzIGNvcnJlY3RseS5cblx0XHRcdFx0Y29weSA9IF9nZXRTdHlsZSh0LCBcImRpc3BsYXlcIik7XG5cdFx0XHRcdHN0eWxlLmRpc3BsYXkgPSBcImJsb2NrXCI7XG5cdFx0XHRcdG0xID0gX2dldFRyYW5zZm9ybSh0LCBfY3MsIHRydWUsIHZhcnMucGFyc2VUcmFuc2Zvcm0pO1xuXHRcdFx0XHRzdHlsZS5kaXNwbGF5ID0gY29weTtcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdG0xID0gX2dldFRyYW5zZm9ybSh0LCBfY3MsIHRydWUsIHZhcnMucGFyc2VUcmFuc2Zvcm0pO1xuXHRcdFx0fVxuXHRcdFx0Y3NzcC5fdHJhbnNmb3JtID0gbTE7XG5cdFx0XHRpZiAodHlwZW9mKHYudHJhbnNmb3JtKSA9PT0gXCJzdHJpbmdcIiAmJiBfdHJhbnNmb3JtUHJvcCkgeyAvL2ZvciB2YWx1ZXMgbGlrZSB0cmFuc2Zvcm06XCJyb3RhdGUoNjBkZWcpIHNjYWxlKDAuNSwgMC44KVwiXG5cdFx0XHRcdGNvcHkgPSBfdGVtcERpdi5zdHlsZTsgLy9kb24ndCB1c2UgdGhlIG9yaWdpbmFsIHRhcmdldCBiZWNhdXNlIGl0IG1pZ2h0IGJlIFNWRyBpbiB3aGljaCBjYXNlIHNvbWUgYnJvd3NlcnMgZG9uJ3QgcmVwb3J0IGNvbXB1dGVkIHN0eWxlIGNvcnJlY3RseS5cblx0XHRcdFx0Y29weVtfdHJhbnNmb3JtUHJvcF0gPSB2LnRyYW5zZm9ybTtcblx0XHRcdFx0Y29weS5kaXNwbGF5ID0gXCJibG9ja1wiOyAvL2lmIGRpc3BsYXkgaXMgXCJub25lXCIsIHRoZSBicm93c2VyIG9mdGVuIHJlZnVzZXMgdG8gcmVwb3J0IHRoZSB0cmFuc2Zvcm0gcHJvcGVydGllcyBjb3JyZWN0bHkuXG5cdFx0XHRcdGNvcHkucG9zaXRpb24gPSBcImFic29sdXRlXCI7XG5cdFx0XHRcdF9kb2MuYm9keS5hcHBlbmRDaGlsZChfdGVtcERpdik7XG5cdFx0XHRcdG0yID0gX2dldFRyYW5zZm9ybShfdGVtcERpdiwgbnVsbCwgZmFsc2UpO1xuXHRcdFx0XHRfZG9jLmJvZHkucmVtb3ZlQ2hpbGQoX3RlbXBEaXYpO1xuXHRcdFx0XHRpZiAoIW0yLnBlcnNwZWN0aXZlKSB7XG5cdFx0XHRcdFx0bTIucGVyc3BlY3RpdmUgPSBtMS5wZXJzcGVjdGl2ZTsgLy90d2VlbmluZyB0byBubyBwZXJzcGVjdGl2ZSBnaXZlcyB2ZXJ5IHVuaW50dWl0aXZlIHJlc3VsdHMgLSBqdXN0IGtlZXAgdGhlIHNhbWUgcGVyc3BlY3RpdmUgaW4gdGhhdCBjYXNlLlxuXHRcdFx0XHR9XG5cdFx0XHRcdGlmICh2LnhQZXJjZW50ICE9IG51bGwpIHtcblx0XHRcdFx0XHRtMi54UGVyY2VudCA9IF9wYXJzZVZhbCh2LnhQZXJjZW50LCBtMS54UGVyY2VudCk7XG5cdFx0XHRcdH1cblx0XHRcdFx0aWYgKHYueVBlcmNlbnQgIT0gbnVsbCkge1xuXHRcdFx0XHRcdG0yLnlQZXJjZW50ID0gX3BhcnNlVmFsKHYueVBlcmNlbnQsIG0xLnlQZXJjZW50KTtcblx0XHRcdFx0fVxuXHRcdFx0fSBlbHNlIGlmICh0eXBlb2YodikgPT09IFwib2JqZWN0XCIpIHsgLy9mb3IgdmFsdWVzIGxpa2Ugc2NhbGVYLCBzY2FsZVksIHJvdGF0aW9uLCB4LCB5LCBza2V3WCwgYW5kIHNrZXdZIG9yIHRyYW5zZm9ybTp7Li4ufSAob2JqZWN0KVxuXHRcdFx0XHRtMiA9IHtzY2FsZVg6X3BhcnNlVmFsKCh2LnNjYWxlWCAhPSBudWxsKSA/IHYuc2NhbGVYIDogdi5zY2FsZSwgbTEuc2NhbGVYKSxcblx0XHRcdFx0XHRzY2FsZVk6X3BhcnNlVmFsKCh2LnNjYWxlWSAhPSBudWxsKSA/IHYuc2NhbGVZIDogdi5zY2FsZSwgbTEuc2NhbGVZKSxcblx0XHRcdFx0XHRzY2FsZVo6X3BhcnNlVmFsKHYuc2NhbGVaLCBtMS5zY2FsZVopLFxuXHRcdFx0XHRcdHg6X3BhcnNlVmFsKHYueCwgbTEueCksXG5cdFx0XHRcdFx0eTpfcGFyc2VWYWwodi55LCBtMS55KSxcblx0XHRcdFx0XHR6Ol9wYXJzZVZhbCh2LnosIG0xLnopLFxuXHRcdFx0XHRcdHhQZXJjZW50Ol9wYXJzZVZhbCh2LnhQZXJjZW50LCBtMS54UGVyY2VudCksXG5cdFx0XHRcdFx0eVBlcmNlbnQ6X3BhcnNlVmFsKHYueVBlcmNlbnQsIG0xLnlQZXJjZW50KSxcblx0XHRcdFx0XHRwZXJzcGVjdGl2ZTpfcGFyc2VWYWwodi50cmFuc2Zvcm1QZXJzcGVjdGl2ZSwgbTEucGVyc3BlY3RpdmUpfTtcblx0XHRcdFx0ZHIgPSB2LmRpcmVjdGlvbmFsUm90YXRpb247XG5cdFx0XHRcdGlmIChkciAhPSBudWxsKSB7XG5cdFx0XHRcdFx0aWYgKHR5cGVvZihkcikgPT09IFwib2JqZWN0XCIpIHtcblx0XHRcdFx0XHRcdGZvciAoY29weSBpbiBkcikge1xuXHRcdFx0XHRcdFx0XHR2W2NvcHldID0gZHJbY29weV07XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRcdHYucm90YXRpb24gPSBkcjtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblx0XHRcdFx0aWYgKHR5cGVvZih2LngpID09PSBcInN0cmluZ1wiICYmIHYueC5pbmRleE9mKFwiJVwiKSAhPT0gLTEpIHtcblx0XHRcdFx0XHRtMi54ID0gMDtcblx0XHRcdFx0XHRtMi54UGVyY2VudCA9IF9wYXJzZVZhbCh2LngsIG0xLnhQZXJjZW50KTtcblx0XHRcdFx0fVxuXHRcdFx0XHRpZiAodHlwZW9mKHYueSkgPT09IFwic3RyaW5nXCIgJiYgdi55LmluZGV4T2YoXCIlXCIpICE9PSAtMSkge1xuXHRcdFx0XHRcdG0yLnkgPSAwO1xuXHRcdFx0XHRcdG0yLnlQZXJjZW50ID0gX3BhcnNlVmFsKHYueSwgbTEueVBlcmNlbnQpO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0bTIucm90YXRpb24gPSBfcGFyc2VBbmdsZSgoXCJyb3RhdGlvblwiIGluIHYpID8gdi5yb3RhdGlvbiA6IChcInNob3J0Um90YXRpb25cIiBpbiB2KSA/IHYuc2hvcnRSb3RhdGlvbiArIFwiX3Nob3J0XCIgOiAoXCJyb3RhdGlvblpcIiBpbiB2KSA/IHYucm90YXRpb25aIDogbTEucm90YXRpb24sIG0xLnJvdGF0aW9uLCBcInJvdGF0aW9uXCIsIGVuZFJvdGF0aW9ucyk7XG5cdFx0XHRcdGlmIChfc3VwcG9ydHMzRCkge1xuXHRcdFx0XHRcdG0yLnJvdGF0aW9uWCA9IF9wYXJzZUFuZ2xlKChcInJvdGF0aW9uWFwiIGluIHYpID8gdi5yb3RhdGlvblggOiAoXCJzaG9ydFJvdGF0aW9uWFwiIGluIHYpID8gdi5zaG9ydFJvdGF0aW9uWCArIFwiX3Nob3J0XCIgOiBtMS5yb3RhdGlvblggfHwgMCwgbTEucm90YXRpb25YLCBcInJvdGF0aW9uWFwiLCBlbmRSb3RhdGlvbnMpO1xuXHRcdFx0XHRcdG0yLnJvdGF0aW9uWSA9IF9wYXJzZUFuZ2xlKChcInJvdGF0aW9uWVwiIGluIHYpID8gdi5yb3RhdGlvblkgOiAoXCJzaG9ydFJvdGF0aW9uWVwiIGluIHYpID8gdi5zaG9ydFJvdGF0aW9uWSArIFwiX3Nob3J0XCIgOiBtMS5yb3RhdGlvblkgfHwgMCwgbTEucm90YXRpb25ZLCBcInJvdGF0aW9uWVwiLCBlbmRSb3RhdGlvbnMpO1xuXHRcdFx0XHR9XG5cdFx0XHRcdG0yLnNrZXdYID0gKHYuc2tld1ggPT0gbnVsbCkgPyBtMS5za2V3WCA6IF9wYXJzZUFuZ2xlKHYuc2tld1gsIG0xLnNrZXdYKTtcblxuXHRcdFx0XHQvL25vdGU6IGZvciBwZXJmb3JtYW5jZSByZWFzb25zLCB3ZSBjb21iaW5lIGFsbCBza2V3aW5nIGludG8gdGhlIHNrZXdYIGFuZCByb3RhdGlvbiB2YWx1ZXMsIGlnbm9yaW5nIHNrZXdZIGJ1dCB3ZSBtdXN0IHN0aWxsIHJlY29yZCBpdCBzbyB0aGF0IHdlIGNhbiBkaXNjZXJuIGhvdyBtdWNoIG9mIHRoZSBvdmVyYWxsIHNrZXcgaXMgYXR0cmlidXRlZCB0byBza2V3WCB2cy4gc2tld1kuIE90aGVyd2lzZSwgaWYgdGhlIHNrZXdZIHdvdWxkIGFsd2F5cyBhY3QgcmVsYXRpdmUgKHR3ZWVuIHNrZXdZIHRvIDEwZGVnLCBmb3IgZXhhbXBsZSwgbXVsdGlwbGUgdGltZXMgYW5kIGlmIHdlIGFsd2F5cyBjb21iaW5lIHRoaW5ncyBpbnRvIHNrZXdYLCB3ZSBjYW4ndCByZW1lbWJlciB0aGF0IHNrZXdZIHdhcyAxMCBmcm9tIGxhc3QgdGltZSkuIFJlbWVtYmVyLCBhIHNrZXdZIG9mIDEwIGRlZ3JlZXMgbG9va3MgdGhlIHNhbWUgYXMgYSByb3RhdGlvbiBvZiAxMCBkZWdyZWVzIHBsdXMgYSBza2V3WCBvZiAtMTAgZGVncmVlcy5cblx0XHRcdFx0bTIuc2tld1kgPSAodi5za2V3WSA9PSBudWxsKSA/IG0xLnNrZXdZIDogX3BhcnNlQW5nbGUodi5za2V3WSwgbTEuc2tld1kpO1xuXHRcdFx0XHRpZiAoKHNrZXdZID0gbTIuc2tld1kgLSBtMS5za2V3WSkpIHtcblx0XHRcdFx0XHRtMi5za2V3WCArPSBza2V3WTtcblx0XHRcdFx0XHRtMi5yb3RhdGlvbiArPSBza2V3WTtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdFx0aWYgKF9zdXBwb3J0czNEICYmIHYuZm9yY2UzRCAhPSBudWxsKSB7XG5cdFx0XHRcdG0xLmZvcmNlM0QgPSB2LmZvcmNlM0Q7XG5cdFx0XHRcdGhhc0NoYW5nZSA9IHRydWU7XG5cdFx0XHR9XG5cblx0XHRcdG0xLnNrZXdUeXBlID0gdi5za2V3VHlwZSB8fCBtMS5za2V3VHlwZSB8fCBDU1NQbHVnaW4uZGVmYXVsdFNrZXdUeXBlO1xuXG5cdFx0XHRoYXMzRCA9IChtMS5mb3JjZTNEIHx8IG0xLnogfHwgbTEucm90YXRpb25YIHx8IG0xLnJvdGF0aW9uWSB8fCBtMi56IHx8IG0yLnJvdGF0aW9uWCB8fCBtMi5yb3RhdGlvblkgfHwgbTIucGVyc3BlY3RpdmUpO1xuXHRcdFx0aWYgKCFoYXMzRCAmJiB2LnNjYWxlICE9IG51bGwpIHtcblx0XHRcdFx0bTIuc2NhbGVaID0gMTsgLy9ubyBuZWVkIHRvIHR3ZWVuIHNjYWxlWi5cblx0XHRcdH1cblxuXHRcdFx0d2hpbGUgKC0taSA+IC0xKSB7XG5cdFx0XHRcdHAgPSBfdHJhbnNmb3JtUHJvcHNbaV07XG5cdFx0XHRcdG9yaWcgPSBtMltwXSAtIG0xW3BdO1xuXHRcdFx0XHRpZiAob3JpZyA+IG1pbiB8fCBvcmlnIDwgLW1pbiB8fCB2W3BdICE9IG51bGwgfHwgX2ZvcmNlUFRbcF0gIT0gbnVsbCkge1xuXHRcdFx0XHRcdGhhc0NoYW5nZSA9IHRydWU7XG5cdFx0XHRcdFx0cHQgPSBuZXcgQ1NTUHJvcFR3ZWVuKG0xLCBwLCBtMVtwXSwgb3JpZywgcHQpO1xuXHRcdFx0XHRcdGlmIChwIGluIGVuZFJvdGF0aW9ucykge1xuXHRcdFx0XHRcdFx0cHQuZSA9IGVuZFJvdGF0aW9uc1twXTsgLy9kaXJlY3Rpb25hbCByb3RhdGlvbnMgdHlwaWNhbGx5IGhhdmUgY29tcGVuc2F0ZWQgdmFsdWVzIGR1cmluZyB0aGUgdHdlZW4sIGJ1dCB3ZSBuZWVkIHRvIG1ha2Ugc3VyZSB0aGV5IGVuZCBhdCBleGFjdGx5IHdoYXQgdGhlIHVzZXIgcmVxdWVzdGVkXG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdHB0LnhzMCA9IDA7IC8vZW5zdXJlcyB0aGUgdmFsdWUgc3RheXMgbnVtZXJpYyBpbiBzZXRSYXRpbygpXG5cdFx0XHRcdFx0cHQucGx1Z2luID0gcGx1Z2luO1xuXHRcdFx0XHRcdGNzc3AuX292ZXJ3cml0ZVByb3BzLnB1c2gocHQubik7XG5cdFx0XHRcdH1cblx0XHRcdH1cblxuXHRcdFx0b3JpZyA9IHYudHJhbnNmb3JtT3JpZ2luO1xuXHRcdFx0aWYgKG0xLnN2ZyAmJiAob3JpZyB8fCB2LnN2Z09yaWdpbikpIHtcblx0XHRcdFx0eCA9IG0xLnhPZmZzZXQ7IC8vd2hlbiB3ZSBjaGFuZ2UgdGhlIG9yaWdpbiwgaW4gb3JkZXIgdG8gcHJldmVudCB0aGluZ3MgZnJvbSBqdW1waW5nIHdlIGFkanVzdCB0aGUgeC95IHNvIHdlIG11c3QgcmVjb3JkIHRob3NlIGhlcmUgc28gdGhhdCB3ZSBjYW4gY3JlYXRlIFByb3BUd2VlbnMgZm9yIHRoZW0gYW5kIGZsaXAgdGhlbSBhdCB0aGUgc2FtZSB0aW1lIGFzIHRoZSBvcmlnaW5cblx0XHRcdFx0eSA9IG0xLnlPZmZzZXQ7XG5cdFx0XHRcdF9wYXJzZVNWR09yaWdpbih0LCBfcGFyc2VQb3NpdGlvbihvcmlnKSwgbTIsIHYuc3ZnT3JpZ2luLCB2LnNtb290aE9yaWdpbik7XG5cdFx0XHRcdHB0ID0gX2FkZE5vblR3ZWVuaW5nTnVtZXJpY1BUKG0xLCBcInhPcmlnaW5cIiwgKG9yaWdpbmFsR1NUcmFuc2Zvcm0gPyBtMSA6IG0yKS54T3JpZ2luLCBtMi54T3JpZ2luLCBwdCwgdHJhbnNmb3JtT3JpZ2luU3RyaW5nKTsgLy9ub3RlOiBpZiB0aGVyZSB3YXNuJ3QgYSB0cmFuc2Zvcm1PcmlnaW4gZGVmaW5lZCB5ZXQsIGp1c3Qgc3RhcnQgd2l0aCB0aGUgZGVzdGluYXRpb24gb25lOyBpdCdzIHdhc3RlZnVsIG90aGVyd2lzZSwgYW5kIGl0IGNhdXNlcyBwcm9ibGVtcyB3aXRoIGZyb21UbygpIHR3ZWVucy4gRm9yIGV4YW1wbGUsIFR3ZWVuTGl0ZS50byhcIiN3aGVlbFwiLCAzLCB7cm90YXRpb246MTgwLCB0cmFuc2Zvcm1PcmlnaW46XCI1MCUgNTAlXCIsIGRlbGF5OjF9KTsgVHdlZW5MaXRlLmZyb21UbyhcIiN3aGVlbFwiLCAzLCB7c2NhbGU6MC41LCB0cmFuc2Zvcm1PcmlnaW46XCI1MCUgNTAlXCJ9LCB7c2NhbGU6MSwgZGVsYXk6Mn0pOyB3b3VsZCBjYXVzZSBhIGp1bXAgd2hlbiB0aGUgZnJvbSB2YWx1ZXMgcmV2ZXJ0IGF0IHRoZSBiZWdpbm5pbmcgb2YgdGhlIDJuZCB0d2Vlbi5cblx0XHRcdFx0cHQgPSBfYWRkTm9uVHdlZW5pbmdOdW1lcmljUFQobTEsIFwieU9yaWdpblwiLCAob3JpZ2luYWxHU1RyYW5zZm9ybSA/IG0xIDogbTIpLnlPcmlnaW4sIG0yLnlPcmlnaW4sIHB0LCB0cmFuc2Zvcm1PcmlnaW5TdHJpbmcpO1xuXHRcdFx0XHRpZiAoeCAhPT0gbTEueE9mZnNldCB8fCB5ICE9PSBtMS55T2Zmc2V0KSB7XG5cdFx0XHRcdFx0cHQgPSBfYWRkTm9uVHdlZW5pbmdOdW1lcmljUFQobTEsIFwieE9mZnNldFwiLCAob3JpZ2luYWxHU1RyYW5zZm9ybSA/IHggOiBtMS54T2Zmc2V0KSwgbTEueE9mZnNldCwgcHQsIHRyYW5zZm9ybU9yaWdpblN0cmluZyk7XG5cdFx0XHRcdFx0cHQgPSBfYWRkTm9uVHdlZW5pbmdOdW1lcmljUFQobTEsIFwieU9mZnNldFwiLCAob3JpZ2luYWxHU1RyYW5zZm9ybSA/IHkgOiBtMS55T2Zmc2V0KSwgbTEueU9mZnNldCwgcHQsIHRyYW5zZm9ybU9yaWdpblN0cmluZyk7XG5cdFx0XHRcdH1cblx0XHRcdFx0b3JpZyA9IF91c2VTVkdUcmFuc2Zvcm1BdHRyID8gbnVsbCA6IFwiMHB4IDBweFwiOyAvL2NlcnRhaW4gYnJvd3NlcnMgKGxpa2UgZmlyZWZveCkgY29tcGxldGVseSBib3RjaCB0cmFuc2Zvcm0tb3JpZ2luLCBzbyB3ZSBtdXN0IHJlbW92ZSBpdCB0byBwcmV2ZW50IGl0IGZyb20gY29udGFtaW5hdGluZyB0cmFuc2Zvcm1zLiBXZSBtYW5hZ2UgaXQgb3Vyc2VsdmVzIHdpdGggeE9yaWdpbiBhbmQgeU9yaWdpblxuXHRcdFx0fVxuXHRcdFx0aWYgKG9yaWcgfHwgKF9zdXBwb3J0czNEICYmIGhhczNEICYmIG0xLnpPcmlnaW4pKSB7IC8vaWYgYW55dGhpbmcgM0QgaXMgaGFwcGVuaW5nIGFuZCB0aGVyZSdzIGEgdHJhbnNmb3JtT3JpZ2luIHdpdGggYSB6IGNvbXBvbmVudCB0aGF0J3Mgbm9uLXplcm8sIHdlIG11c3QgZW5zdXJlIHRoYXQgdGhlIHRyYW5zZm9ybU9yaWdpbidzIHotY29tcG9uZW50IGlzIHNldCB0byAwIHNvIHRoYXQgd2UgY2FuIG1hbnVhbGx5IGRvIHRob3NlIGNhbGN1bGF0aW9ucyB0byBnZXQgYXJvdW5kIFNhZmFyaSBidWdzLiBFdmVuIGlmIHRoZSB1c2VyIGRpZG4ndCBzcGVjaWZpY2FsbHkgZGVmaW5lIGEgXCJ0cmFuc2Zvcm1PcmlnaW5cIiBpbiB0aGlzIHBhcnRpY3VsYXIgdHdlZW4gKG1heWJlIHRoZXkgZGlkIGl0IHZpYSBjc3MgZGlyZWN0bHkpLlxuXHRcdFx0XHRpZiAoX3RyYW5zZm9ybVByb3ApIHtcblx0XHRcdFx0XHRoYXNDaGFuZ2UgPSB0cnVlO1xuXHRcdFx0XHRcdHAgPSBfdHJhbnNmb3JtT3JpZ2luUHJvcDtcblx0XHRcdFx0XHRvcmlnID0gKG9yaWcgfHwgX2dldFN0eWxlKHQsIHAsIF9jcywgZmFsc2UsIFwiNTAlIDUwJVwiKSkgKyBcIlwiOyAvL2Nhc3QgYXMgc3RyaW5nIHRvIGF2b2lkIGVycm9yc1xuXHRcdFx0XHRcdHB0ID0gbmV3IENTU1Byb3BUd2VlbihzdHlsZSwgcCwgMCwgMCwgcHQsIC0xLCB0cmFuc2Zvcm1PcmlnaW5TdHJpbmcpO1xuXHRcdFx0XHRcdHB0LmIgPSBzdHlsZVtwXTtcblx0XHRcdFx0XHRwdC5wbHVnaW4gPSBwbHVnaW47XG5cdFx0XHRcdFx0aWYgKF9zdXBwb3J0czNEKSB7XG5cdFx0XHRcdFx0XHRjb3B5ID0gbTEuek9yaWdpbjtcblx0XHRcdFx0XHRcdG9yaWcgPSBvcmlnLnNwbGl0KFwiIFwiKTtcblx0XHRcdFx0XHRcdG0xLnpPcmlnaW4gPSAoKG9yaWcubGVuZ3RoID4gMiAmJiAhKGNvcHkgIT09IDAgJiYgb3JpZ1syXSA9PT0gXCIwcHhcIikpID8gcGFyc2VGbG9hdChvcmlnWzJdKSA6IGNvcHkpIHx8IDA7IC8vU2FmYXJpIGRvZXNuJ3QgaGFuZGxlIHRoZSB6IHBhcnQgb2YgdHJhbnNmb3JtT3JpZ2luIGNvcnJlY3RseSwgc28gd2UnbGwgbWFudWFsbHkgaGFuZGxlIGl0IGluIHRoZSBfc2V0M0RUcmFuc2Zvcm1SYXRpbygpIG1ldGhvZC5cblx0XHRcdFx0XHRcdHB0LnhzMCA9IHB0LmUgPSBvcmlnWzBdICsgXCIgXCIgKyAob3JpZ1sxXSB8fCBcIjUwJVwiKSArIFwiIDBweFwiOyAvL3dlIG11c3QgZGVmaW5lIGEgeiB2YWx1ZSBvZiAwcHggc3BlY2lmaWNhbGx5IG90aGVyd2lzZSBpT1MgNSBTYWZhcmkgd2lsbCBzdGljayB3aXRoIHRoZSBvbGQgb25lIChpZiBvbmUgd2FzIGRlZmluZWQpIVxuXHRcdFx0XHRcdFx0cHQgPSBuZXcgQ1NTUHJvcFR3ZWVuKG0xLCBcInpPcmlnaW5cIiwgMCwgMCwgcHQsIC0xLCBwdC5uKTsgLy93ZSBtdXN0IGNyZWF0ZSBhIENTU1Byb3BUd2VlbiBmb3IgdGhlIF9nc1RyYW5zZm9ybS56T3JpZ2luIHNvIHRoYXQgaXQgZ2V0cyByZXNldCBwcm9wZXJseSBhdCB0aGUgYmVnaW5uaW5nIGlmIHRoZSB0d2VlbiBydW5zIGJhY2t3YXJkIChhcyBvcHBvc2VkIHRvIGp1c3Qgc2V0dGluZyBtMS56T3JpZ2luIGhlcmUpXG5cdFx0XHRcdFx0XHRwdC5iID0gY29weTtcblx0XHRcdFx0XHRcdHB0LnhzMCA9IHB0LmUgPSBtMS56T3JpZ2luO1xuXHRcdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0XHRwdC54czAgPSBwdC5lID0gb3JpZztcblx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHQvL2ZvciBvbGRlciB2ZXJzaW9ucyBvZiBJRSAoNi04KSwgd2UgbmVlZCB0byBtYW51YWxseSBjYWxjdWxhdGUgdGhpbmdzIGluc2lkZSB0aGUgc2V0UmF0aW8oKSBmdW5jdGlvbi4gV2UgcmVjb3JkIG9yaWdpbiB4IGFuZCB5IChveCBhbmQgb3kpIGFuZCB3aGV0aGVyIG9yIG5vdCB0aGUgdmFsdWVzIGFyZSBwZXJjZW50YWdlcyAob3hwIGFuZCBveXApLlxuXHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdF9wYXJzZVBvc2l0aW9uKG9yaWcgKyBcIlwiLCBtMSk7XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHRcdGlmIChoYXNDaGFuZ2UpIHtcblx0XHRcdFx0Y3NzcC5fdHJhbnNmb3JtVHlwZSA9ICghKG0xLnN2ZyAmJiBfdXNlU1ZHVHJhbnNmb3JtQXR0cikgJiYgKGhhczNEIHx8IHRoaXMuX3RyYW5zZm9ybVR5cGUgPT09IDMpKSA/IDMgOiAyOyAvL3F1aWNrZXIgdGhhbiBjYWxsaW5nIGNzc3AuX2VuYWJsZVRyYW5zZm9ybXMoKTtcblx0XHRcdH1cblx0XHRcdHJldHVybiBwdDtcblx0XHR9LCBwcmVmaXg6dHJ1ZX0pO1xuXG5cdFx0X3JlZ2lzdGVyQ29tcGxleFNwZWNpYWxQcm9wKFwiYm94U2hhZG93XCIsIHtkZWZhdWx0VmFsdWU6XCIwcHggMHB4IDBweCAwcHggIzk5OVwiLCBwcmVmaXg6dHJ1ZSwgY29sb3I6dHJ1ZSwgbXVsdGk6dHJ1ZSwga2V5d29yZDpcImluc2V0XCJ9KTtcblxuXHRcdF9yZWdpc3RlckNvbXBsZXhTcGVjaWFsUHJvcChcImJvcmRlclJhZGl1c1wiLCB7ZGVmYXVsdFZhbHVlOlwiMHB4XCIsIHBhcnNlcjpmdW5jdGlvbih0LCBlLCBwLCBjc3NwLCBwdCwgcGx1Z2luKSB7XG5cdFx0XHRlID0gdGhpcy5mb3JtYXQoZSk7XG5cdFx0XHR2YXIgcHJvcHMgPSBbXCJib3JkZXJUb3BMZWZ0UmFkaXVzXCIsXCJib3JkZXJUb3BSaWdodFJhZGl1c1wiLFwiYm9yZGVyQm90dG9tUmlnaHRSYWRpdXNcIixcImJvcmRlckJvdHRvbUxlZnRSYWRpdXNcIl0sXG5cdFx0XHRcdHN0eWxlID0gdC5zdHlsZSxcblx0XHRcdFx0ZWExLCBpLCBlczIsIGJzMiwgYnMsIGVzLCBibiwgZW4sIHcsIGgsIGVzZngsIGJzZngsIHJlbCwgaG4sIHZuLCBlbTtcblx0XHRcdHcgPSBwYXJzZUZsb2F0KHQub2Zmc2V0V2lkdGgpO1xuXHRcdFx0aCA9IHBhcnNlRmxvYXQodC5vZmZzZXRIZWlnaHQpO1xuXHRcdFx0ZWExID0gZS5zcGxpdChcIiBcIik7XG5cdFx0XHRmb3IgKGkgPSAwOyBpIDwgcHJvcHMubGVuZ3RoOyBpKyspIHsgLy9pZiB3ZSdyZSBkZWFsaW5nIHdpdGggcGVyY2VudGFnZXMsIHdlIG11c3QgY29udmVydCB0aGluZ3Mgc2VwYXJhdGVseSBmb3IgdGhlIGhvcml6b250YWwgYW5kIHZlcnRpY2FsIGF4aXMhXG5cdFx0XHRcdGlmICh0aGlzLnAuaW5kZXhPZihcImJvcmRlclwiKSkgeyAvL29sZGVyIGJyb3dzZXJzIHVzZWQgYSBwcmVmaXhcblx0XHRcdFx0XHRwcm9wc1tpXSA9IF9jaGVja1Byb3BQcmVmaXgocHJvcHNbaV0pO1xuXHRcdFx0XHR9XG5cdFx0XHRcdGJzID0gYnMyID0gX2dldFN0eWxlKHQsIHByb3BzW2ldLCBfY3MsIGZhbHNlLCBcIjBweFwiKTtcblx0XHRcdFx0aWYgKGJzLmluZGV4T2YoXCIgXCIpICE9PSAtMSkge1xuXHRcdFx0XHRcdGJzMiA9IGJzLnNwbGl0KFwiIFwiKTtcblx0XHRcdFx0XHRicyA9IGJzMlswXTtcblx0XHRcdFx0XHRiczIgPSBiczJbMV07XG5cdFx0XHRcdH1cblx0XHRcdFx0ZXMgPSBlczIgPSBlYTFbaV07XG5cdFx0XHRcdGJuID0gcGFyc2VGbG9hdChicyk7XG5cdFx0XHRcdGJzZnggPSBicy5zdWJzdHIoKGJuICsgXCJcIikubGVuZ3RoKTtcblx0XHRcdFx0cmVsID0gKGVzLmNoYXJBdCgxKSA9PT0gXCI9XCIpO1xuXHRcdFx0XHRpZiAocmVsKSB7XG5cdFx0XHRcdFx0ZW4gPSBwYXJzZUludChlcy5jaGFyQXQoMCkrXCIxXCIsIDEwKTtcblx0XHRcdFx0XHRlcyA9IGVzLnN1YnN0cigyKTtcblx0XHRcdFx0XHRlbiAqPSBwYXJzZUZsb2F0KGVzKTtcblx0XHRcdFx0XHRlc2Z4ID0gZXMuc3Vic3RyKChlbiArIFwiXCIpLmxlbmd0aCAtIChlbiA8IDAgPyAxIDogMCkpIHx8IFwiXCI7XG5cdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0ZW4gPSBwYXJzZUZsb2F0KGVzKTtcblx0XHRcdFx0XHRlc2Z4ID0gZXMuc3Vic3RyKChlbiArIFwiXCIpLmxlbmd0aCk7XG5cdFx0XHRcdH1cblx0XHRcdFx0aWYgKGVzZnggPT09IFwiXCIpIHtcblx0XHRcdFx0XHRlc2Z4ID0gX3N1ZmZpeE1hcFtwXSB8fCBic2Z4O1xuXHRcdFx0XHR9XG5cdFx0XHRcdGlmIChlc2Z4ICE9PSBic2Z4KSB7XG5cdFx0XHRcdFx0aG4gPSBfY29udmVydFRvUGl4ZWxzKHQsIFwiYm9yZGVyTGVmdFwiLCBibiwgYnNmeCk7IC8vaG9yaXpvbnRhbCBudW1iZXIgKHdlIHVzZSBhIGJvZ3VzIFwiYm9yZGVyTGVmdFwiIHByb3BlcnR5IGp1c3QgYmVjYXVzZSB0aGUgX2NvbnZlcnRUb1BpeGVscygpIG1ldGhvZCBzZWFyY2hlcyBmb3IgdGhlIGtleXdvcmRzIFwiTGVmdFwiLCBcIlJpZ2h0XCIsIFwiVG9wXCIsIGFuZCBcIkJvdHRvbVwiIHRvIGRldGVybWluZSBvZiBpdCdzIGEgaG9yaXpvbnRhbCBvciB2ZXJ0aWNhbCBwcm9wZXJ0eSwgYW5kIHdlIG5lZWQgXCJib3JkZXJcIiBpbiB0aGUgbmFtZSBzbyB0aGF0IGl0IGtub3dzIGl0IHNob3VsZCBtZWFzdXJlIHJlbGF0aXZlIHRvIHRoZSBlbGVtZW50IGl0c2VsZiwgbm90IGl0cyBwYXJlbnQuXG5cdFx0XHRcdFx0dm4gPSBfY29udmVydFRvUGl4ZWxzKHQsIFwiYm9yZGVyVG9wXCIsIGJuLCBic2Z4KTsgLy92ZXJ0aWNhbCBudW1iZXJcblx0XHRcdFx0XHRpZiAoZXNmeCA9PT0gXCIlXCIpIHtcblx0XHRcdFx0XHRcdGJzID0gKGhuIC8gdyAqIDEwMCkgKyBcIiVcIjtcblx0XHRcdFx0XHRcdGJzMiA9ICh2biAvIGggKiAxMDApICsgXCIlXCI7XG5cdFx0XHRcdFx0fSBlbHNlIGlmIChlc2Z4ID09PSBcImVtXCIpIHtcblx0XHRcdFx0XHRcdGVtID0gX2NvbnZlcnRUb1BpeGVscyh0LCBcImJvcmRlckxlZnRcIiwgMSwgXCJlbVwiKTtcblx0XHRcdFx0XHRcdGJzID0gKGhuIC8gZW0pICsgXCJlbVwiO1xuXHRcdFx0XHRcdFx0YnMyID0gKHZuIC8gZW0pICsgXCJlbVwiO1xuXHRcdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0XHRicyA9IGhuICsgXCJweFwiO1xuXHRcdFx0XHRcdFx0YnMyID0gdm4gKyBcInB4XCI7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdGlmIChyZWwpIHtcblx0XHRcdFx0XHRcdGVzID0gKHBhcnNlRmxvYXQoYnMpICsgZW4pICsgZXNmeDtcblx0XHRcdFx0XHRcdGVzMiA9IChwYXJzZUZsb2F0KGJzMikgKyBlbikgKyBlc2Z4O1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXHRcdFx0XHRwdCA9IF9wYXJzZUNvbXBsZXgoc3R5bGUsIHByb3BzW2ldLCBicyArIFwiIFwiICsgYnMyLCBlcyArIFwiIFwiICsgZXMyLCBmYWxzZSwgXCIwcHhcIiwgcHQpO1xuXHRcdFx0fVxuXHRcdFx0cmV0dXJuIHB0O1xuXHRcdH0sIHByZWZpeDp0cnVlLCBmb3JtYXR0ZXI6X2dldEZvcm1hdHRlcihcIjBweCAwcHggMHB4IDBweFwiLCBmYWxzZSwgdHJ1ZSl9KTtcblx0XHRfcmVnaXN0ZXJDb21wbGV4U3BlY2lhbFByb3AoXCJiYWNrZ3JvdW5kUG9zaXRpb25cIiwge2RlZmF1bHRWYWx1ZTpcIjAgMFwiLCBwYXJzZXI6ZnVuY3Rpb24odCwgZSwgcCwgY3NzcCwgcHQsIHBsdWdpbikge1xuXHRcdFx0dmFyIGJwID0gXCJiYWNrZ3JvdW5kLXBvc2l0aW9uXCIsXG5cdFx0XHRcdGNzID0gKF9jcyB8fCBfZ2V0Q29tcHV0ZWRTdHlsZSh0LCBudWxsKSksXG5cdFx0XHRcdGJzID0gdGhpcy5mb3JtYXQoICgoY3MpID8gX2llVmVycyA/IGNzLmdldFByb3BlcnR5VmFsdWUoYnAgKyBcIi14XCIpICsgXCIgXCIgKyBjcy5nZXRQcm9wZXJ0eVZhbHVlKGJwICsgXCIteVwiKSA6IGNzLmdldFByb3BlcnR5VmFsdWUoYnApIDogdC5jdXJyZW50U3R5bGUuYmFja2dyb3VuZFBvc2l0aW9uWCArIFwiIFwiICsgdC5jdXJyZW50U3R5bGUuYmFja2dyb3VuZFBvc2l0aW9uWSkgfHwgXCIwIDBcIiksIC8vSW50ZXJuZXQgRXhwbG9yZXIgZG9lc24ndCByZXBvcnQgYmFja2dyb3VuZC1wb3NpdGlvbiBjb3JyZWN0bHkgLSB3ZSBtdXN0IHF1ZXJ5IGJhY2tncm91bmQtcG9zaXRpb24teCBhbmQgYmFja2dyb3VuZC1wb3NpdGlvbi15IGFuZCBjb21iaW5lIHRoZW0gKGV2ZW4gaW4gSUUxMCkuIEJlZm9yZSBJRTksIHdlIG11c3QgZG8gdGhlIHNhbWUgd2l0aCB0aGUgY3VycmVudFN0eWxlIG9iamVjdCBhbmQgdXNlIGNhbWVsQ2FzZVxuXHRcdFx0XHRlcyA9IHRoaXMuZm9ybWF0KGUpLFxuXHRcdFx0XHRiYSwgZWEsIGksIHBjdCwgb3ZlcmxhcCwgc3JjO1xuXHRcdFx0aWYgKChicy5pbmRleE9mKFwiJVwiKSAhPT0gLTEpICE9PSAoZXMuaW5kZXhPZihcIiVcIikgIT09IC0xKSkge1xuXHRcdFx0XHRzcmMgPSBfZ2V0U3R5bGUodCwgXCJiYWNrZ3JvdW5kSW1hZ2VcIikucmVwbGFjZShfdXJsRXhwLCBcIlwiKTtcblx0XHRcdFx0aWYgKHNyYyAmJiBzcmMgIT09IFwibm9uZVwiKSB7XG5cdFx0XHRcdFx0YmEgPSBicy5zcGxpdChcIiBcIik7XG5cdFx0XHRcdFx0ZWEgPSBlcy5zcGxpdChcIiBcIik7XG5cdFx0XHRcdFx0X3RlbXBJbWcuc2V0QXR0cmlidXRlKFwic3JjXCIsIHNyYyk7IC8vc2V0IHRoZSB0ZW1wIElNRydzIHNyYyB0byB0aGUgYmFja2dyb3VuZC1pbWFnZSBzbyB0aGF0IHdlIGNhbiBtZWFzdXJlIGl0cyB3aWR0aC9oZWlnaHRcblx0XHRcdFx0XHRpID0gMjtcblx0XHRcdFx0XHR3aGlsZSAoLS1pID4gLTEpIHtcblx0XHRcdFx0XHRcdGJzID0gYmFbaV07XG5cdFx0XHRcdFx0XHRwY3QgPSAoYnMuaW5kZXhPZihcIiVcIikgIT09IC0xKTtcblx0XHRcdFx0XHRcdGlmIChwY3QgIT09IChlYVtpXS5pbmRleE9mKFwiJVwiKSAhPT0gLTEpKSB7XG5cdFx0XHRcdFx0XHRcdG92ZXJsYXAgPSAoaSA9PT0gMCkgPyB0Lm9mZnNldFdpZHRoIC0gX3RlbXBJbWcud2lkdGggOiB0Lm9mZnNldEhlaWdodCAtIF90ZW1wSW1nLmhlaWdodDtcblx0XHRcdFx0XHRcdFx0YmFbaV0gPSBwY3QgPyAocGFyc2VGbG9hdChicykgLyAxMDAgKiBvdmVybGFwKSArIFwicHhcIiA6IChwYXJzZUZsb2F0KGJzKSAvIG92ZXJsYXAgKiAxMDApICsgXCIlXCI7XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdGJzID0gYmEuam9pbihcIiBcIik7XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHRcdHJldHVybiB0aGlzLnBhcnNlQ29tcGxleCh0LnN0eWxlLCBicywgZXMsIHB0LCBwbHVnaW4pO1xuXHRcdH0sIGZvcm1hdHRlcjpfcGFyc2VQb3NpdGlvbn0pO1xuXHRcdF9yZWdpc3RlckNvbXBsZXhTcGVjaWFsUHJvcChcImJhY2tncm91bmRTaXplXCIsIHtkZWZhdWx0VmFsdWU6XCIwIDBcIiwgZm9ybWF0dGVyOl9wYXJzZVBvc2l0aW9ufSk7XG5cdFx0X3JlZ2lzdGVyQ29tcGxleFNwZWNpYWxQcm9wKFwicGVyc3BlY3RpdmVcIiwge2RlZmF1bHRWYWx1ZTpcIjBweFwiLCBwcmVmaXg6dHJ1ZX0pO1xuXHRcdF9yZWdpc3RlckNvbXBsZXhTcGVjaWFsUHJvcChcInBlcnNwZWN0aXZlT3JpZ2luXCIsIHtkZWZhdWx0VmFsdWU6XCI1MCUgNTAlXCIsIHByZWZpeDp0cnVlfSk7XG5cdFx0X3JlZ2lzdGVyQ29tcGxleFNwZWNpYWxQcm9wKFwidHJhbnNmb3JtU3R5bGVcIiwge3ByZWZpeDp0cnVlfSk7XG5cdFx0X3JlZ2lzdGVyQ29tcGxleFNwZWNpYWxQcm9wKFwiYmFja2ZhY2VWaXNpYmlsaXR5XCIsIHtwcmVmaXg6dHJ1ZX0pO1xuXHRcdF9yZWdpc3RlckNvbXBsZXhTcGVjaWFsUHJvcChcInVzZXJTZWxlY3RcIiwge3ByZWZpeDp0cnVlfSk7XG5cdFx0X3JlZ2lzdGVyQ29tcGxleFNwZWNpYWxQcm9wKFwibWFyZ2luXCIsIHtwYXJzZXI6X2dldEVkZ2VQYXJzZXIoXCJtYXJnaW5Ub3AsbWFyZ2luUmlnaHQsbWFyZ2luQm90dG9tLG1hcmdpbkxlZnRcIil9KTtcblx0XHRfcmVnaXN0ZXJDb21wbGV4U3BlY2lhbFByb3AoXCJwYWRkaW5nXCIsIHtwYXJzZXI6X2dldEVkZ2VQYXJzZXIoXCJwYWRkaW5nVG9wLHBhZGRpbmdSaWdodCxwYWRkaW5nQm90dG9tLHBhZGRpbmdMZWZ0XCIpfSk7XG5cdFx0X3JlZ2lzdGVyQ29tcGxleFNwZWNpYWxQcm9wKFwiY2xpcFwiLCB7ZGVmYXVsdFZhbHVlOlwicmVjdCgwcHgsMHB4LDBweCwwcHgpXCIsIHBhcnNlcjpmdW5jdGlvbih0LCBlLCBwLCBjc3NwLCBwdCwgcGx1Z2luKXtcblx0XHRcdHZhciBiLCBjcywgZGVsaW07XG5cdFx0XHRpZiAoX2llVmVycyA8IDkpIHsgLy9JRTggYW5kIGVhcmxpZXIgZG9uJ3QgcmVwb3J0IGEgXCJjbGlwXCIgdmFsdWUgaW4gdGhlIGN1cnJlbnRTdHlsZSAtIGluc3RlYWQsIHRoZSB2YWx1ZXMgYXJlIHNwbGl0IGFwYXJ0IGludG8gY2xpcFRvcCwgY2xpcFJpZ2h0LCBjbGlwQm90dG9tLCBhbmQgY2xpcExlZnQuIEFsc28sIGluIElFNyBhbmQgZWFybGllciwgdGhlIHZhbHVlcyBpbnNpZGUgcmVjdCgpIGFyZSBzcGFjZS1kZWxpbWl0ZWQsIG5vdCBjb21tYS1kZWxpbWl0ZWQuXG5cdFx0XHRcdGNzID0gdC5jdXJyZW50U3R5bGU7XG5cdFx0XHRcdGRlbGltID0gX2llVmVycyA8IDggPyBcIiBcIiA6IFwiLFwiO1xuXHRcdFx0XHRiID0gXCJyZWN0KFwiICsgY3MuY2xpcFRvcCArIGRlbGltICsgY3MuY2xpcFJpZ2h0ICsgZGVsaW0gKyBjcy5jbGlwQm90dG9tICsgZGVsaW0gKyBjcy5jbGlwTGVmdCArIFwiKVwiO1xuXHRcdFx0XHRlID0gdGhpcy5mb3JtYXQoZSkuc3BsaXQoXCIsXCIpLmpvaW4oZGVsaW0pO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0YiA9IHRoaXMuZm9ybWF0KF9nZXRTdHlsZSh0LCB0aGlzLnAsIF9jcywgZmFsc2UsIHRoaXMuZGZsdCkpO1xuXHRcdFx0XHRlID0gdGhpcy5mb3JtYXQoZSk7XG5cdFx0XHR9XG5cdFx0XHRyZXR1cm4gdGhpcy5wYXJzZUNvbXBsZXgodC5zdHlsZSwgYiwgZSwgcHQsIHBsdWdpbik7XG5cdFx0fX0pO1xuXHRcdF9yZWdpc3RlckNvbXBsZXhTcGVjaWFsUHJvcChcInRleHRTaGFkb3dcIiwge2RlZmF1bHRWYWx1ZTpcIjBweCAwcHggMHB4ICM5OTlcIiwgY29sb3I6dHJ1ZSwgbXVsdGk6dHJ1ZX0pO1xuXHRcdF9yZWdpc3RlckNvbXBsZXhTcGVjaWFsUHJvcChcImF1dG9Sb3VuZCxzdHJpY3RVbml0c1wiLCB7cGFyc2VyOmZ1bmN0aW9uKHQsIGUsIHAsIGNzc3AsIHB0KSB7cmV0dXJuIHB0O319KTsgLy9qdXN0IHNvIHRoYXQgd2UgY2FuIGlnbm9yZSB0aGVzZSBwcm9wZXJ0aWVzIChub3QgdHdlZW4gdGhlbSlcblx0XHRfcmVnaXN0ZXJDb21wbGV4U3BlY2lhbFByb3AoXCJib3JkZXJcIiwge2RlZmF1bHRWYWx1ZTpcIjBweCBzb2xpZCAjMDAwXCIsIHBhcnNlcjpmdW5jdGlvbih0LCBlLCBwLCBjc3NwLCBwdCwgcGx1Z2luKSB7XG5cdFx0XHRcdHJldHVybiB0aGlzLnBhcnNlQ29tcGxleCh0LnN0eWxlLCB0aGlzLmZvcm1hdChfZ2V0U3R5bGUodCwgXCJib3JkZXJUb3BXaWR0aFwiLCBfY3MsIGZhbHNlLCBcIjBweFwiKSArIFwiIFwiICsgX2dldFN0eWxlKHQsIFwiYm9yZGVyVG9wU3R5bGVcIiwgX2NzLCBmYWxzZSwgXCJzb2xpZFwiKSArIFwiIFwiICsgX2dldFN0eWxlKHQsIFwiYm9yZGVyVG9wQ29sb3JcIiwgX2NzLCBmYWxzZSwgXCIjMDAwXCIpKSwgdGhpcy5mb3JtYXQoZSksIHB0LCBwbHVnaW4pO1xuXHRcdFx0fSwgY29sb3I6dHJ1ZSwgZm9ybWF0dGVyOmZ1bmN0aW9uKHYpIHtcblx0XHRcdFx0dmFyIGEgPSB2LnNwbGl0KFwiIFwiKTtcblx0XHRcdFx0cmV0dXJuIGFbMF0gKyBcIiBcIiArIChhWzFdIHx8IFwic29saWRcIikgKyBcIiBcIiArICh2Lm1hdGNoKF9jb2xvckV4cCkgfHwgW1wiIzAwMFwiXSlbMF07XG5cdFx0XHR9fSk7XG5cdFx0X3JlZ2lzdGVyQ29tcGxleFNwZWNpYWxQcm9wKFwiYm9yZGVyV2lkdGhcIiwge3BhcnNlcjpfZ2V0RWRnZVBhcnNlcihcImJvcmRlclRvcFdpZHRoLGJvcmRlclJpZ2h0V2lkdGgsYm9yZGVyQm90dG9tV2lkdGgsYm9yZGVyTGVmdFdpZHRoXCIpfSk7IC8vRmlyZWZveCBkb2Vzbid0IHBpY2sgdXAgb24gYm9yZGVyV2lkdGggc2V0IGluIHN0eWxlIHNoZWV0cyAob25seSBpbmxpbmUpLlxuXHRcdF9yZWdpc3RlckNvbXBsZXhTcGVjaWFsUHJvcChcImZsb2F0LGNzc0Zsb2F0LHN0eWxlRmxvYXRcIiwge3BhcnNlcjpmdW5jdGlvbih0LCBlLCBwLCBjc3NwLCBwdCwgcGx1Z2luKSB7XG5cdFx0XHR2YXIgcyA9IHQuc3R5bGUsXG5cdFx0XHRcdHByb3AgPSAoXCJjc3NGbG9hdFwiIGluIHMpID8gXCJjc3NGbG9hdFwiIDogXCJzdHlsZUZsb2F0XCI7XG5cdFx0XHRyZXR1cm4gbmV3IENTU1Byb3BUd2VlbihzLCBwcm9wLCAwLCAwLCBwdCwgLTEsIHAsIGZhbHNlLCAwLCBzW3Byb3BdLCBlKTtcblx0XHR9fSk7XG5cblx0XHQvL29wYWNpdHktcmVsYXRlZFxuXHRcdHZhciBfc2V0SUVPcGFjaXR5UmF0aW8gPSBmdW5jdGlvbih2KSB7XG5cdFx0XHRcdHZhciB0ID0gdGhpcy50LCAvL3JlZmVycyB0byB0aGUgZWxlbWVudCdzIHN0eWxlIHByb3BlcnR5XG5cdFx0XHRcdFx0ZmlsdGVycyA9IHQuZmlsdGVyIHx8IF9nZXRTdHlsZSh0aGlzLmRhdGEsIFwiZmlsdGVyXCIpIHx8IFwiXCIsXG5cdFx0XHRcdFx0dmFsID0gKHRoaXMucyArIHRoaXMuYyAqIHYpIHwgMCxcblx0XHRcdFx0XHRza2lwO1xuXHRcdFx0XHRpZiAodmFsID09PSAxMDApIHsgLy9mb3Igb2xkZXIgdmVyc2lvbnMgb2YgSUUgdGhhdCBuZWVkIHRvIHVzZSBhIGZpbHRlciB0byBhcHBseSBvcGFjaXR5LCB3ZSBzaG91bGQgcmVtb3ZlIHRoZSBmaWx0ZXIgaWYgb3BhY2l0eSBoaXRzIDEgaW4gb3JkZXIgdG8gaW1wcm92ZSBwZXJmb3JtYW5jZSwgYnV0IG1ha2Ugc3VyZSB0aGVyZSBpc24ndCBhIHRyYW5zZm9ybSAobWF0cml4KSBvciBncmFkaWVudCBpbiB0aGUgZmlsdGVycy5cblx0XHRcdFx0XHRpZiAoZmlsdGVycy5pbmRleE9mKFwiYXRyaXgoXCIpID09PSAtMSAmJiBmaWx0ZXJzLmluZGV4T2YoXCJyYWRpZW50KFwiKSA9PT0gLTEgJiYgZmlsdGVycy5pbmRleE9mKFwib2FkZXIoXCIpID09PSAtMSkge1xuXHRcdFx0XHRcdFx0dC5yZW1vdmVBdHRyaWJ1dGUoXCJmaWx0ZXJcIik7XG5cdFx0XHRcdFx0XHRza2lwID0gKCFfZ2V0U3R5bGUodGhpcy5kYXRhLCBcImZpbHRlclwiKSk7IC8vaWYgYSBjbGFzcyBpcyBhcHBsaWVkIHRoYXQgaGFzIGFuIGFscGhhIGZpbHRlciwgaXQgd2lsbCB0YWtlIGVmZmVjdCAod2UgZG9uJ3Qgd2FudCB0aGF0KSwgc28gcmUtYXBwbHkgb3VyIGFscGhhIGZpbHRlciBpbiB0aGF0IGNhc2UuIFdlIG11c3QgZmlyc3QgcmVtb3ZlIGl0IGFuZCB0aGVuIGNoZWNrLlxuXHRcdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0XHR0LmZpbHRlciA9IGZpbHRlcnMucmVwbGFjZShfYWxwaGFGaWx0ZXJFeHAsIFwiXCIpO1xuXHRcdFx0XHRcdFx0c2tpcCA9IHRydWU7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cdFx0XHRcdGlmICghc2tpcCkge1xuXHRcdFx0XHRcdGlmICh0aGlzLnhuMSkge1xuXHRcdFx0XHRcdFx0dC5maWx0ZXIgPSBmaWx0ZXJzID0gZmlsdGVycyB8fCAoXCJhbHBoYShvcGFjaXR5PVwiICsgdmFsICsgXCIpXCIpOyAvL3dvcmtzIGFyb3VuZCBidWcgaW4gSUU3LzggdGhhdCBwcmV2ZW50cyBjaGFuZ2VzIHRvIFwidmlzaWJpbGl0eVwiIGZyb20gYmVpbmcgYXBwbGllZCBwcm9wZXJseSBpZiB0aGUgZmlsdGVyIGlzIGNoYW5nZWQgdG8gYSBkaWZmZXJlbnQgYWxwaGEgb24gdGhlIHNhbWUgZnJhbWUuXG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdGlmIChmaWx0ZXJzLmluZGV4T2YoXCJwYWNpdHlcIikgPT09IC0xKSB7IC8vb25seSB1c2VkIGlmIGJyb3dzZXIgZG9lc24ndCBzdXBwb3J0IHRoZSBzdGFuZGFyZCBvcGFjaXR5IHN0eWxlIHByb3BlcnR5IChJRSA3IGFuZCA4KS4gV2Ugb21pdCB0aGUgXCJPXCIgdG8gYXZvaWQgY2FzZS1zZW5zaXRpdml0eSBpc3N1ZXNcblx0XHRcdFx0XHRcdGlmICh2YWwgIT09IDAgfHwgIXRoaXMueG4xKSB7IC8vYnVncyBpbiBJRTcvOCB3b24ndCByZW5kZXIgdGhlIGZpbHRlciBwcm9wZXJseSBpZiBvcGFjaXR5IGlzIEFEREVEIG9uIHRoZSBzYW1lIGZyYW1lL3JlbmRlciBhcyBcInZpc2liaWxpdHlcIiBjaGFuZ2VzICh0aGlzLnhuMSBpcyAxIGlmIHRoaXMgdHdlZW4gaXMgYW4gXCJhdXRvQWxwaGFcIiB0d2Vlbilcblx0XHRcdFx0XHRcdFx0dC5maWx0ZXIgPSBmaWx0ZXJzICsgXCIgYWxwaGEob3BhY2l0eT1cIiArIHZhbCArIFwiKVwiOyAvL3dlIHJvdW5kIHRoZSB2YWx1ZSBiZWNhdXNlIG90aGVyd2lzZSwgYnVncyBpbiBJRTcvOCBjYW4gcHJldmVudCBcInZpc2liaWxpdHlcIiBjaGFuZ2VzIGZyb20gYmVpbmcgYXBwbGllZCBwcm9wZXJseS5cblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdFx0dC5maWx0ZXIgPSBmaWx0ZXJzLnJlcGxhY2UoX29wYWNpdHlFeHAsIFwib3BhY2l0eT1cIiArIHZhbCk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cdFx0XHR9O1xuXHRcdF9yZWdpc3RlckNvbXBsZXhTcGVjaWFsUHJvcChcIm9wYWNpdHksYWxwaGEsYXV0b0FscGhhXCIsIHtkZWZhdWx0VmFsdWU6XCIxXCIsIHBhcnNlcjpmdW5jdGlvbih0LCBlLCBwLCBjc3NwLCBwdCwgcGx1Z2luKSB7XG5cdFx0XHR2YXIgYiA9IHBhcnNlRmxvYXQoX2dldFN0eWxlKHQsIFwib3BhY2l0eVwiLCBfY3MsIGZhbHNlLCBcIjFcIikpLFxuXHRcdFx0XHRzdHlsZSA9IHQuc3R5bGUsXG5cdFx0XHRcdGlzQXV0b0FscGhhID0gKHAgPT09IFwiYXV0b0FscGhhXCIpO1xuXHRcdFx0aWYgKHR5cGVvZihlKSA9PT0gXCJzdHJpbmdcIiAmJiBlLmNoYXJBdCgxKSA9PT0gXCI9XCIpIHtcblx0XHRcdFx0ZSA9ICgoZS5jaGFyQXQoMCkgPT09IFwiLVwiKSA/IC0xIDogMSkgKiBwYXJzZUZsb2F0KGUuc3Vic3RyKDIpKSArIGI7XG5cdFx0XHR9XG5cdFx0XHRpZiAoaXNBdXRvQWxwaGEgJiYgYiA9PT0gMSAmJiBfZ2V0U3R5bGUodCwgXCJ2aXNpYmlsaXR5XCIsIF9jcykgPT09IFwiaGlkZGVuXCIgJiYgZSAhPT0gMCkgeyAvL2lmIHZpc2liaWxpdHkgaXMgaW5pdGlhbGx5IHNldCB0byBcImhpZGRlblwiLCB3ZSBzaG91bGQgaW50ZXJwcmV0IHRoYXQgYXMgaW50ZW50IHRvIG1ha2Ugb3BhY2l0eSAwIChhIGNvbnZlbmllbmNlKVxuXHRcdFx0XHRiID0gMDtcblx0XHRcdH1cblx0XHRcdGlmIChfc3VwcG9ydHNPcGFjaXR5KSB7XG5cdFx0XHRcdHB0ID0gbmV3IENTU1Byb3BUd2VlbihzdHlsZSwgXCJvcGFjaXR5XCIsIGIsIGUgLSBiLCBwdCk7XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRwdCA9IG5ldyBDU1NQcm9wVHdlZW4oc3R5bGUsIFwib3BhY2l0eVwiLCBiICogMTAwLCAoZSAtIGIpICogMTAwLCBwdCk7XG5cdFx0XHRcdHB0LnhuMSA9IGlzQXV0b0FscGhhID8gMSA6IDA7IC8vd2UgbmVlZCB0byByZWNvcmQgd2hldGhlciBvciBub3QgdGhpcyBpcyBhbiBhdXRvQWxwaGEgc28gdGhhdCBpbiB0aGUgc2V0UmF0aW8oKSwgd2Uga25vdyB0byBkdXBsaWNhdGUgdGhlIHNldHRpbmcgb2YgdGhlIGFscGhhIGluIG9yZGVyIHRvIHdvcmsgYXJvdW5kIGEgYnVnIGluIElFNyBhbmQgSUU4IHRoYXQgcHJldmVudHMgY2hhbmdlcyB0byBcInZpc2liaWxpdHlcIiBmcm9tIHRha2luZyBlZmZlY3QgaWYgdGhlIGZpbHRlciBpcyBjaGFuZ2VkIHRvIGEgZGlmZmVyZW50IGFscGhhKG9wYWNpdHkpIGF0IHRoZSBzYW1lIHRpbWUuIFNldHRpbmcgaXQgdG8gdGhlIFNBTUUgdmFsdWUgZmlyc3QsIHRoZW4gdGhlIG5ldyB2YWx1ZSB3b3JrcyBhcm91bmQgdGhlIElFNy84IGJ1Zy5cblx0XHRcdFx0c3R5bGUuem9vbSA9IDE7IC8vaGVscHMgY29ycmVjdCBhbiBJRSBpc3N1ZS5cblx0XHRcdFx0cHQudHlwZSA9IDI7XG5cdFx0XHRcdHB0LmIgPSBcImFscGhhKG9wYWNpdHk9XCIgKyBwdC5zICsgXCIpXCI7XG5cdFx0XHRcdHB0LmUgPSBcImFscGhhKG9wYWNpdHk9XCIgKyAocHQucyArIHB0LmMpICsgXCIpXCI7XG5cdFx0XHRcdHB0LmRhdGEgPSB0O1xuXHRcdFx0XHRwdC5wbHVnaW4gPSBwbHVnaW47XG5cdFx0XHRcdHB0LnNldFJhdGlvID0gX3NldElFT3BhY2l0eVJhdGlvO1xuXHRcdFx0fVxuXHRcdFx0aWYgKGlzQXV0b0FscGhhKSB7IC8vd2UgaGF2ZSB0byBjcmVhdGUgdGhlIFwidmlzaWJpbGl0eVwiIFByb3BUd2VlbiBhZnRlciB0aGUgb3BhY2l0eSBvbmUgaW4gdGhlIGxpbmtlZCBsaXN0IHNvIHRoYXQgdGhleSBydW4gaW4gdGhlIG9yZGVyIHRoYXQgd29ya3MgcHJvcGVybHkgaW4gSUU4IGFuZCBlYXJsaWVyXG5cdFx0XHRcdHB0ID0gbmV3IENTU1Byb3BUd2VlbihzdHlsZSwgXCJ2aXNpYmlsaXR5XCIsIDAsIDAsIHB0LCAtMSwgbnVsbCwgZmFsc2UsIDAsICgoYiAhPT0gMCkgPyBcImluaGVyaXRcIiA6IFwiaGlkZGVuXCIpLCAoKGUgPT09IDApID8gXCJoaWRkZW5cIiA6IFwiaW5oZXJpdFwiKSk7XG5cdFx0XHRcdHB0LnhzMCA9IFwiaW5oZXJpdFwiO1xuXHRcdFx0XHRjc3NwLl9vdmVyd3JpdGVQcm9wcy5wdXNoKHB0Lm4pO1xuXHRcdFx0XHRjc3NwLl9vdmVyd3JpdGVQcm9wcy5wdXNoKHApO1xuXHRcdFx0fVxuXHRcdFx0cmV0dXJuIHB0O1xuXHRcdH19KTtcblxuXG5cdFx0dmFyIF9yZW1vdmVQcm9wID0gZnVuY3Rpb24ocywgcCkge1xuXHRcdFx0XHRpZiAocCkge1xuXHRcdFx0XHRcdGlmIChzLnJlbW92ZVByb3BlcnR5KSB7XG5cdFx0XHRcdFx0XHRpZiAocC5zdWJzdHIoMCwyKSA9PT0gXCJtc1wiIHx8IHAuc3Vic3RyKDAsNikgPT09IFwid2Via2l0XCIpIHsgLy9NaWNyb3NvZnQgYW5kIHNvbWUgV2Via2l0IGJyb3dzZXJzIGRvbid0IGNvbmZvcm0gdG8gdGhlIHN0YW5kYXJkIG9mIGNhcGl0YWxpemluZyB0aGUgZmlyc3QgcHJlZml4IGNoYXJhY3Rlciwgc28gd2UgYWRqdXN0IHNvIHRoYXQgd2hlbiB3ZSBwcmVmaXggdGhlIGNhcHMgd2l0aCBhIGRhc2gsIGl0J3MgY29ycmVjdCAob3RoZXJ3aXNlIGl0J2QgYmUgXCJtcy10cmFuc2Zvcm1cIiBpbnN0ZWFkIG9mIFwiLW1zLXRyYW5zZm9ybVwiIGZvciBJRTksIGZvciBleGFtcGxlKVxuXHRcdFx0XHRcdFx0XHRwID0gXCItXCIgKyBwO1xuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0cy5yZW1vdmVQcm9wZXJ0eShwLnJlcGxhY2UoX2NhcHNFeHAsIFwiLSQxXCIpLnRvTG93ZXJDYXNlKCkpO1xuXHRcdFx0XHRcdH0gZWxzZSB7IC8vbm90ZTogb2xkIHZlcnNpb25zIG9mIElFIHVzZSBcInJlbW92ZUF0dHJpYnV0ZSgpXCIgaW5zdGVhZCBvZiBcInJlbW92ZVByb3BlcnR5KClcIlxuXHRcdFx0XHRcdFx0cy5yZW1vdmVBdHRyaWJ1dGUocCk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cdFx0XHR9LFxuXHRcdFx0X3NldENsYXNzTmFtZVJhdGlvID0gZnVuY3Rpb24odikge1xuXHRcdFx0XHR0aGlzLnQuX2dzQ2xhc3NQVCA9IHRoaXM7XG5cdFx0XHRcdGlmICh2ID09PSAxIHx8IHYgPT09IDApIHtcblx0XHRcdFx0XHR0aGlzLnQuc2V0QXR0cmlidXRlKFwiY2xhc3NcIiwgKHYgPT09IDApID8gdGhpcy5iIDogdGhpcy5lKTtcblx0XHRcdFx0XHR2YXIgbXB0ID0gdGhpcy5kYXRhLCAvL2ZpcnN0IE1pbmlQcm9wVHdlZW5cblx0XHRcdFx0XHRcdHMgPSB0aGlzLnQuc3R5bGU7XG5cdFx0XHRcdFx0d2hpbGUgKG1wdCkge1xuXHRcdFx0XHRcdFx0aWYgKCFtcHQudikge1xuXHRcdFx0XHRcdFx0XHRfcmVtb3ZlUHJvcChzLCBtcHQucCk7XG5cdFx0XHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdFx0XHRzW21wdC5wXSA9IG1wdC52O1xuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0bXB0ID0gbXB0Ll9uZXh0O1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHRpZiAodiA9PT0gMSAmJiB0aGlzLnQuX2dzQ2xhc3NQVCA9PT0gdGhpcykge1xuXHRcdFx0XHRcdFx0dGhpcy50Ll9nc0NsYXNzUFQgPSBudWxsO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fSBlbHNlIGlmICh0aGlzLnQuZ2V0QXR0cmlidXRlKFwiY2xhc3NcIikgIT09IHRoaXMuZSkge1xuXHRcdFx0XHRcdHRoaXMudC5zZXRBdHRyaWJ1dGUoXCJjbGFzc1wiLCB0aGlzLmUpO1xuXHRcdFx0XHR9XG5cdFx0XHR9O1xuXHRcdF9yZWdpc3RlckNvbXBsZXhTcGVjaWFsUHJvcChcImNsYXNzTmFtZVwiLCB7cGFyc2VyOmZ1bmN0aW9uKHQsIGUsIHAsIGNzc3AsIHB0LCBwbHVnaW4sIHZhcnMpIHtcblx0XHRcdHZhciBiID0gdC5nZXRBdHRyaWJ1dGUoXCJjbGFzc1wiKSB8fCBcIlwiLCAvL2Rvbid0IHVzZSB0LmNsYXNzTmFtZSBiZWNhdXNlIGl0IGRvZXNuJ3Qgd29yayBjb25zaXN0ZW50bHkgb24gU1ZHIGVsZW1lbnRzOyBnZXRBdHRyaWJ1dGUoXCJjbGFzc1wiKSBhbmQgc2V0QXR0cmlidXRlKFwiY2xhc3NcIiwgdmFsdWVcIikgaXMgbW9yZSByZWxpYWJsZS5cblx0XHRcdFx0Y3NzVGV4dCA9IHQuc3R5bGUuY3NzVGV4dCxcblx0XHRcdFx0ZGlmRGF0YSwgYnMsIGNucHQsIGNucHRMb29rdXAsIG1wdDtcblx0XHRcdHB0ID0gY3NzcC5fY2xhc3NOYW1lUFQgPSBuZXcgQ1NTUHJvcFR3ZWVuKHQsIHAsIDAsIDAsIHB0LCAyKTtcblx0XHRcdHB0LnNldFJhdGlvID0gX3NldENsYXNzTmFtZVJhdGlvO1xuXHRcdFx0cHQucHIgPSAtMTE7XG5cdFx0XHRfaGFzUHJpb3JpdHkgPSB0cnVlO1xuXHRcdFx0cHQuYiA9IGI7XG5cdFx0XHRicyA9IF9nZXRBbGxTdHlsZXModCwgX2NzKTtcblx0XHRcdC8vaWYgdGhlcmUncyBhIGNsYXNzTmFtZSB0d2VlbiBhbHJlYWR5IG9wZXJhdGluZyBvbiB0aGUgdGFyZ2V0LCBmb3JjZSBpdCB0byBpdHMgZW5kIHNvIHRoYXQgdGhlIG5lY2Vzc2FyeSBpbmxpbmUgc3R5bGVzIGFyZSByZW1vdmVkIGFuZCB0aGUgY2xhc3MgbmFtZSBpcyBhcHBsaWVkIGJlZm9yZSB3ZSBkZXRlcm1pbmUgdGhlIGVuZCBzdGF0ZSAod2UgZG9uJ3Qgd2FudCBpbmxpbmUgc3R5bGVzIGludGVyZmVyaW5nIHRoYXQgd2VyZSB0aGVyZSBqdXN0IGZvciBjbGFzcy1zcGVjaWZpYyB2YWx1ZXMpXG5cdFx0XHRjbnB0ID0gdC5fZ3NDbGFzc1BUO1xuXHRcdFx0aWYgKGNucHQpIHtcblx0XHRcdFx0Y25wdExvb2t1cCA9IHt9O1xuXHRcdFx0XHRtcHQgPSBjbnB0LmRhdGE7IC8vZmlyc3QgTWluaVByb3BUd2VlbiB3aGljaCBzdG9yZXMgdGhlIGlubGluZSBzdHlsZXMgLSB3ZSBuZWVkIHRvIGZvcmNlIHRoZXNlIHNvIHRoYXQgdGhlIGlubGluZSBzdHlsZXMgZG9uJ3QgY29udGFtaW5hdGUgdGhpbmdzLiBPdGhlcndpc2UsIHRoZXJlJ3MgYSBzbWFsbCBjaGFuY2UgdGhhdCBhIHR3ZWVuIGNvdWxkIHN0YXJ0IGFuZCB0aGUgaW5saW5lIHZhbHVlcyBtYXRjaCB0aGUgZGVzdGluYXRpb24gdmFsdWVzIGFuZCB0aGV5IG5ldmVyIGdldCBjbGVhbmVkLlxuXHRcdFx0XHR3aGlsZSAobXB0KSB7XG5cdFx0XHRcdFx0Y25wdExvb2t1cFttcHQucF0gPSAxO1xuXHRcdFx0XHRcdG1wdCA9IG1wdC5fbmV4dDtcblx0XHRcdFx0fVxuXHRcdFx0XHRjbnB0LnNldFJhdGlvKDEpO1xuXHRcdFx0fVxuXHRcdFx0dC5fZ3NDbGFzc1BUID0gcHQ7XG5cdFx0XHRwdC5lID0gKGUuY2hhckF0KDEpICE9PSBcIj1cIikgPyBlIDogYi5yZXBsYWNlKG5ldyBSZWdFeHAoXCJcXFxccypcXFxcYlwiICsgZS5zdWJzdHIoMikgKyBcIlxcXFxiXCIpLCBcIlwiKSArICgoZS5jaGFyQXQoMCkgPT09IFwiK1wiKSA/IFwiIFwiICsgZS5zdWJzdHIoMikgOiBcIlwiKTtcblx0XHRcdHQuc2V0QXR0cmlidXRlKFwiY2xhc3NcIiwgcHQuZSk7XG5cdFx0XHRkaWZEYXRhID0gX2Nzc0RpZih0LCBicywgX2dldEFsbFN0eWxlcyh0KSwgdmFycywgY25wdExvb2t1cCk7XG5cdFx0XHR0LnNldEF0dHJpYnV0ZShcImNsYXNzXCIsIGIpO1xuXHRcdFx0cHQuZGF0YSA9IGRpZkRhdGEuZmlyc3RNUFQ7XG5cdFx0XHR0LnN0eWxlLmNzc1RleHQgPSBjc3NUZXh0OyAvL3dlIHJlY29yZGVkIGNzc1RleHQgYmVmb3JlIHdlIHN3YXBwZWQgY2xhc3NlcyBhbmQgcmFuIF9nZXRBbGxTdHlsZXMoKSBiZWNhdXNlIGluIGNhc2VzIHdoZW4gYSBjbGFzc05hbWUgdHdlZW4gaXMgb3ZlcndyaXR0ZW4sIHdlIHJlbW92ZSBhbGwgdGhlIHJlbGF0ZWQgdHdlZW5pbmcgcHJvcGVydGllcyBmcm9tIHRoYXQgY2xhc3MgY2hhbmdlIChvdGhlcndpc2UgY2xhc3Mtc3BlY2lmaWMgc3R1ZmYgY2FuJ3Qgb3ZlcnJpZGUgcHJvcGVydGllcyB3ZSd2ZSBkaXJlY3RseSBzZXQgb24gdGhlIHRhcmdldCdzIHN0eWxlIG9iamVjdCBkdWUgdG8gc3BlY2lmaWNpdHkpLlxuXHRcdFx0cHQgPSBwdC54Zmlyc3QgPSBjc3NwLnBhcnNlKHQsIGRpZkRhdGEuZGlmcywgcHQsIHBsdWdpbik7IC8vd2UgcmVjb3JkIHRoZSBDU1NQcm9wVHdlZW4gYXMgdGhlIHhmaXJzdCBzbyB0aGF0IHdlIGNhbiBoYW5kbGUgb3ZlcndyaXRpbmcgcHJvcGVydGx5IChpZiBcImNsYXNzTmFtZVwiIGdldHMgb3ZlcndyaXR0ZW4sIHdlIG11c3Qga2lsbCBhbGwgdGhlIHByb3BlcnRpZXMgYXNzb2NpYXRlZCB3aXRoIHRoZSBjbGFzc05hbWUgcGFydCBvZiB0aGUgdHdlZW4sIHNvIHdlIGNhbiBsb29wIHRocm91Z2ggZnJvbSB4Zmlyc3QgdG8gdGhlIHB0IGl0c2VsZilcblx0XHRcdHJldHVybiBwdDtcblx0XHR9fSk7XG5cblxuXHRcdHZhciBfc2V0Q2xlYXJQcm9wc1JhdGlvID0gZnVuY3Rpb24odikge1xuXHRcdFx0aWYgKHYgPT09IDEgfHwgdiA9PT0gMCkgaWYgKHRoaXMuZGF0YS5fdG90YWxUaW1lID09PSB0aGlzLmRhdGEuX3RvdGFsRHVyYXRpb24gJiYgdGhpcy5kYXRhLmRhdGEgIT09IFwiaXNGcm9tU3RhcnRcIikgeyAvL3RoaXMuZGF0YSByZWZlcnMgdG8gdGhlIHR3ZWVuLiBPbmx5IGNsZWFyIGF0IHRoZSBFTkQgb2YgdGhlIHR3ZWVuIChyZW1lbWJlciwgZnJvbSgpIHR3ZWVucyBtYWtlIHRoZSByYXRpbyBnbyBmcm9tIDEgdG8gMCwgc28gd2UgY2FuJ3QganVzdCBjaGVjayB0aGF0IGFuZCBpZiB0aGUgdHdlZW4gaXMgdGhlIHplcm8tZHVyYXRpb24gb25lIHRoYXQncyBjcmVhdGVkIGludGVybmFsbHkgdG8gcmVuZGVyIHRoZSBzdGFydGluZyB2YWx1ZXMgaW4gYSBmcm9tKCkgdHdlZW4sIGlnbm9yZSB0aGF0IGJlY2F1c2Ugb3RoZXJ3aXNlLCBmb3IgZXhhbXBsZSwgZnJvbSguLi57aGVpZ2h0OjEwMCwgY2xlYXJQcm9wczpcImhlaWdodFwiLCBkZWxheToxfSkgd291bGQgd2lwZSB0aGUgaGVpZ2h0IGF0IHRoZSBiZWdpbm5pbmcgb2YgdGhlIHR3ZWVuIGFuZCBhZnRlciAxIHNlY29uZCwgaXQnZCBraWNrIGJhY2sgaW4pLlxuXHRcdFx0XHR2YXIgcyA9IHRoaXMudC5zdHlsZSxcblx0XHRcdFx0XHR0cmFuc2Zvcm1QYXJzZSA9IF9zcGVjaWFsUHJvcHMudHJhbnNmb3JtLnBhcnNlLFxuXHRcdFx0XHRcdGEsIHAsIGksIGNsZWFyVHJhbnNmb3JtLCB0cmFuc2Zvcm07XG5cdFx0XHRcdGlmICh0aGlzLmUgPT09IFwiYWxsXCIpIHtcblx0XHRcdFx0XHRzLmNzc1RleHQgPSBcIlwiO1xuXHRcdFx0XHRcdGNsZWFyVHJhbnNmb3JtID0gdHJ1ZTtcblx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRhID0gdGhpcy5lLnNwbGl0KFwiIFwiKS5qb2luKFwiXCIpLnNwbGl0KFwiLFwiKTtcblx0XHRcdFx0XHRpID0gYS5sZW5ndGg7XG5cdFx0XHRcdFx0d2hpbGUgKC0taSA+IC0xKSB7XG5cdFx0XHRcdFx0XHRwID0gYVtpXTtcblx0XHRcdFx0XHRcdGlmIChfc3BlY2lhbFByb3BzW3BdKSB7XG5cdFx0XHRcdFx0XHRcdGlmIChfc3BlY2lhbFByb3BzW3BdLnBhcnNlID09PSB0cmFuc2Zvcm1QYXJzZSkge1xuXHRcdFx0XHRcdFx0XHRcdGNsZWFyVHJhbnNmb3JtID0gdHJ1ZTtcblx0XHRcdFx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRcdFx0XHRwID0gKHAgPT09IFwidHJhbnNmb3JtT3JpZ2luXCIpID8gX3RyYW5zZm9ybU9yaWdpblByb3AgOiBfc3BlY2lhbFByb3BzW3BdLnA7IC8vZW5zdXJlcyB0aGF0IHNwZWNpYWwgcHJvcGVydGllcyB1c2UgdGhlIHByb3BlciBicm93c2VyLXNwZWNpZmljIHByb3BlcnR5IG5hbWUsIGxpa2UgXCJzY2FsZVhcIiBtaWdodCBiZSBcIi13ZWJraXQtdHJhbnNmb3JtXCIgb3IgXCJib3hTaGFkb3dcIiBtaWdodCBiZSBcIi1tb3otYm94LXNoYWRvd1wiXG5cdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdF9yZW1vdmVQcm9wKHMsIHApO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXHRcdFx0XHRpZiAoY2xlYXJUcmFuc2Zvcm0pIHtcblx0XHRcdFx0XHRfcmVtb3ZlUHJvcChzLCBfdHJhbnNmb3JtUHJvcCk7XG5cdFx0XHRcdFx0dHJhbnNmb3JtID0gdGhpcy50Ll9nc1RyYW5zZm9ybTtcblx0XHRcdFx0XHRpZiAodHJhbnNmb3JtKSB7XG5cdFx0XHRcdFx0XHRpZiAodHJhbnNmb3JtLnN2Zykge1xuXHRcdFx0XHRcdFx0XHR0aGlzLnQucmVtb3ZlQXR0cmlidXRlKFwiZGF0YS1zdmctb3JpZ2luXCIpO1xuXHRcdFx0XHRcdFx0XHR0aGlzLnQucmVtb3ZlQXR0cmlidXRlKFwidHJhbnNmb3JtXCIpO1xuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0ZGVsZXRlIHRoaXMudC5fZ3NUcmFuc2Zvcm07XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cblx0XHRcdH1cblx0XHR9O1xuXHRcdF9yZWdpc3RlckNvbXBsZXhTcGVjaWFsUHJvcChcImNsZWFyUHJvcHNcIiwge3BhcnNlcjpmdW5jdGlvbih0LCBlLCBwLCBjc3NwLCBwdCkge1xuXHRcdFx0cHQgPSBuZXcgQ1NTUHJvcFR3ZWVuKHQsIHAsIDAsIDAsIHB0LCAyKTtcblx0XHRcdHB0LnNldFJhdGlvID0gX3NldENsZWFyUHJvcHNSYXRpbztcblx0XHRcdHB0LmUgPSBlO1xuXHRcdFx0cHQucHIgPSAtMTA7XG5cdFx0XHRwdC5kYXRhID0gY3NzcC5fdHdlZW47XG5cdFx0XHRfaGFzUHJpb3JpdHkgPSB0cnVlO1xuXHRcdFx0cmV0dXJuIHB0O1xuXHRcdH19KTtcblxuXHRcdHAgPSBcImJlemllcix0aHJvd1Byb3BzLHBoeXNpY3NQcm9wcyxwaHlzaWNzMkRcIi5zcGxpdChcIixcIik7XG5cdFx0aSA9IHAubGVuZ3RoO1xuXHRcdHdoaWxlIChpLS0pIHtcblx0XHRcdF9yZWdpc3RlclBsdWdpblByb3AocFtpXSk7XG5cdFx0fVxuXG5cblxuXG5cblxuXG5cblx0XHRwID0gQ1NTUGx1Z2luLnByb3RvdHlwZTtcblx0XHRwLl9maXJzdFBUID0gcC5fbGFzdFBhcnNlZFRyYW5zZm9ybSA9IHAuX3RyYW5zZm9ybSA9IG51bGw7XG5cblx0XHQvL2dldHMgY2FsbGVkIHdoZW4gdGhlIHR3ZWVuIHJlbmRlcnMgZm9yIHRoZSBmaXJzdCB0aW1lLiBUaGlzIGtpY2tzIGV2ZXJ5dGhpbmcgb2ZmLCByZWNvcmRpbmcgc3RhcnQvZW5kIHZhbHVlcywgZXRjLlxuXHRcdHAuX29uSW5pdFR3ZWVuID0gZnVuY3Rpb24odGFyZ2V0LCB2YXJzLCB0d2Vlbikge1xuXHRcdFx0aWYgKCF0YXJnZXQubm9kZVR5cGUpIHsgLy9jc3MgaXMgb25seSBmb3IgZG9tIGVsZW1lbnRzXG5cdFx0XHRcdHJldHVybiBmYWxzZTtcblx0XHRcdH1cblx0XHRcdHRoaXMuX3RhcmdldCA9IHRhcmdldDtcblx0XHRcdHRoaXMuX3R3ZWVuID0gdHdlZW47XG5cdFx0XHR0aGlzLl92YXJzID0gdmFycztcblx0XHRcdF9hdXRvUm91bmQgPSB2YXJzLmF1dG9Sb3VuZDtcblx0XHRcdF9oYXNQcmlvcml0eSA9IGZhbHNlO1xuXHRcdFx0X3N1ZmZpeE1hcCA9IHZhcnMuc3VmZml4TWFwIHx8IENTU1BsdWdpbi5zdWZmaXhNYXA7XG5cdFx0XHRfY3MgPSBfZ2V0Q29tcHV0ZWRTdHlsZSh0YXJnZXQsIFwiXCIpO1xuXHRcdFx0X292ZXJ3cml0ZVByb3BzID0gdGhpcy5fb3ZlcndyaXRlUHJvcHM7XG5cdFx0XHR2YXIgc3R5bGUgPSB0YXJnZXQuc3R5bGUsXG5cdFx0XHRcdHYsIHB0LCBwdDIsIGZpcnN0LCBsYXN0LCBuZXh0LCB6SW5kZXgsIHRwdCwgdGhyZWVEO1xuXHRcdFx0aWYgKF9yZXFTYWZhcmlGaXgpIGlmIChzdHlsZS56SW5kZXggPT09IFwiXCIpIHtcblx0XHRcdFx0diA9IF9nZXRTdHlsZSh0YXJnZXQsIFwiekluZGV4XCIsIF9jcyk7XG5cdFx0XHRcdGlmICh2ID09PSBcImF1dG9cIiB8fCB2ID09PSBcIlwiKSB7XG5cdFx0XHRcdFx0Ly9jb3JyZWN0cyBhIGJ1ZyBpbiBbbm9uLUFuZHJvaWRdIFNhZmFyaSB0aGF0IHByZXZlbnRzIGl0IGZyb20gcmVwYWludGluZyBlbGVtZW50cyBpbiB0aGVpciBuZXcgcG9zaXRpb25zIGlmIHRoZXkgZG9uJ3QgaGF2ZSBhIHpJbmRleCBzZXQuIFdlIGFsc28gY2FuJ3QganVzdCBhcHBseSB0aGlzIGluc2lkZSBfcGFyc2VUcmFuc2Zvcm0oKSBiZWNhdXNlIGFueXRoaW5nIHRoYXQncyBtb3ZlZCBpbiBhbnkgd2F5IChsaWtlIHVzaW5nIFwibGVmdFwiIG9yIFwidG9wXCIgaW5zdGVhZCBvZiB0cmFuc2Zvcm1zIGxpa2UgXCJ4XCIgYW5kIFwieVwiKSBjYW4gYmUgYWZmZWN0ZWQsIHNvIGl0IGlzIGJlc3QgdG8gZW5zdXJlIHRoYXQgYW55dGhpbmcgdGhhdCdzIHR3ZWVuaW5nIGhhcyBhIHotaW5kZXguIFNldHRpbmcgXCJXZWJraXRQZXJzcGVjdGl2ZVwiIHRvIGEgbm9uLXplcm8gdmFsdWUgd29ya2VkIHRvbyBleGNlcHQgdGhhdCBvbiBpT1MgU2FmYXJpIHRoaW5ncyB3b3VsZCBmbGlja2VyIHJhbmRvbWx5LiBQbHVzIHpJbmRleCBpcyBsZXNzIG1lbW9yeS1pbnRlbnNpdmUuXG5cdFx0XHRcdFx0dGhpcy5fYWRkTGF6eVNldChzdHlsZSwgXCJ6SW5kZXhcIiwgMCk7XG5cdFx0XHRcdH1cblx0XHRcdH1cblxuXHRcdFx0aWYgKHR5cGVvZih2YXJzKSA9PT0gXCJzdHJpbmdcIikge1xuXHRcdFx0XHRmaXJzdCA9IHN0eWxlLmNzc1RleHQ7XG5cdFx0XHRcdHYgPSBfZ2V0QWxsU3R5bGVzKHRhcmdldCwgX2NzKTtcblx0XHRcdFx0c3R5bGUuY3NzVGV4dCA9IGZpcnN0ICsgXCI7XCIgKyB2YXJzO1xuXHRcdFx0XHR2ID0gX2Nzc0RpZih0YXJnZXQsIHYsIF9nZXRBbGxTdHlsZXModGFyZ2V0KSkuZGlmcztcblx0XHRcdFx0aWYgKCFfc3VwcG9ydHNPcGFjaXR5ICYmIF9vcGFjaXR5VmFsRXhwLnRlc3QodmFycykpIHtcblx0XHRcdFx0XHR2Lm9wYWNpdHkgPSBwYXJzZUZsb2F0KCBSZWdFeHAuJDEgKTtcblx0XHRcdFx0fVxuXHRcdFx0XHR2YXJzID0gdjtcblx0XHRcdFx0c3R5bGUuY3NzVGV4dCA9IGZpcnN0O1xuXHRcdFx0fVxuXG5cdFx0XHRpZiAodmFycy5jbGFzc05hbWUpIHsgLy9jbGFzc05hbWUgdHdlZW5zIHdpbGwgY29tYmluZSBhbnkgZGlmZmVyZW5jZXMgdGhleSBmaW5kIGluIHRoZSBjc3Mgd2l0aCB0aGUgdmFycyB0aGF0IGFyZSBwYXNzZWQgaW4sIHNvIHtjbGFzc05hbWU6XCJteUNsYXNzXCIsIHNjYWxlOjAuNSwgbGVmdDoyMH0gd291bGQgd29yay5cblx0XHRcdFx0dGhpcy5fZmlyc3RQVCA9IHB0ID0gX3NwZWNpYWxQcm9wcy5jbGFzc05hbWUucGFyc2UodGFyZ2V0LCB2YXJzLmNsYXNzTmFtZSwgXCJjbGFzc05hbWVcIiwgdGhpcywgbnVsbCwgbnVsbCwgdmFycyk7XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHR0aGlzLl9maXJzdFBUID0gcHQgPSB0aGlzLnBhcnNlKHRhcmdldCwgdmFycywgbnVsbCk7XG5cdFx0XHR9XG5cblx0XHRcdGlmICh0aGlzLl90cmFuc2Zvcm1UeXBlKSB7XG5cdFx0XHRcdHRocmVlRCA9ICh0aGlzLl90cmFuc2Zvcm1UeXBlID09PSAzKTtcblx0XHRcdFx0aWYgKCFfdHJhbnNmb3JtUHJvcCkge1xuXHRcdFx0XHRcdHN0eWxlLnpvb20gPSAxOyAvL2hlbHBzIGNvcnJlY3QgYW4gSUUgaXNzdWUuXG5cdFx0XHRcdH0gZWxzZSBpZiAoX2lzU2FmYXJpKSB7XG5cdFx0XHRcdFx0X3JlcVNhZmFyaUZpeCA9IHRydWU7XG5cdFx0XHRcdFx0Ly9pZiB6SW5kZXggaXNuJ3Qgc2V0LCBpT1MgU2FmYXJpIGRvZXNuJ3QgcmVwYWludCB0aGluZ3MgY29ycmVjdGx5IHNvbWV0aW1lcyAoc2VlbWluZ2x5IGF0IHJhbmRvbSkuXG5cdFx0XHRcdFx0aWYgKHN0eWxlLnpJbmRleCA9PT0gXCJcIikge1xuXHRcdFx0XHRcdFx0ekluZGV4ID0gX2dldFN0eWxlKHRhcmdldCwgXCJ6SW5kZXhcIiwgX2NzKTtcblx0XHRcdFx0XHRcdGlmICh6SW5kZXggPT09IFwiYXV0b1wiIHx8IHpJbmRleCA9PT0gXCJcIikge1xuXHRcdFx0XHRcdFx0XHR0aGlzLl9hZGRMYXp5U2V0KHN0eWxlLCBcInpJbmRleFwiLCAwKTtcblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0Ly9TZXR0aW5nIFdlYmtpdEJhY2tmYWNlVmlzaWJpbGl0eSBjb3JyZWN0cyAzIGJ1Z3M6XG5cdFx0XHRcdFx0Ly8gMSkgW25vbi1BbmRyb2lkXSBTYWZhcmkgc2tpcHMgcmVuZGVyaW5nIGNoYW5nZXMgdG8gXCJ0b3BcIiBhbmQgXCJsZWZ0XCIgdGhhdCBhcmUgbWFkZSBvbiB0aGUgc2FtZSBmcmFtZS9yZW5kZXIgYXMgYSB0cmFuc2Zvcm0gdXBkYXRlLlxuXHRcdFx0XHRcdC8vIDIpIGlPUyBTYWZhcmkgc29tZXRpbWVzIG5lZ2xlY3RzIHRvIHJlcGFpbnQgZWxlbWVudHMgaW4gdGhlaXIgbmV3IHBvc2l0aW9ucy4gU2V0dGluZyBcIldlYmtpdFBlcnNwZWN0aXZlXCIgdG8gYSBub24temVybyB2YWx1ZSB3b3JrZWQgdG9vIGV4Y2VwdCB0aGF0IG9uIGlPUyBTYWZhcmkgdGhpbmdzIHdvdWxkIGZsaWNrZXIgcmFuZG9tbHkuXG5cdFx0XHRcdFx0Ly8gMykgU2FmYXJpIHNvbWV0aW1lcyBkaXNwbGF5ZWQgb2RkIGFydGlmYWN0cyB3aGVuIHR3ZWVuaW5nIHRoZSB0cmFuc2Zvcm0gKG9yIFdlYmtpdFRyYW5zZm9ybSkgcHJvcGVydHksIGxpa2UgZ2hvc3RzIG9mIHRoZSBlZGdlcyBvZiB0aGUgZWxlbWVudCByZW1haW5lZC4gRGVmaW5pdGVseSBhIGJyb3dzZXIgYnVnLlxuXHRcdFx0XHRcdC8vTm90ZTogd2UgYWxsb3cgdGhlIHVzZXIgdG8gb3ZlcnJpZGUgdGhlIGF1dG8tc2V0dGluZyBieSBkZWZpbmluZyBXZWJraXRCYWNrZmFjZVZpc2liaWxpdHkgaW4gdGhlIHZhcnMgb2YgdGhlIHR3ZWVuLlxuXHRcdFx0XHRcdGlmIChfaXNTYWZhcmlMVDYpIHtcblx0XHRcdFx0XHRcdHRoaXMuX2FkZExhenlTZXQoc3R5bGUsIFwiV2Via2l0QmFja2ZhY2VWaXNpYmlsaXR5XCIsIHRoaXMuX3ZhcnMuV2Via2l0QmFja2ZhY2VWaXNpYmlsaXR5IHx8ICh0aHJlZUQgPyBcInZpc2libGVcIiA6IFwiaGlkZGVuXCIpKTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblx0XHRcdFx0cHQyID0gcHQ7XG5cdFx0XHRcdHdoaWxlIChwdDIgJiYgcHQyLl9uZXh0KSB7XG5cdFx0XHRcdFx0cHQyID0gcHQyLl9uZXh0O1xuXHRcdFx0XHR9XG5cdFx0XHRcdHRwdCA9IG5ldyBDU1NQcm9wVHdlZW4odGFyZ2V0LCBcInRyYW5zZm9ybVwiLCAwLCAwLCBudWxsLCAyKTtcblx0XHRcdFx0dGhpcy5fbGlua0NTU1AodHB0LCBudWxsLCBwdDIpO1xuXHRcdFx0XHR0cHQuc2V0UmF0aW8gPSBfdHJhbnNmb3JtUHJvcCA/IF9zZXRUcmFuc2Zvcm1SYXRpbyA6IF9zZXRJRVRyYW5zZm9ybVJhdGlvO1xuXHRcdFx0XHR0cHQuZGF0YSA9IHRoaXMuX3RyYW5zZm9ybSB8fCBfZ2V0VHJhbnNmb3JtKHRhcmdldCwgX2NzLCB0cnVlKTtcblx0XHRcdFx0dHB0LnR3ZWVuID0gdHdlZW47XG5cdFx0XHRcdHRwdC5wciA9IC0xOyAvL2Vuc3VyZXMgdGhhdCB0aGUgdHJhbnNmb3JtcyBnZXQgYXBwbGllZCBhZnRlciB0aGUgY29tcG9uZW50cyBhcmUgdXBkYXRlZC5cblx0XHRcdFx0X292ZXJ3cml0ZVByb3BzLnBvcCgpOyAvL3dlIGRvbid0IHdhbnQgdG8gZm9yY2UgdGhlIG92ZXJ3cml0ZSBvZiBhbGwgXCJ0cmFuc2Zvcm1cIiB0d2VlbnMgb2YgdGhlIHRhcmdldCAtIHdlIG9ubHkgY2FyZSBhYm91dCBpbmRpdmlkdWFsIHRyYW5zZm9ybSBwcm9wZXJ0aWVzIGxpa2Ugc2NhbGVYLCByb3RhdGlvbiwgZXRjLiBUaGUgQ1NTUHJvcFR3ZWVuIGNvbnN0cnVjdG9yIGF1dG9tYXRpY2FsbHkgYWRkcyB0aGUgcHJvcGVydHkgdG8gX292ZXJ3cml0ZVByb3BzIHdoaWNoIGlzIHdoeSB3ZSBuZWVkIHRvIHBvcCgpIGhlcmUuXG5cdFx0XHR9XG5cblx0XHRcdGlmIChfaGFzUHJpb3JpdHkpIHtcblx0XHRcdFx0Ly9yZW9yZGVycyB0aGUgbGlua2VkIGxpc3QgaW4gb3JkZXIgb2YgcHIgKHByaW9yaXR5KVxuXHRcdFx0XHR3aGlsZSAocHQpIHtcblx0XHRcdFx0XHRuZXh0ID0gcHQuX25leHQ7XG5cdFx0XHRcdFx0cHQyID0gZmlyc3Q7XG5cdFx0XHRcdFx0d2hpbGUgKHB0MiAmJiBwdDIucHIgPiBwdC5wcikge1xuXHRcdFx0XHRcdFx0cHQyID0gcHQyLl9uZXh0O1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHRpZiAoKHB0Ll9wcmV2ID0gcHQyID8gcHQyLl9wcmV2IDogbGFzdCkpIHtcblx0XHRcdFx0XHRcdHB0Ll9wcmV2Ll9uZXh0ID0gcHQ7XG5cdFx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRcdGZpcnN0ID0gcHQ7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdGlmICgocHQuX25leHQgPSBwdDIpKSB7XG5cdFx0XHRcdFx0XHRwdDIuX3ByZXYgPSBwdDtcblx0XHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdFx0bGFzdCA9IHB0O1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHRwdCA9IG5leHQ7XG5cdFx0XHRcdH1cblx0XHRcdFx0dGhpcy5fZmlyc3RQVCA9IGZpcnN0O1xuXHRcdFx0fVxuXHRcdFx0cmV0dXJuIHRydWU7XG5cdFx0fTtcblxuXG5cdFx0cC5wYXJzZSA9IGZ1bmN0aW9uKHRhcmdldCwgdmFycywgcHQsIHBsdWdpbikge1xuXHRcdFx0dmFyIHN0eWxlID0gdGFyZ2V0LnN0eWxlLFxuXHRcdFx0XHRwLCBzcCwgYm4sIGVuLCBicywgZXMsIGJzZngsIGVzZngsIGlzU3RyLCByZWw7XG5cdFx0XHRmb3IgKHAgaW4gdmFycykge1xuXHRcdFx0XHRlcyA9IHZhcnNbcF07IC8vZW5kaW5nIHZhbHVlIHN0cmluZ1xuXHRcdFx0XHRzcCA9IF9zcGVjaWFsUHJvcHNbcF07IC8vU3BlY2lhbFByb3AgbG9va3VwLlxuXHRcdFx0XHRpZiAoc3ApIHtcblx0XHRcdFx0XHRwdCA9IHNwLnBhcnNlKHRhcmdldCwgZXMsIHAsIHRoaXMsIHB0LCBwbHVnaW4sIHZhcnMpO1xuXG5cdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0YnMgPSBfZ2V0U3R5bGUodGFyZ2V0LCBwLCBfY3MpICsgXCJcIjtcblx0XHRcdFx0XHRpc1N0ciA9ICh0eXBlb2YoZXMpID09PSBcInN0cmluZ1wiKTtcblx0XHRcdFx0XHRpZiAocCA9PT0gXCJjb2xvclwiIHx8IHAgPT09IFwiZmlsbFwiIHx8IHAgPT09IFwic3Ryb2tlXCIgfHwgcC5pbmRleE9mKFwiQ29sb3JcIikgIT09IC0xIHx8IChpc1N0ciAmJiBfcmdiaHNsRXhwLnRlc3QoZXMpKSkgeyAvL09wZXJhIHVzZXMgYmFja2dyb3VuZDogdG8gZGVmaW5lIGNvbG9yIHNvbWV0aW1lcyBpbiBhZGRpdGlvbiB0byBiYWNrZ3JvdW5kQ29sb3I6XG5cdFx0XHRcdFx0XHRpZiAoIWlzU3RyKSB7XG5cdFx0XHRcdFx0XHRcdGVzID0gX3BhcnNlQ29sb3IoZXMpO1xuXHRcdFx0XHRcdFx0XHRlcyA9ICgoZXMubGVuZ3RoID4gMykgPyBcInJnYmEoXCIgOiBcInJnYihcIikgKyBlcy5qb2luKFwiLFwiKSArIFwiKVwiO1xuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0cHQgPSBfcGFyc2VDb21wbGV4KHN0eWxlLCBwLCBicywgZXMsIHRydWUsIFwidHJhbnNwYXJlbnRcIiwgcHQsIDAsIHBsdWdpbik7XG5cblx0XHRcdFx0XHR9IGVsc2UgaWYgKGlzU3RyICYmIChlcy5pbmRleE9mKFwiIFwiKSAhPT0gLTEgfHwgZXMuaW5kZXhPZihcIixcIikgIT09IC0xKSkge1xuXHRcdFx0XHRcdFx0cHQgPSBfcGFyc2VDb21wbGV4KHN0eWxlLCBwLCBicywgZXMsIHRydWUsIG51bGwsIHB0LCAwLCBwbHVnaW4pO1xuXG5cdFx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRcdGJuID0gcGFyc2VGbG9hdChicyk7XG5cdFx0XHRcdFx0XHRic2Z4ID0gKGJuIHx8IGJuID09PSAwKSA/IGJzLnN1YnN0cigoYm4gKyBcIlwiKS5sZW5ndGgpIDogXCJcIjsgLy9yZW1lbWJlciwgYnMgY291bGQgYmUgbm9uLW51bWVyaWMgbGlrZSBcIm5vcm1hbFwiIGZvciBmb250V2VpZ2h0LCBzbyB3ZSBzaG91bGQgZGVmYXVsdCB0byBhIGJsYW5rIHN1ZmZpeCBpbiB0aGF0IGNhc2UuXG5cblx0XHRcdFx0XHRcdGlmIChicyA9PT0gXCJcIiB8fCBicyA9PT0gXCJhdXRvXCIpIHtcblx0XHRcdFx0XHRcdFx0aWYgKHAgPT09IFwid2lkdGhcIiB8fCBwID09PSBcImhlaWdodFwiKSB7XG5cdFx0XHRcdFx0XHRcdFx0Ym4gPSBfZ2V0RGltZW5zaW9uKHRhcmdldCwgcCwgX2NzKTtcblx0XHRcdFx0XHRcdFx0XHRic2Z4ID0gXCJweFwiO1xuXHRcdFx0XHRcdFx0XHR9IGVsc2UgaWYgKHAgPT09IFwibGVmdFwiIHx8IHAgPT09IFwidG9wXCIpIHtcblx0XHRcdFx0XHRcdFx0XHRibiA9IF9jYWxjdWxhdGVPZmZzZXQodGFyZ2V0LCBwLCBfY3MpO1xuXHRcdFx0XHRcdFx0XHRcdGJzZnggPSBcInB4XCI7XG5cdFx0XHRcdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0XHRcdFx0Ym4gPSAocCAhPT0gXCJvcGFjaXR5XCIpID8gMCA6IDE7XG5cdFx0XHRcdFx0XHRcdFx0YnNmeCA9IFwiXCI7XG5cdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdFx0cmVsID0gKGlzU3RyICYmIGVzLmNoYXJBdCgxKSA9PT0gXCI9XCIpO1xuXHRcdFx0XHRcdFx0aWYgKHJlbCkge1xuXHRcdFx0XHRcdFx0XHRlbiA9IHBhcnNlSW50KGVzLmNoYXJBdCgwKSArIFwiMVwiLCAxMCk7XG5cdFx0XHRcdFx0XHRcdGVzID0gZXMuc3Vic3RyKDIpO1xuXHRcdFx0XHRcdFx0XHRlbiAqPSBwYXJzZUZsb2F0KGVzKTtcblx0XHRcdFx0XHRcdFx0ZXNmeCA9IGVzLnJlcGxhY2UoX3N1ZmZpeEV4cCwgXCJcIik7XG5cdFx0XHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdFx0XHRlbiA9IHBhcnNlRmxvYXQoZXMpO1xuXHRcdFx0XHRcdFx0XHRlc2Z4ID0gaXNTdHIgPyBlcy5yZXBsYWNlKF9zdWZmaXhFeHAsIFwiXCIpIDogXCJcIjtcblx0XHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdFx0aWYgKGVzZnggPT09IFwiXCIpIHtcblx0XHRcdFx0XHRcdFx0ZXNmeCA9IChwIGluIF9zdWZmaXhNYXApID8gX3N1ZmZpeE1hcFtwXSA6IGJzZng7IC8vcG9wdWxhdGUgdGhlIGVuZCBzdWZmaXgsIHByaW9yaXRpemluZyB0aGUgbWFwLCB0aGVuIGlmIG5vbmUgaXMgZm91bmQsIHVzZSB0aGUgYmVnaW5uaW5nIHN1ZmZpeC5cblx0XHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdFx0ZXMgPSAoZW4gfHwgZW4gPT09IDApID8gKHJlbCA/IGVuICsgYm4gOiBlbikgKyBlc2Z4IDogdmFyc1twXTsgLy9lbnN1cmVzIHRoYXQgYW55ICs9IG9yIC09IHByZWZpeGVzIGFyZSB0YWtlbiBjYXJlIG9mLiBSZWNvcmQgdGhlIGVuZCB2YWx1ZSBiZWZvcmUgbm9ybWFsaXppbmcgdGhlIHN1ZmZpeCBiZWNhdXNlIHdlIGFsd2F5cyB3YW50IHRvIGVuZCB0aGUgdHdlZW4gb24gZXhhY3RseSB3aGF0IHRoZXkgaW50ZW5kZWQgZXZlbiBpZiBpdCBkb2Vzbid0IG1hdGNoIHRoZSBiZWdpbm5pbmcgdmFsdWUncyBzdWZmaXguXG5cblx0XHRcdFx0XHRcdC8vaWYgdGhlIGJlZ2lubmluZy9lbmRpbmcgc3VmZml4ZXMgZG9uJ3QgbWF0Y2gsIG5vcm1hbGl6ZSB0aGVtLi4uXG5cdFx0XHRcdFx0XHRpZiAoYnNmeCAhPT0gZXNmeCkgaWYgKGVzZnggIT09IFwiXCIpIGlmIChlbiB8fCBlbiA9PT0gMCkgaWYgKGJuKSB7IC8vbm90ZTogaWYgdGhlIGJlZ2lubmluZyB2YWx1ZSAoYm4pIGlzIDAsIHdlIGRvbid0IG5lZWQgdG8gY29udmVydCB1bml0cyFcblx0XHRcdFx0XHRcdFx0Ym4gPSBfY29udmVydFRvUGl4ZWxzKHRhcmdldCwgcCwgYm4sIGJzZngpO1xuXHRcdFx0XHRcdFx0XHRpZiAoZXNmeCA9PT0gXCIlXCIpIHtcblx0XHRcdFx0XHRcdFx0XHRibiAvPSBfY29udmVydFRvUGl4ZWxzKHRhcmdldCwgcCwgMTAwLCBcIiVcIikgLyAxMDA7XG5cdFx0XHRcdFx0XHRcdFx0aWYgKHZhcnMuc3RyaWN0VW5pdHMgIT09IHRydWUpIHsgLy9zb21lIGJyb3dzZXJzIHJlcG9ydCBvbmx5IFwicHhcIiB2YWx1ZXMgaW5zdGVhZCBvZiBhbGxvd2luZyBcIiVcIiB3aXRoIGdldENvbXB1dGVkU3R5bGUoKSwgc28gd2UgYXNzdW1lIHRoYXQgaWYgd2UncmUgdHdlZW5pbmcgdG8gYSAlLCB3ZSBzaG91bGQgc3RhcnQgdGhlcmUgdG9vIHVubGVzcyBzdHJpY3RVbml0czp0cnVlIGlzIGRlZmluZWQuIFRoaXMgYXBwcm9hY2ggaXMgcGFydGljdWxhcmx5IHVzZWZ1bCBmb3IgcmVzcG9uc2l2ZSBkZXNpZ25zIHRoYXQgdXNlIGZyb20oKSB0d2VlbnMuXG5cdFx0XHRcdFx0XHRcdFx0XHRicyA9IGJuICsgXCIlXCI7XG5cdFx0XHRcdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0XHRcdH0gZWxzZSBpZiAoZXNmeCA9PT0gXCJlbVwiIHx8IGVzZnggPT09IFwicmVtXCIgfHwgZXNmeCA9PT0gXCJ2d1wiIHx8IGVzZnggPT09IFwidmhcIikge1xuXHRcdFx0XHRcdFx0XHRcdGJuIC89IF9jb252ZXJ0VG9QaXhlbHModGFyZ2V0LCBwLCAxLCBlc2Z4KTtcblxuXHRcdFx0XHRcdFx0XHQvL290aGVyd2lzZSBjb252ZXJ0IHRvIHBpeGVscy5cblx0XHRcdFx0XHRcdFx0fSBlbHNlIGlmIChlc2Z4ICE9PSBcInB4XCIpIHtcblx0XHRcdFx0XHRcdFx0XHRlbiA9IF9jb252ZXJ0VG9QaXhlbHModGFyZ2V0LCBwLCBlbiwgZXNmeCk7XG5cdFx0XHRcdFx0XHRcdFx0ZXNmeCA9IFwicHhcIjsgLy93ZSBkb24ndCB1c2UgYnNmeCBhZnRlciB0aGlzLCBzbyB3ZSBkb24ndCBuZWVkIHRvIHNldCBpdCB0byBweCB0b28uXG5cdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdFx0aWYgKHJlbCkgaWYgKGVuIHx8IGVuID09PSAwKSB7XG5cdFx0XHRcdFx0XHRcdFx0ZXMgPSAoZW4gKyBibikgKyBlc2Z4OyAvL3RoZSBjaGFuZ2VzIHdlIG1hZGUgYWZmZWN0IHJlbGF0aXZlIGNhbGN1bGF0aW9ucywgc28gYWRqdXN0IHRoZSBlbmQgdmFsdWUgaGVyZS5cblx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0XHRpZiAocmVsKSB7XG5cdFx0XHRcdFx0XHRcdGVuICs9IGJuO1xuXHRcdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0XHRpZiAoKGJuIHx8IGJuID09PSAwKSAmJiAoZW4gfHwgZW4gPT09IDApKSB7IC8vZmFzdGVyIHRoYW4gaXNOYU4oKS4gQWxzbywgcHJldmlvdXNseSB3ZSByZXF1aXJlZCBlbiAhPT0gYm4gYnV0IHRoYXQgZG9lc24ndCByZWFsbHkgZ2FpbiBtdWNoIHBlcmZvcm1hbmNlIGFuZCBpdCBwcmV2ZW50cyBfcGFyc2VUb1Byb3h5KCkgZnJvbSB3b3JraW5nIHByb3Blcmx5IGlmIGJlZ2lubmluZyBhbmQgZW5kaW5nIHZhbHVlcyBtYXRjaCBidXQgbmVlZCB0byBnZXQgdHdlZW5lZCBieSBhbiBleHRlcm5hbCBwbHVnaW4gYW55d2F5LiBGb3IgZXhhbXBsZSwgYSBiZXppZXIgdHdlZW4gd2hlcmUgdGhlIHRhcmdldCBzdGFydHMgYXQgbGVmdDowIGFuZCBoYXMgdGhlc2UgcG9pbnRzOiBbe2xlZnQ6NTB9LHtsZWZ0OjB9XSB3b3VsZG4ndCB3b3JrIHByb3Blcmx5IGJlY2F1c2Ugd2hlbiBwYXJzaW5nIHRoZSBsYXN0IHBvaW50LCBpdCdkIG1hdGNoIHRoZSBmaXJzdCAoY3VycmVudCkgb25lIGFuZCBhIG5vbi10d2VlbmluZyBDU1NQcm9wVHdlZW4gd291bGQgYmUgcmVjb3JkZWQgd2hlbiB3ZSBhY3R1YWxseSBuZWVkIGEgbm9ybWFsIHR3ZWVuICh0eXBlOjApIHNvIHRoYXQgdGhpbmdzIGdldCB1cGRhdGVkIGR1cmluZyB0aGUgdHdlZW4gcHJvcGVybHkuXG5cdFx0XHRcdFx0XHRcdHB0ID0gbmV3IENTU1Byb3BUd2VlbihzdHlsZSwgcCwgYm4sIGVuIC0gYm4sIHB0LCAwLCBwLCAoX2F1dG9Sb3VuZCAhPT0gZmFsc2UgJiYgKGVzZnggPT09IFwicHhcIiB8fCBwID09PSBcInpJbmRleFwiKSksIDAsIGJzLCBlcyk7XG5cdFx0XHRcdFx0XHRcdHB0LnhzMCA9IGVzZng7XG5cdFx0XHRcdFx0XHRcdC8vREVCVUc6IF9sb2coXCJ0d2VlbiBcIitwK1wiIGZyb20gXCIrcHQuYitcIiAoXCIrYm4rZXNmeCtcIikgdG8gXCIrcHQuZStcIiB3aXRoIHN1ZmZpeDogXCIrcHQueHMwKTtcblx0XHRcdFx0XHRcdH0gZWxzZSBpZiAoc3R5bGVbcF0gPT09IHVuZGVmaW5lZCB8fCAhZXMgJiYgKGVzICsgXCJcIiA9PT0gXCJOYU5cIiB8fCBlcyA9PSBudWxsKSkge1xuXHRcdFx0XHRcdFx0XHRfbG9nKFwiaW52YWxpZCBcIiArIHAgKyBcIiB0d2VlbiB2YWx1ZTogXCIgKyB2YXJzW3BdKTtcblx0XHRcdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0XHRcdHB0ID0gbmV3IENTU1Byb3BUd2VlbihzdHlsZSwgcCwgZW4gfHwgYm4gfHwgMCwgMCwgcHQsIC0xLCBwLCBmYWxzZSwgMCwgYnMsIGVzKTtcblx0XHRcdFx0XHRcdFx0cHQueHMwID0gKGVzID09PSBcIm5vbmVcIiAmJiAocCA9PT0gXCJkaXNwbGF5XCIgfHwgcC5pbmRleE9mKFwiU3R5bGVcIikgIT09IC0xKSkgPyBicyA6IGVzOyAvL2ludGVybWVkaWF0ZSB2YWx1ZSBzaG91bGQgdHlwaWNhbGx5IGJlIHNldCBpbW1lZGlhdGVseSAoZW5kIHZhbHVlKSBleGNlcHQgZm9yIFwiZGlzcGxheVwiIG9yIHRoaW5ncyBsaWtlIGJvcmRlclRvcFN0eWxlLCBib3JkZXJCb3R0b21TdHlsZSwgZXRjLiB3aGljaCBzaG91bGQgdXNlIHRoZSBiZWdpbm5pbmcgdmFsdWUgZHVyaW5nIHRoZSB0d2Vlbi5cblx0XHRcdFx0XHRcdFx0Ly9ERUJVRzogX2xvZyhcIm5vbi10d2VlbmluZyB2YWx1ZSBcIitwK1wiOiBcIitwdC54czApO1xuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXHRcdFx0XHRpZiAocGx1Z2luKSBpZiAocHQgJiYgIXB0LnBsdWdpbikge1xuXHRcdFx0XHRcdHB0LnBsdWdpbiA9IHBsdWdpbjtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdFx0cmV0dXJuIHB0O1xuXHRcdH07XG5cblxuXHRcdC8vZ2V0cyBjYWxsZWQgZXZlcnkgdGltZSB0aGUgdHdlZW4gdXBkYXRlcywgcGFzc2luZyB0aGUgbmV3IHJhdGlvICh0eXBpY2FsbHkgYSB2YWx1ZSBiZXR3ZWVuIDAgYW5kIDEsIGJ1dCBub3QgYWx3YXlzIChmb3IgZXhhbXBsZSwgaWYgYW4gRWxhc3RpYy5lYXNlT3V0IGlzIHVzZWQsIHRoZSB2YWx1ZSBjYW4ganVtcCBhYm92ZSAxIG1pZC10d2VlbikuIEl0IHdpbGwgYWx3YXlzIHN0YXJ0IGFuZCAwIGFuZCBlbmQgYXQgMS5cblx0XHRwLnNldFJhdGlvID0gZnVuY3Rpb24odikge1xuXHRcdFx0dmFyIHB0ID0gdGhpcy5fZmlyc3RQVCxcblx0XHRcdFx0bWluID0gMC4wMDAwMDEsXG5cdFx0XHRcdHZhbCwgc3RyLCBpO1xuXHRcdFx0Ly9hdCB0aGUgZW5kIG9mIHRoZSB0d2Vlbiwgd2Ugc2V0IHRoZSB2YWx1ZXMgdG8gZXhhY3RseSB3aGF0IHdlIHJlY2VpdmVkIGluIG9yZGVyIHRvIG1ha2Ugc3VyZSBub24tdHdlZW5pbmcgdmFsdWVzIChsaWtlIFwicG9zaXRpb25cIiBvciBcImZsb2F0XCIgb3Igd2hhdGV2ZXIpIGFyZSBzZXQgYW5kIHNvIHRoYXQgaWYgdGhlIGJlZ2lubmluZy9lbmRpbmcgc3VmZml4ZXMgKHVuaXRzKSBkaWRuJ3QgbWF0Y2ggYW5kIHdlIG5vcm1hbGl6ZWQgdG8gcHgsIHRoZSB2YWx1ZSB0aGF0IHRoZSB1c2VyIHBhc3NlZCBpbiBpcyB1c2VkIGhlcmUuIFdlIGNoZWNrIHRvIHNlZSBpZiB0aGUgdHdlZW4gaXMgYXQgaXRzIGJlZ2lubmluZyBpbiBjYXNlIGl0J3MgYSBmcm9tKCkgdHdlZW4gaW4gd2hpY2ggY2FzZSB0aGUgcmF0aW8gd2lsbCBhY3R1YWxseSBnbyBmcm9tIDEgdG8gMCBvdmVyIHRoZSBjb3Vyc2Ugb2YgdGhlIHR3ZWVuIChiYWNrd2FyZHMpLlxuXHRcdFx0aWYgKHYgPT09IDEgJiYgKHRoaXMuX3R3ZWVuLl90aW1lID09PSB0aGlzLl90d2Vlbi5fZHVyYXRpb24gfHwgdGhpcy5fdHdlZW4uX3RpbWUgPT09IDApKSB7XG5cdFx0XHRcdHdoaWxlIChwdCkge1xuXHRcdFx0XHRcdGlmIChwdC50eXBlICE9PSAyKSB7XG5cdFx0XHRcdFx0XHRpZiAocHQuciAmJiBwdC50eXBlICE9PSAtMSkge1xuXHRcdFx0XHRcdFx0XHR2YWwgPSBNYXRoLnJvdW5kKHB0LnMgKyBwdC5jKTtcblx0XHRcdFx0XHRcdFx0aWYgKCFwdC50eXBlKSB7XG5cdFx0XHRcdFx0XHRcdFx0cHQudFtwdC5wXSA9IHZhbCArIHB0LnhzMDtcblx0XHRcdFx0XHRcdFx0fSBlbHNlIGlmIChwdC50eXBlID09PSAxKSB7IC8vY29tcGxleCB2YWx1ZSAob25lIHRoYXQgdHlwaWNhbGx5IGhhcyBtdWx0aXBsZSBudW1iZXJzIGluc2lkZSBhIHN0cmluZywgbGlrZSBcInJlY3QoNXB4LDEwcHgsMjBweCwyNXB4KVwiXG5cdFx0XHRcdFx0XHRcdFx0aSA9IHB0Lmw7XG5cdFx0XHRcdFx0XHRcdFx0c3RyID0gcHQueHMwICsgdmFsICsgcHQueHMxO1xuXHRcdFx0XHRcdFx0XHRcdGZvciAoaSA9IDE7IGkgPCBwdC5sOyBpKyspIHtcblx0XHRcdFx0XHRcdFx0XHRcdHN0ciArPSBwdFtcInhuXCIraV0gKyBwdFtcInhzXCIrKGkrMSldO1xuXHRcdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdFx0XHRwdC50W3B0LnBdID0gc3RyO1xuXHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdFx0XHRwdC50W3B0LnBdID0gcHQuZTtcblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdFx0cHQuc2V0UmF0aW8odik7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdHB0ID0gcHQuX25leHQ7XG5cdFx0XHRcdH1cblxuXHRcdFx0fSBlbHNlIGlmICh2IHx8ICEodGhpcy5fdHdlZW4uX3RpbWUgPT09IHRoaXMuX3R3ZWVuLl9kdXJhdGlvbiB8fCB0aGlzLl90d2Vlbi5fdGltZSA9PT0gMCkgfHwgdGhpcy5fdHdlZW4uX3Jhd1ByZXZUaW1lID09PSAtMC4wMDAwMDEpIHtcblx0XHRcdFx0d2hpbGUgKHB0KSB7XG5cdFx0XHRcdFx0dmFsID0gcHQuYyAqIHYgKyBwdC5zO1xuXHRcdFx0XHRcdGlmIChwdC5yKSB7XG5cdFx0XHRcdFx0XHR2YWwgPSBNYXRoLnJvdW5kKHZhbCk7XG5cdFx0XHRcdFx0fSBlbHNlIGlmICh2YWwgPCBtaW4pIGlmICh2YWwgPiAtbWluKSB7XG5cdFx0XHRcdFx0XHR2YWwgPSAwO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHRpZiAoIXB0LnR5cGUpIHtcblx0XHRcdFx0XHRcdHB0LnRbcHQucF0gPSB2YWwgKyBwdC54czA7XG5cdFx0XHRcdFx0fSBlbHNlIGlmIChwdC50eXBlID09PSAxKSB7IC8vY29tcGxleCB2YWx1ZSAob25lIHRoYXQgdHlwaWNhbGx5IGhhcyBtdWx0aXBsZSBudW1iZXJzIGluc2lkZSBhIHN0cmluZywgbGlrZSBcInJlY3QoNXB4LDEwcHgsMjBweCwyNXB4KVwiXG5cdFx0XHRcdFx0XHRpID0gcHQubDtcblx0XHRcdFx0XHRcdGlmIChpID09PSAyKSB7XG5cdFx0XHRcdFx0XHRcdHB0LnRbcHQucF0gPSBwdC54czAgKyB2YWwgKyBwdC54czEgKyBwdC54bjEgKyBwdC54czI7XG5cdFx0XHRcdFx0XHR9IGVsc2UgaWYgKGkgPT09IDMpIHtcblx0XHRcdFx0XHRcdFx0cHQudFtwdC5wXSA9IHB0LnhzMCArIHZhbCArIHB0LnhzMSArIHB0LnhuMSArIHB0LnhzMiArIHB0LnhuMiArIHB0LnhzMztcblx0XHRcdFx0XHRcdH0gZWxzZSBpZiAoaSA9PT0gNCkge1xuXHRcdFx0XHRcdFx0XHRwdC50W3B0LnBdID0gcHQueHMwICsgdmFsICsgcHQueHMxICsgcHQueG4xICsgcHQueHMyICsgcHQueG4yICsgcHQueHMzICsgcHQueG4zICsgcHQueHM0O1xuXHRcdFx0XHRcdFx0fSBlbHNlIGlmIChpID09PSA1KSB7XG5cdFx0XHRcdFx0XHRcdHB0LnRbcHQucF0gPSBwdC54czAgKyB2YWwgKyBwdC54czEgKyBwdC54bjEgKyBwdC54czIgKyBwdC54bjIgKyBwdC54czMgKyBwdC54bjMgKyBwdC54czQgKyBwdC54bjQgKyBwdC54czU7XG5cdFx0XHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdFx0XHRzdHIgPSBwdC54czAgKyB2YWwgKyBwdC54czE7XG5cdFx0XHRcdFx0XHRcdGZvciAoaSA9IDE7IGkgPCBwdC5sOyBpKyspIHtcblx0XHRcdFx0XHRcdFx0XHRzdHIgKz0gcHRbXCJ4blwiK2ldICsgcHRbXCJ4c1wiKyhpKzEpXTtcblx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0XHRwdC50W3B0LnBdID0gc3RyO1xuXHRcdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0fSBlbHNlIGlmIChwdC50eXBlID09PSAtMSkgeyAvL25vbi10d2VlbmluZyB2YWx1ZVxuXHRcdFx0XHRcdFx0cHQudFtwdC5wXSA9IHB0LnhzMDtcblxuXHRcdFx0XHRcdH0gZWxzZSBpZiAocHQuc2V0UmF0aW8pIHsgLy9jdXN0b20gc2V0UmF0aW8oKSBmb3IgdGhpbmdzIGxpa2UgU3BlY2lhbFByb3BzLCBleHRlcm5hbCBwbHVnaW5zLCBldGMuXG5cdFx0XHRcdFx0XHRwdC5zZXRSYXRpbyh2KTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0cHQgPSBwdC5fbmV4dDtcblx0XHRcdFx0fVxuXG5cdFx0XHQvL2lmIHRoZSB0d2VlbiBpcyByZXZlcnNlZCBhbGwgdGhlIHdheSBiYWNrIHRvIHRoZSBiZWdpbm5pbmcsIHdlIG5lZWQgdG8gcmVzdG9yZSB0aGUgb3JpZ2luYWwgdmFsdWVzIHdoaWNoIG1heSBoYXZlIGRpZmZlcmVudCB1bml0cyAobGlrZSAlIGluc3RlYWQgb2YgcHggb3IgZW0gb3Igd2hhdGV2ZXIpLlxuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0d2hpbGUgKHB0KSB7XG5cdFx0XHRcdFx0aWYgKHB0LnR5cGUgIT09IDIpIHtcblx0XHRcdFx0XHRcdHB0LnRbcHQucF0gPSBwdC5iO1xuXHRcdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0XHRwdC5zZXRSYXRpbyh2KTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0cHQgPSBwdC5fbmV4dDtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH07XG5cblx0XHQvKipcblx0XHQgKiBAcHJpdmF0ZVxuXHRcdCAqIEZvcmNlcyByZW5kZXJpbmcgb2YgdGhlIHRhcmdldCdzIHRyYW5zZm9ybXMgKHJvdGF0aW9uLCBzY2FsZSwgZXRjLikgd2hlbmV2ZXIgdGhlIENTU1BsdWdpbidzIHNldFJhdGlvKCkgaXMgY2FsbGVkLlxuXHRcdCAqIEJhc2ljYWxseSwgdGhpcyB0ZWxscyB0aGUgQ1NTUGx1Z2luIHRvIGNyZWF0ZSBhIENTU1Byb3BUd2VlbiAodHlwZSAyKSBhZnRlciBpbnN0YW50aWF0aW9uIHRoYXQgcnVucyBsYXN0IGluIHRoZSBsaW5rZWRcblx0XHQgKiBsaXN0IGFuZCBjYWxscyB0aGUgYXBwcm9wcmlhdGUgKDNEIG9yIDJEKSByZW5kZXJpbmcgZnVuY3Rpb24uIFdlIHNlcGFyYXRlIHRoaXMgaW50byBpdHMgb3duIG1ldGhvZCBzbyB0aGF0IHdlIGNhbiBjYWxsXG5cdFx0ICogaXQgZnJvbSBvdGhlciBwbHVnaW5zIGxpa2UgQmV6aWVyUGx1Z2luIGlmLCBmb3IgZXhhbXBsZSwgaXQgbmVlZHMgdG8gYXBwbHkgYW4gYXV0b1JvdGF0aW9uIGFuZCB0aGlzIENTU1BsdWdpblxuXHRcdCAqIGRvZXNuJ3QgaGF2ZSBhbnkgdHJhbnNmb3JtLXJlbGF0ZWQgcHJvcGVydGllcyBvZiBpdHMgb3duLiBZb3UgY2FuIGNhbGwgdGhpcyBtZXRob2QgYXMgbWFueSB0aW1lcyBhcyB5b3Vcblx0XHQgKiB3YW50IGFuZCBpdCB3b24ndCBjcmVhdGUgZHVwbGljYXRlIENTU1Byb3BUd2VlbnMuXG5cdFx0ICpcblx0XHQgKiBAcGFyYW0ge2Jvb2xlYW59IHRocmVlRCBpZiB0cnVlLCBpdCBzaG91bGQgYXBwbHkgM0QgdHdlZW5zIChvdGhlcndpc2UsIGp1c3QgMkQgb25lcyBhcmUgZmluZSBhbmQgdHlwaWNhbGx5IGZhc3Rlcilcblx0XHQgKi9cblx0XHRwLl9lbmFibGVUcmFuc2Zvcm1zID0gZnVuY3Rpb24odGhyZWVEKSB7XG5cdFx0XHR0aGlzLl90cmFuc2Zvcm0gPSB0aGlzLl90cmFuc2Zvcm0gfHwgX2dldFRyYW5zZm9ybSh0aGlzLl90YXJnZXQsIF9jcywgdHJ1ZSk7IC8vZW5zdXJlcyB0aGF0IHRoZSBlbGVtZW50IGhhcyBhIF9nc1RyYW5zZm9ybSBwcm9wZXJ0eSB3aXRoIHRoZSBhcHByb3ByaWF0ZSB2YWx1ZXMuXG5cdFx0XHR0aGlzLl90cmFuc2Zvcm1UeXBlID0gKCEodGhpcy5fdHJhbnNmb3JtLnN2ZyAmJiBfdXNlU1ZHVHJhbnNmb3JtQXR0cikgJiYgKHRocmVlRCB8fCB0aGlzLl90cmFuc2Zvcm1UeXBlID09PSAzKSkgPyAzIDogMjtcblx0XHR9O1xuXG5cdFx0dmFyIGxhenlTZXQgPSBmdW5jdGlvbih2KSB7XG5cdFx0XHR0aGlzLnRbdGhpcy5wXSA9IHRoaXMuZTtcblx0XHRcdHRoaXMuZGF0YS5fbGlua0NTU1AodGhpcywgdGhpcy5fbmV4dCwgbnVsbCwgdHJ1ZSk7IC8vd2UgcHVycG9zZWZ1bGx5IGtlZXAgdGhpcy5fbmV4dCBldmVuIHRob3VnaCBpdCdkIG1ha2Ugc2Vuc2UgdG8gbnVsbCBpdCwgYnV0IHRoaXMgaXMgYSBwZXJmb3JtYW5jZSBvcHRpbWl6YXRpb24sIGFzIHRoaXMgaGFwcGVucyBkdXJpbmcgdGhlIHdoaWxlIChwdCkge30gbG9vcCBpbiBzZXRSYXRpbygpIGF0IHRoZSBib3R0b20gb2Ygd2hpY2ggaXQgc2V0cyBwdCA9IHB0Ll9uZXh0LCBzbyBpZiB3ZSBudWxsIGl0LCB0aGUgbGlua2VkIGxpc3Qgd2lsbCBiZSBicm9rZW4gaW4gdGhhdCBsb29wLlxuXHRcdH07XG5cdFx0LyoqIEBwcml2YXRlIEdpdmVzIHVzIGEgd2F5IHRvIHNldCBhIHZhbHVlIG9uIHRoZSBmaXJzdCByZW5kZXIgKGFuZCBvbmx5IHRoZSBmaXJzdCByZW5kZXIpLiAqKi9cblx0XHRwLl9hZGRMYXp5U2V0ID0gZnVuY3Rpb24odCwgcCwgdikge1xuXHRcdFx0dmFyIHB0ID0gdGhpcy5fZmlyc3RQVCA9IG5ldyBDU1NQcm9wVHdlZW4odCwgcCwgMCwgMCwgdGhpcy5fZmlyc3RQVCwgMik7XG5cdFx0XHRwdC5lID0gdjtcblx0XHRcdHB0LnNldFJhdGlvID0gbGF6eVNldDtcblx0XHRcdHB0LmRhdGEgPSB0aGlzO1xuXHRcdH07XG5cblx0XHQvKiogQHByaXZhdGUgKiovXG5cdFx0cC5fbGlua0NTU1AgPSBmdW5jdGlvbihwdCwgbmV4dCwgcHJldiwgcmVtb3ZlKSB7XG5cdFx0XHRpZiAocHQpIHtcblx0XHRcdFx0aWYgKG5leHQpIHtcblx0XHRcdFx0XHRuZXh0Ll9wcmV2ID0gcHQ7XG5cdFx0XHRcdH1cblx0XHRcdFx0aWYgKHB0Ll9uZXh0KSB7XG5cdFx0XHRcdFx0cHQuX25leHQuX3ByZXYgPSBwdC5fcHJldjtcblx0XHRcdFx0fVxuXHRcdFx0XHRpZiAocHQuX3ByZXYpIHtcblx0XHRcdFx0XHRwdC5fcHJldi5fbmV4dCA9IHB0Ll9uZXh0O1xuXHRcdFx0XHR9IGVsc2UgaWYgKHRoaXMuX2ZpcnN0UFQgPT09IHB0KSB7XG5cdFx0XHRcdFx0dGhpcy5fZmlyc3RQVCA9IHB0Ll9uZXh0O1xuXHRcdFx0XHRcdHJlbW92ZSA9IHRydWU7IC8vanVzdCB0byBwcmV2ZW50IHJlc2V0dGluZyB0aGlzLl9maXJzdFBUIDUgbGluZXMgZG93biBpbiBjYXNlIHB0Ll9uZXh0IGlzIG51bGwuIChvcHRpbWl6ZWQgZm9yIHNwZWVkKVxuXHRcdFx0XHR9XG5cdFx0XHRcdGlmIChwcmV2KSB7XG5cdFx0XHRcdFx0cHJldi5fbmV4dCA9IHB0O1xuXHRcdFx0XHR9IGVsc2UgaWYgKCFyZW1vdmUgJiYgdGhpcy5fZmlyc3RQVCA9PT0gbnVsbCkge1xuXHRcdFx0XHRcdHRoaXMuX2ZpcnN0UFQgPSBwdDtcblx0XHRcdFx0fVxuXHRcdFx0XHRwdC5fbmV4dCA9IG5leHQ7XG5cdFx0XHRcdHB0Ll9wcmV2ID0gcHJldjtcblx0XHRcdH1cblx0XHRcdHJldHVybiBwdDtcblx0XHR9O1xuXG5cdFx0Ly93ZSBuZWVkIHRvIG1ha2Ugc3VyZSB0aGF0IGlmIGFscGhhIG9yIGF1dG9BbHBoYSBpcyBraWxsZWQsIG9wYWNpdHkgaXMgdG9vLiBBbmQgYXV0b0FscGhhIGFmZmVjdHMgdGhlIFwidmlzaWJpbGl0eVwiIHByb3BlcnR5LlxuXHRcdHAuX2tpbGwgPSBmdW5jdGlvbihsb29rdXApIHtcblx0XHRcdHZhciBjb3B5ID0gbG9va3VwLFxuXHRcdFx0XHRwdCwgcCwgeGZpcnN0O1xuXHRcdFx0aWYgKGxvb2t1cC5hdXRvQWxwaGEgfHwgbG9va3VwLmFscGhhKSB7XG5cdFx0XHRcdGNvcHkgPSB7fTtcblx0XHRcdFx0Zm9yIChwIGluIGxvb2t1cCkgeyAvL2NvcHkgdGhlIGxvb2t1cCBzbyB0aGF0IHdlJ3JlIG5vdCBjaGFuZ2luZyB0aGUgb3JpZ2luYWwgd2hpY2ggbWF5IGJlIHBhc3NlZCBlbHNld2hlcmUuXG5cdFx0XHRcdFx0Y29weVtwXSA9IGxvb2t1cFtwXTtcblx0XHRcdFx0fVxuXHRcdFx0XHRjb3B5Lm9wYWNpdHkgPSAxO1xuXHRcdFx0XHRpZiAoY29weS5hdXRvQWxwaGEpIHtcblx0XHRcdFx0XHRjb3B5LnZpc2liaWxpdHkgPSAxO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0XHRpZiAobG9va3VwLmNsYXNzTmFtZSAmJiAocHQgPSB0aGlzLl9jbGFzc05hbWVQVCkpIHsgLy9mb3IgY2xhc3NOYW1lIHR3ZWVucywgd2UgbmVlZCB0byBraWxsIGFueSBhc3NvY2lhdGVkIENTU1Byb3BUd2VlbnMgdG9vOyBhIGxpbmtlZCBsaXN0IHN0YXJ0cyBhdCB0aGUgY2xhc3NOYW1lJ3MgXCJ4Zmlyc3RcIi5cblx0XHRcdFx0eGZpcnN0ID0gcHQueGZpcnN0O1xuXHRcdFx0XHRpZiAoeGZpcnN0ICYmIHhmaXJzdC5fcHJldikge1xuXHRcdFx0XHRcdHRoaXMuX2xpbmtDU1NQKHhmaXJzdC5fcHJldiwgcHQuX25leHQsIHhmaXJzdC5fcHJldi5fcHJldik7IC8vYnJlYWsgb2ZmIHRoZSBwcmV2XG5cdFx0XHRcdH0gZWxzZSBpZiAoeGZpcnN0ID09PSB0aGlzLl9maXJzdFBUKSB7XG5cdFx0XHRcdFx0dGhpcy5fZmlyc3RQVCA9IHB0Ll9uZXh0O1xuXHRcdFx0XHR9XG5cdFx0XHRcdGlmIChwdC5fbmV4dCkge1xuXHRcdFx0XHRcdHRoaXMuX2xpbmtDU1NQKHB0Ll9uZXh0LCBwdC5fbmV4dC5fbmV4dCwgeGZpcnN0Ll9wcmV2KTtcblx0XHRcdFx0fVxuXHRcdFx0XHR0aGlzLl9jbGFzc05hbWVQVCA9IG51bGw7XG5cdFx0XHR9XG5cdFx0XHRyZXR1cm4gVHdlZW5QbHVnaW4ucHJvdG90eXBlLl9raWxsLmNhbGwodGhpcywgY29weSk7XG5cdFx0fTtcblxuXG5cblx0XHQvL3VzZWQgYnkgY2FzY2FkZVRvKCkgZm9yIGdhdGhlcmluZyBhbGwgdGhlIHN0eWxlIHByb3BlcnRpZXMgb2YgZWFjaCBjaGlsZCBlbGVtZW50IGludG8gYW4gYXJyYXkgZm9yIGNvbXBhcmlzb24uXG5cdFx0dmFyIF9nZXRDaGlsZFN0eWxlcyA9IGZ1bmN0aW9uKGUsIHByb3BzLCB0YXJnZXRzKSB7XG5cdFx0XHRcdHZhciBjaGlsZHJlbiwgaSwgY2hpbGQsIHR5cGU7XG5cdFx0XHRcdGlmIChlLnNsaWNlKSB7XG5cdFx0XHRcdFx0aSA9IGUubGVuZ3RoO1xuXHRcdFx0XHRcdHdoaWxlICgtLWkgPiAtMSkge1xuXHRcdFx0XHRcdFx0X2dldENoaWxkU3R5bGVzKGVbaV0sIHByb3BzLCB0YXJnZXRzKTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0XHR9XG5cdFx0XHRcdGNoaWxkcmVuID0gZS5jaGlsZE5vZGVzO1xuXHRcdFx0XHRpID0gY2hpbGRyZW4ubGVuZ3RoO1xuXHRcdFx0XHR3aGlsZSAoLS1pID4gLTEpIHtcblx0XHRcdFx0XHRjaGlsZCA9IGNoaWxkcmVuW2ldO1xuXHRcdFx0XHRcdHR5cGUgPSBjaGlsZC50eXBlO1xuXHRcdFx0XHRcdGlmIChjaGlsZC5zdHlsZSkge1xuXHRcdFx0XHRcdFx0cHJvcHMucHVzaChfZ2V0QWxsU3R5bGVzKGNoaWxkKSk7XG5cdFx0XHRcdFx0XHRpZiAodGFyZ2V0cykge1xuXHRcdFx0XHRcdFx0XHR0YXJnZXRzLnB1c2goY2hpbGQpO1xuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHRpZiAoKHR5cGUgPT09IDEgfHwgdHlwZSA9PT0gOSB8fCB0eXBlID09PSAxMSkgJiYgY2hpbGQuY2hpbGROb2Rlcy5sZW5ndGgpIHtcblx0XHRcdFx0XHRcdF9nZXRDaGlsZFN0eWxlcyhjaGlsZCwgcHJvcHMsIHRhcmdldHMpO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXHRcdFx0fTtcblxuXHRcdC8qKlxuXHRcdCAqIFR5cGljYWxseSBvbmx5IHVzZWZ1bCBmb3IgY2xhc3NOYW1lIHR3ZWVucyB0aGF0IG1heSBhZmZlY3QgY2hpbGQgZWxlbWVudHMsIHRoaXMgbWV0aG9kIGNyZWF0ZXMgYSBUd2VlbkxpdGVcblx0XHQgKiBhbmQgdGhlbiBjb21wYXJlcyB0aGUgc3R5bGUgcHJvcGVydGllcyBvZiBhbGwgdGhlIHRhcmdldCdzIGNoaWxkIGVsZW1lbnRzIGF0IHRoZSB0d2VlbidzIHN0YXJ0IGFuZCBlbmQsIGFuZFxuXHRcdCAqIGlmIGFueSBhcmUgZGlmZmVyZW50LCBpdCBhbHNvIGNyZWF0ZXMgdHdlZW5zIGZvciB0aG9zZSBhbmQgcmV0dXJucyBhbiBhcnJheSBjb250YWluaW5nIEFMTCBvZiB0aGUgcmVzdWx0aW5nXG5cdFx0ICogdHdlZW5zIChzbyB0aGF0IHlvdSBjYW4gZWFzaWx5IGFkZCgpIHRoZW0gdG8gYSBUaW1lbGluZUxpdGUsIGZvciBleGFtcGxlKS4gVGhlIHJlYXNvbiB0aGlzIGZ1bmN0aW9uYWxpdHkgaXNcblx0XHQgKiB3cmFwcGVkIGludG8gYSBzZXBhcmF0ZSBzdGF0aWMgbWV0aG9kIG9mIENTU1BsdWdpbiBpbnN0ZWFkIG9mIGJlaW5nIGludGVncmF0ZWQgaW50byBhbGwgcmVndWxhciBjbGFzc05hbWUgdHdlZW5zXG5cdFx0ICogaXMgYmVjYXVzZSBpdCBjcmVhdGVzIGVudGlyZWx5IG5ldyB0d2VlbnMgdGhhdCBtYXkgaGF2ZSBjb21wbGV0ZWx5IGRpZmZlcmVudCB0YXJnZXRzIHRoYW4gdGhlIG9yaWdpbmFsIHR3ZWVuLFxuXHRcdCAqIHNvIGlmIHRoZXkgd2VyZSBhbGwgbHVtcGVkIGludG8gdGhlIG9yaWdpbmFsIHR3ZWVuIGluc3RhbmNlLCBpdCB3b3VsZCBiZSBpbmNvbnNpc3RlbnQgd2l0aCB0aGUgcmVzdCBvZiB0aGUgQVBJXG5cdFx0ICogYW5kIGl0IHdvdWxkIGNyZWF0ZSBvdGhlciBwcm9ibGVtcy4gRm9yIGV4YW1wbGU6XG5cdFx0ICogIC0gSWYgSSBjcmVhdGUgYSB0d2VlbiBvZiBlbGVtZW50QSwgdGhhdCB0d2VlbiBpbnN0YW5jZSBtYXkgc3VkZGVubHkgY2hhbmdlIGl0cyB0YXJnZXQgdG8gaW5jbHVkZSA1MCBvdGhlciBlbGVtZW50cyAodW5pbnR1aXRpdmUgaWYgSSBzcGVjaWZpY2FsbHkgZGVmaW5lZCB0aGUgdGFyZ2V0IEkgd2FudGVkKVxuXHRcdCAqICAtIFdlIGNhbid0IGp1c3QgY3JlYXRlIG5ldyBpbmRlcGVuZGVudCB0d2VlbnMgYmVjYXVzZSBvdGhlcndpc2UsIHdoYXQgaGFwcGVucyBpZiB0aGUgb3JpZ2luYWwvcGFyZW50IHR3ZWVuIGlzIHJldmVyc2VkIG9yIHBhdXNlIG9yIGRyb3BwZWQgaW50byBhIFRpbWVsaW5lTGl0ZSBmb3IgdGlnaHQgY29udHJvbD8gWW91J2QgZXhwZWN0IHRoYXQgdHdlZW4ncyBiZWhhdmlvciB0byBhZmZlY3QgYWxsIHRoZSBvdGhlcnMuXG5cdFx0ICogIC0gQW5hbHl6aW5nIGV2ZXJ5IHN0eWxlIHByb3BlcnR5IG9mIGV2ZXJ5IGNoaWxkIGJlZm9yZSBhbmQgYWZ0ZXIgdGhlIHR3ZWVuIGlzIGFuIGV4cGVuc2l2ZSBvcGVyYXRpb24gd2hlbiB0aGVyZSBhcmUgbWFueSBjaGlsZHJlbiwgc28gdGhpcyBiZWhhdmlvciBzaG91bGRuJ3QgYmUgaW1wb3NlZCBvbiBhbGwgY2xhc3NOYW1lIHR3ZWVucyBieSBkZWZhdWx0LCBlc3BlY2lhbGx5IHNpbmNlIGl0J3MgcHJvYmFibHkgcmFyZSB0aGF0IHRoaXMgZXh0cmEgZnVuY3Rpb25hbGl0eSBpcyBuZWVkZWQuXG5cdFx0ICpcblx0XHQgKiBAcGFyYW0ge09iamVjdH0gdGFyZ2V0IG9iamVjdCB0byBiZSB0d2VlbmVkXG5cdFx0ICogQHBhcmFtIHtudW1iZXJ9IER1cmF0aW9uIGluIHNlY29uZHMgKG9yIGZyYW1lcyBmb3IgZnJhbWVzLWJhc2VkIHR3ZWVucylcblx0XHQgKiBAcGFyYW0ge09iamVjdH0gT2JqZWN0IGNvbnRhaW5pbmcgdGhlIGVuZCB2YWx1ZXMsIGxpa2Uge2NsYXNzTmFtZTpcIm5ld0NsYXNzXCIsIGVhc2U6TGluZWFyLmVhc2VOb25lfVxuXHRcdCAqIEByZXR1cm4ge0FycmF5fSBBbiBhcnJheSBvZiBUd2VlbkxpdGUgaW5zdGFuY2VzXG5cdFx0ICovXG5cdFx0Q1NTUGx1Z2luLmNhc2NhZGVUbyA9IGZ1bmN0aW9uKHRhcmdldCwgZHVyYXRpb24sIHZhcnMpIHtcblx0XHRcdHZhciB0d2VlbiA9IFR3ZWVuTGl0ZS50byh0YXJnZXQsIGR1cmF0aW9uLCB2YXJzKSxcblx0XHRcdFx0cmVzdWx0cyA9IFt0d2Vlbl0sXG5cdFx0XHRcdGIgPSBbXSxcblx0XHRcdFx0ZSA9IFtdLFxuXHRcdFx0XHR0YXJnZXRzID0gW10sXG5cdFx0XHRcdF9yZXNlcnZlZFByb3BzID0gVHdlZW5MaXRlLl9pbnRlcm5hbHMucmVzZXJ2ZWRQcm9wcyxcblx0XHRcdFx0aSwgZGlmcywgcCwgZnJvbTtcblx0XHRcdHRhcmdldCA9IHR3ZWVuLl90YXJnZXRzIHx8IHR3ZWVuLnRhcmdldDtcblx0XHRcdF9nZXRDaGlsZFN0eWxlcyh0YXJnZXQsIGIsIHRhcmdldHMpO1xuXHRcdFx0dHdlZW4ucmVuZGVyKGR1cmF0aW9uLCB0cnVlLCB0cnVlKTtcblx0XHRcdF9nZXRDaGlsZFN0eWxlcyh0YXJnZXQsIGUpO1xuXHRcdFx0dHdlZW4ucmVuZGVyKDAsIHRydWUsIHRydWUpO1xuXHRcdFx0dHdlZW4uX2VuYWJsZWQodHJ1ZSk7XG5cdFx0XHRpID0gdGFyZ2V0cy5sZW5ndGg7XG5cdFx0XHR3aGlsZSAoLS1pID4gLTEpIHtcblx0XHRcdFx0ZGlmcyA9IF9jc3NEaWYodGFyZ2V0c1tpXSwgYltpXSwgZVtpXSk7XG5cdFx0XHRcdGlmIChkaWZzLmZpcnN0TVBUKSB7XG5cdFx0XHRcdFx0ZGlmcyA9IGRpZnMuZGlmcztcblx0XHRcdFx0XHRmb3IgKHAgaW4gdmFycykge1xuXHRcdFx0XHRcdFx0aWYgKF9yZXNlcnZlZFByb3BzW3BdKSB7XG5cdFx0XHRcdFx0XHRcdGRpZnNbcF0gPSB2YXJzW3BdO1xuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHRmcm9tID0ge307XG5cdFx0XHRcdFx0Zm9yIChwIGluIGRpZnMpIHtcblx0XHRcdFx0XHRcdGZyb21bcF0gPSBiW2ldW3BdO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHRyZXN1bHRzLnB1c2goVHdlZW5MaXRlLmZyb21Ubyh0YXJnZXRzW2ldLCBkdXJhdGlvbiwgZnJvbSwgZGlmcykpO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0XHRyZXR1cm4gcmVzdWx0cztcblx0XHR9O1xuXG5cdFx0VHdlZW5QbHVnaW4uYWN0aXZhdGUoW0NTU1BsdWdpbl0pO1xuXHRcdHJldHVybiBDU1NQbHVnaW47XG5cblx0fSwgdHJ1ZSk7XG5cblx0XG5cdFxuXHRcblx0XG5cdFxuXHRcblx0XG5cdFxuXHRcblx0XG4vKlxuICogLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICogUm91bmRQcm9wc1BsdWdpblxuICogLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICovXG5cdChmdW5jdGlvbigpIHtcblxuXHRcdHZhciBSb3VuZFByb3BzUGx1Z2luID0gX2dzU2NvcGUuX2dzRGVmaW5lLnBsdWdpbih7XG5cdFx0XHRcdHByb3BOYW1lOiBcInJvdW5kUHJvcHNcIixcblx0XHRcdFx0dmVyc2lvbjogXCIxLjVcIixcblx0XHRcdFx0cHJpb3JpdHk6IC0xLFxuXHRcdFx0XHRBUEk6IDIsXG5cblx0XHRcdFx0Ly9jYWxsZWQgd2hlbiB0aGUgdHdlZW4gcmVuZGVycyBmb3IgdGhlIGZpcnN0IHRpbWUuIFRoaXMgaXMgd2hlcmUgaW5pdGlhbCB2YWx1ZXMgc2hvdWxkIGJlIHJlY29yZGVkIGFuZCBhbnkgc2V0dXAgcm91dGluZXMgc2hvdWxkIHJ1bi5cblx0XHRcdFx0aW5pdDogZnVuY3Rpb24odGFyZ2V0LCB2YWx1ZSwgdHdlZW4pIHtcblx0XHRcdFx0XHR0aGlzLl90d2VlbiA9IHR3ZWVuO1xuXHRcdFx0XHRcdHJldHVybiB0cnVlO1xuXHRcdFx0XHR9XG5cblx0XHRcdH0pLFxuXHRcdFx0X3JvdW5kTGlua2VkTGlzdCA9IGZ1bmN0aW9uKG5vZGUpIHtcblx0XHRcdFx0d2hpbGUgKG5vZGUpIHtcblx0XHRcdFx0XHRpZiAoIW5vZGUuZiAmJiAhbm9kZS5ibG9iKSB7XG5cdFx0XHRcdFx0XHRub2RlLnIgPSAxO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHRub2RlID0gbm9kZS5fbmV4dDtcblx0XHRcdFx0fVxuXHRcdFx0fSxcblx0XHRcdHAgPSBSb3VuZFByb3BzUGx1Z2luLnByb3RvdHlwZTtcblxuXHRcdHAuX29uSW5pdEFsbFByb3BzID0gZnVuY3Rpb24oKSB7XG5cdFx0XHR2YXIgdHdlZW4gPSB0aGlzLl90d2Vlbixcblx0XHRcdFx0cnAgPSAodHdlZW4udmFycy5yb3VuZFByb3BzLmpvaW4pID8gdHdlZW4udmFycy5yb3VuZFByb3BzIDogdHdlZW4udmFycy5yb3VuZFByb3BzLnNwbGl0KFwiLFwiKSxcblx0XHRcdFx0aSA9IHJwLmxlbmd0aCxcblx0XHRcdFx0bG9va3VwID0ge30sXG5cdFx0XHRcdHJwdCA9IHR3ZWVuLl9wcm9wTG9va3VwLnJvdW5kUHJvcHMsXG5cdFx0XHRcdHByb3AsIHB0LCBuZXh0O1xuXHRcdFx0d2hpbGUgKC0taSA+IC0xKSB7XG5cdFx0XHRcdGxvb2t1cFtycFtpXV0gPSAxO1xuXHRcdFx0fVxuXHRcdFx0aSA9IHJwLmxlbmd0aDtcblx0XHRcdHdoaWxlICgtLWkgPiAtMSkge1xuXHRcdFx0XHRwcm9wID0gcnBbaV07XG5cdFx0XHRcdHB0ID0gdHdlZW4uX2ZpcnN0UFQ7XG5cdFx0XHRcdHdoaWxlIChwdCkge1xuXHRcdFx0XHRcdG5leHQgPSBwdC5fbmV4dDsgLy9yZWNvcmQgaGVyZSwgYmVjYXVzZSBpdCBtYXkgZ2V0IHJlbW92ZWRcblx0XHRcdFx0XHRpZiAocHQucGcpIHtcblx0XHRcdFx0XHRcdHB0LnQuX3JvdW5kUHJvcHMobG9va3VwLCB0cnVlKTtcblx0XHRcdFx0XHR9IGVsc2UgaWYgKHB0Lm4gPT09IHByb3ApIHtcblx0XHRcdFx0XHRcdGlmIChwdC5mID09PSAyICYmIHB0LnQpIHsgLy9hIGJsb2IgKHRleHQgY29udGFpbmluZyBtdWx0aXBsZSBudW1lcmljIHZhbHVlcylcblx0XHRcdFx0XHRcdFx0X3JvdW5kTGlua2VkTGlzdChwdC50Ll9maXJzdFBUKTtcblx0XHRcdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0XHRcdHRoaXMuX2FkZChwdC50LCBwcm9wLCBwdC5zLCBwdC5jKTtcblx0XHRcdFx0XHRcdFx0Ly9yZW1vdmUgZnJvbSBsaW5rZWQgbGlzdFxuXHRcdFx0XHRcdFx0XHRpZiAobmV4dCkge1xuXHRcdFx0XHRcdFx0XHRcdG5leHQuX3ByZXYgPSBwdC5fcHJldjtcblx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0XHRpZiAocHQuX3ByZXYpIHtcblx0XHRcdFx0XHRcdFx0XHRwdC5fcHJldi5fbmV4dCA9IG5leHQ7XG5cdFx0XHRcdFx0XHRcdH0gZWxzZSBpZiAodHdlZW4uX2ZpcnN0UFQgPT09IHB0KSB7XG5cdFx0XHRcdFx0XHRcdFx0dHdlZW4uX2ZpcnN0UFQgPSBuZXh0O1xuXHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRcdHB0Ll9uZXh0ID0gcHQuX3ByZXYgPSBudWxsO1xuXHRcdFx0XHRcdFx0XHR0d2Vlbi5fcHJvcExvb2t1cFtwcm9wXSA9IHJwdDtcblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0cHQgPSBuZXh0O1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0XHRyZXR1cm4gZmFsc2U7XG5cdFx0fTtcblxuXHRcdHAuX2FkZCA9IGZ1bmN0aW9uKHRhcmdldCwgcCwgcywgYykge1xuXHRcdFx0dGhpcy5fYWRkVHdlZW4odGFyZ2V0LCBwLCBzLCBzICsgYywgcCwgdHJ1ZSk7XG5cdFx0XHR0aGlzLl9vdmVyd3JpdGVQcm9wcy5wdXNoKHApO1xuXHRcdH07XG5cblx0fSgpKTtcblxuXG5cblxuXG5cblxuXG5cblxuLypcbiAqIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAqIEF0dHJQbHVnaW5cbiAqIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAqL1xuXG5cdChmdW5jdGlvbigpIHtcblxuXHRcdF9nc1Njb3BlLl9nc0RlZmluZS5wbHVnaW4oe1xuXHRcdFx0cHJvcE5hbWU6IFwiYXR0clwiLFxuXHRcdFx0QVBJOiAyLFxuXHRcdFx0dmVyc2lvbjogXCIwLjUuMFwiLFxuXG5cdFx0XHQvL2NhbGxlZCB3aGVuIHRoZSB0d2VlbiByZW5kZXJzIGZvciB0aGUgZmlyc3QgdGltZS4gVGhpcyBpcyB3aGVyZSBpbml0aWFsIHZhbHVlcyBzaG91bGQgYmUgcmVjb3JkZWQgYW5kIGFueSBzZXR1cCByb3V0aW5lcyBzaG91bGQgcnVuLlxuXHRcdFx0aW5pdDogZnVuY3Rpb24odGFyZ2V0LCB2YWx1ZSwgdHdlZW4pIHtcblx0XHRcdFx0dmFyIHA7XG5cdFx0XHRcdGlmICh0eXBlb2YodGFyZ2V0LnNldEF0dHJpYnV0ZSkgIT09IFwiZnVuY3Rpb25cIikge1xuXHRcdFx0XHRcdHJldHVybiBmYWxzZTtcblx0XHRcdFx0fVxuXHRcdFx0XHRmb3IgKHAgaW4gdmFsdWUpIHtcblx0XHRcdFx0XHR0aGlzLl9hZGRUd2Vlbih0YXJnZXQsIFwic2V0QXR0cmlidXRlXCIsIHRhcmdldC5nZXRBdHRyaWJ1dGUocCkgKyBcIlwiLCB2YWx1ZVtwXSArIFwiXCIsIHAsIGZhbHNlLCBwKTtcblx0XHRcdFx0XHR0aGlzLl9vdmVyd3JpdGVQcm9wcy5wdXNoKHApO1xuXHRcdFx0XHR9XG5cdFx0XHRcdHJldHVybiB0cnVlO1xuXHRcdFx0fVxuXG5cdFx0fSk7XG5cblx0fSgpKTtcblxuXG5cblxuXG5cblxuXG5cblxuLypcbiAqIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAqIERpcmVjdGlvbmFsUm90YXRpb25QbHVnaW5cbiAqIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAqL1xuXHRfZ3NTY29wZS5fZ3NEZWZpbmUucGx1Z2luKHtcblx0XHRwcm9wTmFtZTogXCJkaXJlY3Rpb25hbFJvdGF0aW9uXCIsXG5cdFx0dmVyc2lvbjogXCIwLjIuMVwiLFxuXHRcdEFQSTogMixcblxuXHRcdC8vY2FsbGVkIHdoZW4gdGhlIHR3ZWVuIHJlbmRlcnMgZm9yIHRoZSBmaXJzdCB0aW1lLiBUaGlzIGlzIHdoZXJlIGluaXRpYWwgdmFsdWVzIHNob3VsZCBiZSByZWNvcmRlZCBhbmQgYW55IHNldHVwIHJvdXRpbmVzIHNob3VsZCBydW4uXG5cdFx0aW5pdDogZnVuY3Rpb24odGFyZ2V0LCB2YWx1ZSwgdHdlZW4pIHtcblx0XHRcdGlmICh0eXBlb2YodmFsdWUpICE9PSBcIm9iamVjdFwiKSB7XG5cdFx0XHRcdHZhbHVlID0ge3JvdGF0aW9uOnZhbHVlfTtcblx0XHRcdH1cblx0XHRcdHRoaXMuZmluYWxzID0ge307XG5cdFx0XHR2YXIgY2FwID0gKHZhbHVlLnVzZVJhZGlhbnMgPT09IHRydWUpID8gTWF0aC5QSSAqIDIgOiAzNjAsXG5cdFx0XHRcdG1pbiA9IDAuMDAwMDAxLFxuXHRcdFx0XHRwLCB2LCBzdGFydCwgZW5kLCBkaWYsIHNwbGl0O1xuXHRcdFx0Zm9yIChwIGluIHZhbHVlKSB7XG5cdFx0XHRcdGlmIChwICE9PSBcInVzZVJhZGlhbnNcIikge1xuXHRcdFx0XHRcdHNwbGl0ID0gKHZhbHVlW3BdICsgXCJcIikuc3BsaXQoXCJfXCIpO1xuXHRcdFx0XHRcdHYgPSBzcGxpdFswXTtcblx0XHRcdFx0XHRzdGFydCA9IHBhcnNlRmxvYXQoICh0eXBlb2YodGFyZ2V0W3BdKSAhPT0gXCJmdW5jdGlvblwiKSA/IHRhcmdldFtwXSA6IHRhcmdldFsgKChwLmluZGV4T2YoXCJzZXRcIikgfHwgdHlwZW9mKHRhcmdldFtcImdldFwiICsgcC5zdWJzdHIoMyldKSAhPT0gXCJmdW5jdGlvblwiKSA/IHAgOiBcImdldFwiICsgcC5zdWJzdHIoMykpIF0oKSApO1xuXHRcdFx0XHRcdGVuZCA9IHRoaXMuZmluYWxzW3BdID0gKHR5cGVvZih2KSA9PT0gXCJzdHJpbmdcIiAmJiB2LmNoYXJBdCgxKSA9PT0gXCI9XCIpID8gc3RhcnQgKyBwYXJzZUludCh2LmNoYXJBdCgwKSArIFwiMVwiLCAxMCkgKiBOdW1iZXIodi5zdWJzdHIoMikpIDogTnVtYmVyKHYpIHx8IDA7XG5cdFx0XHRcdFx0ZGlmID0gZW5kIC0gc3RhcnQ7XG5cdFx0XHRcdFx0aWYgKHNwbGl0Lmxlbmd0aCkge1xuXHRcdFx0XHRcdFx0diA9IHNwbGl0LmpvaW4oXCJfXCIpO1xuXHRcdFx0XHRcdFx0aWYgKHYuaW5kZXhPZihcInNob3J0XCIpICE9PSAtMSkge1xuXHRcdFx0XHRcdFx0XHRkaWYgPSBkaWYgJSBjYXA7XG5cdFx0XHRcdFx0XHRcdGlmIChkaWYgIT09IGRpZiAlIChjYXAgLyAyKSkge1xuXHRcdFx0XHRcdFx0XHRcdGRpZiA9IChkaWYgPCAwKSA/IGRpZiArIGNhcCA6IGRpZiAtIGNhcDtcblx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0aWYgKHYuaW5kZXhPZihcIl9jd1wiKSAhPT0gLTEgJiYgZGlmIDwgMCkge1xuXHRcdFx0XHRcdFx0XHRkaWYgPSAoKGRpZiArIGNhcCAqIDk5OTk5OTk5OTkpICUgY2FwKSAtICgoZGlmIC8gY2FwKSB8IDApICogY2FwO1xuXHRcdFx0XHRcdFx0fSBlbHNlIGlmICh2LmluZGV4T2YoXCJjY3dcIikgIT09IC0xICYmIGRpZiA+IDApIHtcblx0XHRcdFx0XHRcdFx0ZGlmID0gKChkaWYgLSBjYXAgKiA5OTk5OTk5OTk5KSAlIGNhcCkgLSAoKGRpZiAvIGNhcCkgfCAwKSAqIGNhcDtcblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0aWYgKGRpZiA+IG1pbiB8fCBkaWYgPCAtbWluKSB7XG5cdFx0XHRcdFx0XHR0aGlzLl9hZGRUd2Vlbih0YXJnZXQsIHAsIHN0YXJ0LCBzdGFydCArIGRpZiwgcCk7XG5cdFx0XHRcdFx0XHR0aGlzLl9vdmVyd3JpdGVQcm9wcy5wdXNoKHApO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdFx0cmV0dXJuIHRydWU7XG5cdFx0fSxcblxuXHRcdC8vY2FsbGVkIGVhY2ggdGltZSB0aGUgdmFsdWVzIHNob3VsZCBiZSB1cGRhdGVkLCBhbmQgdGhlIHJhdGlvIGdldHMgcGFzc2VkIGFzIHRoZSBvbmx5IHBhcmFtZXRlciAodHlwaWNhbGx5IGl0J3MgYSB2YWx1ZSBiZXR3ZWVuIDAgYW5kIDEsIGJ1dCBpdCBjYW4gZXhjZWVkIHRob3NlIHdoZW4gdXNpbmcgYW4gZWFzZSBsaWtlIEVsYXN0aWMuZWFzZU91dCBvciBCYWNrLmVhc2VPdXQsIGV0Yy4pXG5cdFx0c2V0OiBmdW5jdGlvbihyYXRpbykge1xuXHRcdFx0dmFyIHB0O1xuXHRcdFx0aWYgKHJhdGlvICE9PSAxKSB7XG5cdFx0XHRcdHRoaXMuX3N1cGVyLnNldFJhdGlvLmNhbGwodGhpcywgcmF0aW8pO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0cHQgPSB0aGlzLl9maXJzdFBUO1xuXHRcdFx0XHR3aGlsZSAocHQpIHtcblx0XHRcdFx0XHRpZiAocHQuZikge1xuXHRcdFx0XHRcdFx0cHQudFtwdC5wXSh0aGlzLmZpbmFsc1twdC5wXSk7XG5cdFx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRcdHB0LnRbcHQucF0gPSB0aGlzLmZpbmFsc1twdC5wXTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0cHQgPSBwdC5fbmV4dDtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH1cblxuXHR9KS5fYXV0b0NTUyA9IHRydWU7XG5cblxuXG5cblxuXG5cblx0XG5cdFxuXHRcblx0XG4vKlxuICogLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICogRWFzZVBhY2tcbiAqIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAqL1xuXHRfZ3NTY29wZS5fZ3NEZWZpbmUoXCJlYXNpbmcuQmFja1wiLCBbXCJlYXNpbmcuRWFzZVwiXSwgZnVuY3Rpb24oRWFzZSkge1xuXHRcdFxuXHRcdHZhciB3ID0gKF9nc1Njb3BlLkdyZWVuU29ja0dsb2JhbHMgfHwgX2dzU2NvcGUpLFxuXHRcdFx0Z3MgPSB3LmNvbS5ncmVlbnNvY2ssXG5cdFx0XHRfMlBJID0gTWF0aC5QSSAqIDIsXG5cdFx0XHRfSEFMRl9QSSA9IE1hdGguUEkgLyAyLFxuXHRcdFx0X2NsYXNzID0gZ3MuX2NsYXNzLFxuXHRcdFx0X2NyZWF0ZSA9IGZ1bmN0aW9uKG4sIGYpIHtcblx0XHRcdFx0dmFyIEMgPSBfY2xhc3MoXCJlYXNpbmcuXCIgKyBuLCBmdW5jdGlvbigpe30sIHRydWUpLFxuXHRcdFx0XHRcdHAgPSBDLnByb3RvdHlwZSA9IG5ldyBFYXNlKCk7XG5cdFx0XHRcdHAuY29uc3RydWN0b3IgPSBDO1xuXHRcdFx0XHRwLmdldFJhdGlvID0gZjtcblx0XHRcdFx0cmV0dXJuIEM7XG5cdFx0XHR9LFxuXHRcdFx0X2Vhc2VSZWcgPSBFYXNlLnJlZ2lzdGVyIHx8IGZ1bmN0aW9uKCl7fSwgLy9wdXQgYW4gZW1wdHkgZnVuY3Rpb24gaW4gcGxhY2UganVzdCBhcyBhIHNhZmV0eSBtZWFzdXJlIGluIGNhc2Ugc29tZW9uZSBsb2FkcyBhbiBPTEQgdmVyc2lvbiBvZiBUd2VlbkxpdGUuanMgd2hlcmUgRWFzZS5yZWdpc3RlciBkb2Vzbid0IGV4aXN0LlxuXHRcdFx0X3dyYXAgPSBmdW5jdGlvbihuYW1lLCBFYXNlT3V0LCBFYXNlSW4sIEVhc2VJbk91dCwgYWxpYXNlcykge1xuXHRcdFx0XHR2YXIgQyA9IF9jbGFzcyhcImVhc2luZy5cIituYW1lLCB7XG5cdFx0XHRcdFx0ZWFzZU91dDpuZXcgRWFzZU91dCgpLFxuXHRcdFx0XHRcdGVhc2VJbjpuZXcgRWFzZUluKCksXG5cdFx0XHRcdFx0ZWFzZUluT3V0Om5ldyBFYXNlSW5PdXQoKVxuXHRcdFx0XHR9LCB0cnVlKTtcblx0XHRcdFx0X2Vhc2VSZWcoQywgbmFtZSk7XG5cdFx0XHRcdHJldHVybiBDO1xuXHRcdFx0fSxcblx0XHRcdEVhc2VQb2ludCA9IGZ1bmN0aW9uKHRpbWUsIHZhbHVlLCBuZXh0KSB7XG5cdFx0XHRcdHRoaXMudCA9IHRpbWU7XG5cdFx0XHRcdHRoaXMudiA9IHZhbHVlO1xuXHRcdFx0XHRpZiAobmV4dCkge1xuXHRcdFx0XHRcdHRoaXMubmV4dCA9IG5leHQ7XG5cdFx0XHRcdFx0bmV4dC5wcmV2ID0gdGhpcztcblx0XHRcdFx0XHR0aGlzLmMgPSBuZXh0LnYgLSB2YWx1ZTtcblx0XHRcdFx0XHR0aGlzLmdhcCA9IG5leHQudCAtIHRpbWU7XG5cdFx0XHRcdH1cblx0XHRcdH0sXG5cblx0XHRcdC8vQmFja1xuXHRcdFx0X2NyZWF0ZUJhY2sgPSBmdW5jdGlvbihuLCBmKSB7XG5cdFx0XHRcdHZhciBDID0gX2NsYXNzKFwiZWFzaW5nLlwiICsgbiwgZnVuY3Rpb24ob3ZlcnNob290KSB7XG5cdFx0XHRcdFx0XHR0aGlzLl9wMSA9IChvdmVyc2hvb3QgfHwgb3ZlcnNob290ID09PSAwKSA/IG92ZXJzaG9vdCA6IDEuNzAxNTg7XG5cdFx0XHRcdFx0XHR0aGlzLl9wMiA9IHRoaXMuX3AxICogMS41MjU7XG5cdFx0XHRcdFx0fSwgdHJ1ZSksXG5cdFx0XHRcdFx0cCA9IEMucHJvdG90eXBlID0gbmV3IEVhc2UoKTtcblx0XHRcdFx0cC5jb25zdHJ1Y3RvciA9IEM7XG5cdFx0XHRcdHAuZ2V0UmF0aW8gPSBmO1xuXHRcdFx0XHRwLmNvbmZpZyA9IGZ1bmN0aW9uKG92ZXJzaG9vdCkge1xuXHRcdFx0XHRcdHJldHVybiBuZXcgQyhvdmVyc2hvb3QpO1xuXHRcdFx0XHR9O1xuXHRcdFx0XHRyZXR1cm4gQztcblx0XHRcdH0sXG5cblx0XHRcdEJhY2sgPSBfd3JhcChcIkJhY2tcIixcblx0XHRcdFx0X2NyZWF0ZUJhY2soXCJCYWNrT3V0XCIsIGZ1bmN0aW9uKHApIHtcblx0XHRcdFx0XHRyZXR1cm4gKChwID0gcCAtIDEpICogcCAqICgodGhpcy5fcDEgKyAxKSAqIHAgKyB0aGlzLl9wMSkgKyAxKTtcblx0XHRcdFx0fSksXG5cdFx0XHRcdF9jcmVhdGVCYWNrKFwiQmFja0luXCIsIGZ1bmN0aW9uKHApIHtcblx0XHRcdFx0XHRyZXR1cm4gcCAqIHAgKiAoKHRoaXMuX3AxICsgMSkgKiBwIC0gdGhpcy5fcDEpO1xuXHRcdFx0XHR9KSxcblx0XHRcdFx0X2NyZWF0ZUJhY2soXCJCYWNrSW5PdXRcIiwgZnVuY3Rpb24ocCkge1xuXHRcdFx0XHRcdHJldHVybiAoKHAgKj0gMikgPCAxKSA/IDAuNSAqIHAgKiBwICogKCh0aGlzLl9wMiArIDEpICogcCAtIHRoaXMuX3AyKSA6IDAuNSAqICgocCAtPSAyKSAqIHAgKiAoKHRoaXMuX3AyICsgMSkgKiBwICsgdGhpcy5fcDIpICsgMik7XG5cdFx0XHRcdH0pXG5cdFx0XHQpLFxuXG5cblx0XHRcdC8vU2xvd01vXG5cdFx0XHRTbG93TW8gPSBfY2xhc3MoXCJlYXNpbmcuU2xvd01vXCIsIGZ1bmN0aW9uKGxpbmVhclJhdGlvLCBwb3dlciwgeW95b01vZGUpIHtcblx0XHRcdFx0cG93ZXIgPSAocG93ZXIgfHwgcG93ZXIgPT09IDApID8gcG93ZXIgOiAwLjc7XG5cdFx0XHRcdGlmIChsaW5lYXJSYXRpbyA9PSBudWxsKSB7XG5cdFx0XHRcdFx0bGluZWFyUmF0aW8gPSAwLjc7XG5cdFx0XHRcdH0gZWxzZSBpZiAobGluZWFyUmF0aW8gPiAxKSB7XG5cdFx0XHRcdFx0bGluZWFyUmF0aW8gPSAxO1xuXHRcdFx0XHR9XG5cdFx0XHRcdHRoaXMuX3AgPSAobGluZWFyUmF0aW8gIT09IDEpID8gcG93ZXIgOiAwO1xuXHRcdFx0XHR0aGlzLl9wMSA9ICgxIC0gbGluZWFyUmF0aW8pIC8gMjtcblx0XHRcdFx0dGhpcy5fcDIgPSBsaW5lYXJSYXRpbztcblx0XHRcdFx0dGhpcy5fcDMgPSB0aGlzLl9wMSArIHRoaXMuX3AyO1xuXHRcdFx0XHR0aGlzLl9jYWxjRW5kID0gKHlveW9Nb2RlID09PSB0cnVlKTtcblx0XHRcdH0sIHRydWUpLFxuXHRcdFx0cCA9IFNsb3dNby5wcm90b3R5cGUgPSBuZXcgRWFzZSgpLFxuXHRcdFx0U3RlcHBlZEVhc2UsIFJvdWdoRWFzZSwgX2NyZWF0ZUVsYXN0aWM7XG5cblx0XHRwLmNvbnN0cnVjdG9yID0gU2xvd01vO1xuXHRcdHAuZ2V0UmF0aW8gPSBmdW5jdGlvbihwKSB7XG5cdFx0XHR2YXIgciA9IHAgKyAoMC41IC0gcCkgKiB0aGlzLl9wO1xuXHRcdFx0aWYgKHAgPCB0aGlzLl9wMSkge1xuXHRcdFx0XHRyZXR1cm4gdGhpcy5fY2FsY0VuZCA/IDEgLSAoKHAgPSAxIC0gKHAgLyB0aGlzLl9wMSkpICogcCkgOiByIC0gKChwID0gMSAtIChwIC8gdGhpcy5fcDEpKSAqIHAgKiBwICogcCAqIHIpO1xuXHRcdFx0fSBlbHNlIGlmIChwID4gdGhpcy5fcDMpIHtcblx0XHRcdFx0cmV0dXJuIHRoaXMuX2NhbGNFbmQgPyAxIC0gKHAgPSAocCAtIHRoaXMuX3AzKSAvIHRoaXMuX3AxKSAqIHAgOiByICsgKChwIC0gcikgKiAocCA9IChwIC0gdGhpcy5fcDMpIC8gdGhpcy5fcDEpICogcCAqIHAgKiBwKTtcblx0XHRcdH1cblx0XHRcdHJldHVybiB0aGlzLl9jYWxjRW5kID8gMSA6IHI7XG5cdFx0fTtcblx0XHRTbG93TW8uZWFzZSA9IG5ldyBTbG93TW8oMC43LCAwLjcpO1xuXG5cdFx0cC5jb25maWcgPSBTbG93TW8uY29uZmlnID0gZnVuY3Rpb24obGluZWFyUmF0aW8sIHBvd2VyLCB5b3lvTW9kZSkge1xuXHRcdFx0cmV0dXJuIG5ldyBTbG93TW8obGluZWFyUmF0aW8sIHBvd2VyLCB5b3lvTW9kZSk7XG5cdFx0fTtcblxuXG5cdFx0Ly9TdGVwcGVkRWFzZVxuXHRcdFN0ZXBwZWRFYXNlID0gX2NsYXNzKFwiZWFzaW5nLlN0ZXBwZWRFYXNlXCIsIGZ1bmN0aW9uKHN0ZXBzKSB7XG5cdFx0XHRcdHN0ZXBzID0gc3RlcHMgfHwgMTtcblx0XHRcdFx0dGhpcy5fcDEgPSAxIC8gc3RlcHM7XG5cdFx0XHRcdHRoaXMuX3AyID0gc3RlcHMgKyAxO1xuXHRcdFx0fSwgdHJ1ZSk7XG5cdFx0cCA9IFN0ZXBwZWRFYXNlLnByb3RvdHlwZSA9IG5ldyBFYXNlKCk7XG5cdFx0cC5jb25zdHJ1Y3RvciA9IFN0ZXBwZWRFYXNlO1xuXHRcdHAuZ2V0UmF0aW8gPSBmdW5jdGlvbihwKSB7XG5cdFx0XHRpZiAocCA8IDApIHtcblx0XHRcdFx0cCA9IDA7XG5cdFx0XHR9IGVsc2UgaWYgKHAgPj0gMSkge1xuXHRcdFx0XHRwID0gMC45OTk5OTk5OTk7XG5cdFx0XHR9XG5cdFx0XHRyZXR1cm4gKCh0aGlzLl9wMiAqIHApID4+IDApICogdGhpcy5fcDE7XG5cdFx0fTtcblx0XHRwLmNvbmZpZyA9IFN0ZXBwZWRFYXNlLmNvbmZpZyA9IGZ1bmN0aW9uKHN0ZXBzKSB7XG5cdFx0XHRyZXR1cm4gbmV3IFN0ZXBwZWRFYXNlKHN0ZXBzKTtcblx0XHR9O1xuXG5cblx0XHQvL1JvdWdoRWFzZVxuXHRcdFJvdWdoRWFzZSA9IF9jbGFzcyhcImVhc2luZy5Sb3VnaEVhc2VcIiwgZnVuY3Rpb24odmFycykge1xuXHRcdFx0dmFycyA9IHZhcnMgfHwge307XG5cdFx0XHR2YXIgdGFwZXIgPSB2YXJzLnRhcGVyIHx8IFwibm9uZVwiLFxuXHRcdFx0XHRhID0gW10sXG5cdFx0XHRcdGNudCA9IDAsXG5cdFx0XHRcdHBvaW50cyA9ICh2YXJzLnBvaW50cyB8fCAyMCkgfCAwLFxuXHRcdFx0XHRpID0gcG9pbnRzLFxuXHRcdFx0XHRyYW5kb21pemUgPSAodmFycy5yYW5kb21pemUgIT09IGZhbHNlKSxcblx0XHRcdFx0Y2xhbXAgPSAodmFycy5jbGFtcCA9PT0gdHJ1ZSksXG5cdFx0XHRcdHRlbXBsYXRlID0gKHZhcnMudGVtcGxhdGUgaW5zdGFuY2VvZiBFYXNlKSA/IHZhcnMudGVtcGxhdGUgOiBudWxsLFxuXHRcdFx0XHRzdHJlbmd0aCA9ICh0eXBlb2YodmFycy5zdHJlbmd0aCkgPT09IFwibnVtYmVyXCIpID8gdmFycy5zdHJlbmd0aCAqIDAuNCA6IDAuNCxcblx0XHRcdFx0eCwgeSwgYnVtcCwgaW52WCwgb2JqLCBwbnQ7XG5cdFx0XHR3aGlsZSAoLS1pID4gLTEpIHtcblx0XHRcdFx0eCA9IHJhbmRvbWl6ZSA/IE1hdGgucmFuZG9tKCkgOiAoMSAvIHBvaW50cykgKiBpO1xuXHRcdFx0XHR5ID0gdGVtcGxhdGUgPyB0ZW1wbGF0ZS5nZXRSYXRpbyh4KSA6IHg7XG5cdFx0XHRcdGlmICh0YXBlciA9PT0gXCJub25lXCIpIHtcblx0XHRcdFx0XHRidW1wID0gc3RyZW5ndGg7XG5cdFx0XHRcdH0gZWxzZSBpZiAodGFwZXIgPT09IFwib3V0XCIpIHtcblx0XHRcdFx0XHRpbnZYID0gMSAtIHg7XG5cdFx0XHRcdFx0YnVtcCA9IGludlggKiBpbnZYICogc3RyZW5ndGg7XG5cdFx0XHRcdH0gZWxzZSBpZiAodGFwZXIgPT09IFwiaW5cIikge1xuXHRcdFx0XHRcdGJ1bXAgPSB4ICogeCAqIHN0cmVuZ3RoO1xuXHRcdFx0XHR9IGVsc2UgaWYgKHggPCAwLjUpIHsgIC8vXCJib3RoXCIgKHN0YXJ0KVxuXHRcdFx0XHRcdGludlggPSB4ICogMjtcblx0XHRcdFx0XHRidW1wID0gaW52WCAqIGludlggKiAwLjUgKiBzdHJlbmd0aDtcblx0XHRcdFx0fSBlbHNlIHtcdFx0XHRcdC8vXCJib3RoXCIgKGVuZClcblx0XHRcdFx0XHRpbnZYID0gKDEgLSB4KSAqIDI7XG5cdFx0XHRcdFx0YnVtcCA9IGludlggKiBpbnZYICogMC41ICogc3RyZW5ndGg7XG5cdFx0XHRcdH1cblx0XHRcdFx0aWYgKHJhbmRvbWl6ZSkge1xuXHRcdFx0XHRcdHkgKz0gKE1hdGgucmFuZG9tKCkgKiBidW1wKSAtIChidW1wICogMC41KTtcblx0XHRcdFx0fSBlbHNlIGlmIChpICUgMikge1xuXHRcdFx0XHRcdHkgKz0gYnVtcCAqIDAuNTtcblx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHR5IC09IGJ1bXAgKiAwLjU7XG5cdFx0XHRcdH1cblx0XHRcdFx0aWYgKGNsYW1wKSB7XG5cdFx0XHRcdFx0aWYgKHkgPiAxKSB7XG5cdFx0XHRcdFx0XHR5ID0gMTtcblx0XHRcdFx0XHR9IGVsc2UgaWYgKHkgPCAwKSB7XG5cdFx0XHRcdFx0XHR5ID0gMDtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblx0XHRcdFx0YVtjbnQrK10gPSB7eDp4LCB5Onl9O1xuXHRcdFx0fVxuXHRcdFx0YS5zb3J0KGZ1bmN0aW9uKGEsIGIpIHtcblx0XHRcdFx0cmV0dXJuIGEueCAtIGIueDtcblx0XHRcdH0pO1xuXG5cdFx0XHRwbnQgPSBuZXcgRWFzZVBvaW50KDEsIDEsIG51bGwpO1xuXHRcdFx0aSA9IHBvaW50cztcblx0XHRcdHdoaWxlICgtLWkgPiAtMSkge1xuXHRcdFx0XHRvYmogPSBhW2ldO1xuXHRcdFx0XHRwbnQgPSBuZXcgRWFzZVBvaW50KG9iai54LCBvYmoueSwgcG50KTtcblx0XHRcdH1cblxuXHRcdFx0dGhpcy5fcHJldiA9IG5ldyBFYXNlUG9pbnQoMCwgMCwgKHBudC50ICE9PSAwKSA/IHBudCA6IHBudC5uZXh0KTtcblx0XHR9LCB0cnVlKTtcblx0XHRwID0gUm91Z2hFYXNlLnByb3RvdHlwZSA9IG5ldyBFYXNlKCk7XG5cdFx0cC5jb25zdHJ1Y3RvciA9IFJvdWdoRWFzZTtcblx0XHRwLmdldFJhdGlvID0gZnVuY3Rpb24ocCkge1xuXHRcdFx0dmFyIHBudCA9IHRoaXMuX3ByZXY7XG5cdFx0XHRpZiAocCA+IHBudC50KSB7XG5cdFx0XHRcdHdoaWxlIChwbnQubmV4dCAmJiBwID49IHBudC50KSB7XG5cdFx0XHRcdFx0cG50ID0gcG50Lm5leHQ7XG5cdFx0XHRcdH1cblx0XHRcdFx0cG50ID0gcG50LnByZXY7XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHR3aGlsZSAocG50LnByZXYgJiYgcCA8PSBwbnQudCkge1xuXHRcdFx0XHRcdHBudCA9IHBudC5wcmV2O1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0XHR0aGlzLl9wcmV2ID0gcG50O1xuXHRcdFx0cmV0dXJuIChwbnQudiArICgocCAtIHBudC50KSAvIHBudC5nYXApICogcG50LmMpO1xuXHRcdH07XG5cdFx0cC5jb25maWcgPSBmdW5jdGlvbih2YXJzKSB7XG5cdFx0XHRyZXR1cm4gbmV3IFJvdWdoRWFzZSh2YXJzKTtcblx0XHR9O1xuXHRcdFJvdWdoRWFzZS5lYXNlID0gbmV3IFJvdWdoRWFzZSgpO1xuXG5cblx0XHQvL0JvdW5jZVxuXHRcdF93cmFwKFwiQm91bmNlXCIsXG5cdFx0XHRfY3JlYXRlKFwiQm91bmNlT3V0XCIsIGZ1bmN0aW9uKHApIHtcblx0XHRcdFx0aWYgKHAgPCAxIC8gMi43NSkge1xuXHRcdFx0XHRcdHJldHVybiA3LjU2MjUgKiBwICogcDtcblx0XHRcdFx0fSBlbHNlIGlmIChwIDwgMiAvIDIuNzUpIHtcblx0XHRcdFx0XHRyZXR1cm4gNy41NjI1ICogKHAgLT0gMS41IC8gMi43NSkgKiBwICsgMC43NTtcblx0XHRcdFx0fSBlbHNlIGlmIChwIDwgMi41IC8gMi43NSkge1xuXHRcdFx0XHRcdHJldHVybiA3LjU2MjUgKiAocCAtPSAyLjI1IC8gMi43NSkgKiBwICsgMC45Mzc1O1xuXHRcdFx0XHR9XG5cdFx0XHRcdHJldHVybiA3LjU2MjUgKiAocCAtPSAyLjYyNSAvIDIuNzUpICogcCArIDAuOTg0Mzc1O1xuXHRcdFx0fSksXG5cdFx0XHRfY3JlYXRlKFwiQm91bmNlSW5cIiwgZnVuY3Rpb24ocCkge1xuXHRcdFx0XHRpZiAoKHAgPSAxIC0gcCkgPCAxIC8gMi43NSkge1xuXHRcdFx0XHRcdHJldHVybiAxIC0gKDcuNTYyNSAqIHAgKiBwKTtcblx0XHRcdFx0fSBlbHNlIGlmIChwIDwgMiAvIDIuNzUpIHtcblx0XHRcdFx0XHRyZXR1cm4gMSAtICg3LjU2MjUgKiAocCAtPSAxLjUgLyAyLjc1KSAqIHAgKyAwLjc1KTtcblx0XHRcdFx0fSBlbHNlIGlmIChwIDwgMi41IC8gMi43NSkge1xuXHRcdFx0XHRcdHJldHVybiAxIC0gKDcuNTYyNSAqIChwIC09IDIuMjUgLyAyLjc1KSAqIHAgKyAwLjkzNzUpO1xuXHRcdFx0XHR9XG5cdFx0XHRcdHJldHVybiAxIC0gKDcuNTYyNSAqIChwIC09IDIuNjI1IC8gMi43NSkgKiBwICsgMC45ODQzNzUpO1xuXHRcdFx0fSksXG5cdFx0XHRfY3JlYXRlKFwiQm91bmNlSW5PdXRcIiwgZnVuY3Rpb24ocCkge1xuXHRcdFx0XHR2YXIgaW52ZXJ0ID0gKHAgPCAwLjUpO1xuXHRcdFx0XHRpZiAoaW52ZXJ0KSB7XG5cdFx0XHRcdFx0cCA9IDEgLSAocCAqIDIpO1xuXHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdHAgPSAocCAqIDIpIC0gMTtcblx0XHRcdFx0fVxuXHRcdFx0XHRpZiAocCA8IDEgLyAyLjc1KSB7XG5cdFx0XHRcdFx0cCA9IDcuNTYyNSAqIHAgKiBwO1xuXHRcdFx0XHR9IGVsc2UgaWYgKHAgPCAyIC8gMi43NSkge1xuXHRcdFx0XHRcdHAgPSA3LjU2MjUgKiAocCAtPSAxLjUgLyAyLjc1KSAqIHAgKyAwLjc1O1xuXHRcdFx0XHR9IGVsc2UgaWYgKHAgPCAyLjUgLyAyLjc1KSB7XG5cdFx0XHRcdFx0cCA9IDcuNTYyNSAqIChwIC09IDIuMjUgLyAyLjc1KSAqIHAgKyAwLjkzNzU7XG5cdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0cCA9IDcuNTYyNSAqIChwIC09IDIuNjI1IC8gMi43NSkgKiBwICsgMC45ODQzNzU7XG5cdFx0XHRcdH1cblx0XHRcdFx0cmV0dXJuIGludmVydCA/ICgxIC0gcCkgKiAwLjUgOiBwICogMC41ICsgMC41O1xuXHRcdFx0fSlcblx0XHQpO1xuXG5cblx0XHQvL0NJUkNcblx0XHRfd3JhcChcIkNpcmNcIixcblx0XHRcdF9jcmVhdGUoXCJDaXJjT3V0XCIsIGZ1bmN0aW9uKHApIHtcblx0XHRcdFx0cmV0dXJuIE1hdGguc3FydCgxIC0gKHAgPSBwIC0gMSkgKiBwKTtcblx0XHRcdH0pLFxuXHRcdFx0X2NyZWF0ZShcIkNpcmNJblwiLCBmdW5jdGlvbihwKSB7XG5cdFx0XHRcdHJldHVybiAtKE1hdGguc3FydCgxIC0gKHAgKiBwKSkgLSAxKTtcblx0XHRcdH0pLFxuXHRcdFx0X2NyZWF0ZShcIkNpcmNJbk91dFwiLCBmdW5jdGlvbihwKSB7XG5cdFx0XHRcdHJldHVybiAoKHAqPTIpIDwgMSkgPyAtMC41ICogKE1hdGguc3FydCgxIC0gcCAqIHApIC0gMSkgOiAwLjUgKiAoTWF0aC5zcXJ0KDEgLSAocCAtPSAyKSAqIHApICsgMSk7XG5cdFx0XHR9KVxuXHRcdCk7XG5cblxuXHRcdC8vRWxhc3RpY1xuXHRcdF9jcmVhdGVFbGFzdGljID0gZnVuY3Rpb24obiwgZiwgZGVmKSB7XG5cdFx0XHR2YXIgQyA9IF9jbGFzcyhcImVhc2luZy5cIiArIG4sIGZ1bmN0aW9uKGFtcGxpdHVkZSwgcGVyaW9kKSB7XG5cdFx0XHRcdFx0dGhpcy5fcDEgPSAoYW1wbGl0dWRlID49IDEpID8gYW1wbGl0dWRlIDogMTsgLy9ub3RlOiBpZiBhbXBsaXR1ZGUgaXMgPCAxLCB3ZSBzaW1wbHkgYWRqdXN0IHRoZSBwZXJpb2QgZm9yIGEgbW9yZSBuYXR1cmFsIGZlZWwuIE90aGVyd2lzZSB0aGUgbWF0aCBkb2Vzbid0IHdvcmsgcmlnaHQgYW5kIHRoZSBjdXJ2ZSBzdGFydHMgYXQgMS5cblx0XHRcdFx0XHR0aGlzLl9wMiA9IChwZXJpb2QgfHwgZGVmKSAvIChhbXBsaXR1ZGUgPCAxID8gYW1wbGl0dWRlIDogMSk7XG5cdFx0XHRcdFx0dGhpcy5fcDMgPSB0aGlzLl9wMiAvIF8yUEkgKiAoTWF0aC5hc2luKDEgLyB0aGlzLl9wMSkgfHwgMCk7XG5cdFx0XHRcdFx0dGhpcy5fcDIgPSBfMlBJIC8gdGhpcy5fcDI7IC8vcHJlY2FsY3VsYXRlIHRvIG9wdGltaXplXG5cdFx0XHRcdH0sIHRydWUpLFxuXHRcdFx0XHRwID0gQy5wcm90b3R5cGUgPSBuZXcgRWFzZSgpO1xuXHRcdFx0cC5jb25zdHJ1Y3RvciA9IEM7XG5cdFx0XHRwLmdldFJhdGlvID0gZjtcblx0XHRcdHAuY29uZmlnID0gZnVuY3Rpb24oYW1wbGl0dWRlLCBwZXJpb2QpIHtcblx0XHRcdFx0cmV0dXJuIG5ldyBDKGFtcGxpdHVkZSwgcGVyaW9kKTtcblx0XHRcdH07XG5cdFx0XHRyZXR1cm4gQztcblx0XHR9O1xuXHRcdF93cmFwKFwiRWxhc3RpY1wiLFxuXHRcdFx0X2NyZWF0ZUVsYXN0aWMoXCJFbGFzdGljT3V0XCIsIGZ1bmN0aW9uKHApIHtcblx0XHRcdFx0cmV0dXJuIHRoaXMuX3AxICogTWF0aC5wb3coMiwgLTEwICogcCkgKiBNYXRoLnNpbiggKHAgLSB0aGlzLl9wMykgKiB0aGlzLl9wMiApICsgMTtcblx0XHRcdH0sIDAuMyksXG5cdFx0XHRfY3JlYXRlRWxhc3RpYyhcIkVsYXN0aWNJblwiLCBmdW5jdGlvbihwKSB7XG5cdFx0XHRcdHJldHVybiAtKHRoaXMuX3AxICogTWF0aC5wb3coMiwgMTAgKiAocCAtPSAxKSkgKiBNYXRoLnNpbiggKHAgLSB0aGlzLl9wMykgKiB0aGlzLl9wMiApKTtcblx0XHRcdH0sIDAuMyksXG5cdFx0XHRfY3JlYXRlRWxhc3RpYyhcIkVsYXN0aWNJbk91dFwiLCBmdW5jdGlvbihwKSB7XG5cdFx0XHRcdHJldHVybiAoKHAgKj0gMikgPCAxKSA/IC0wLjUgKiAodGhpcy5fcDEgKiBNYXRoLnBvdygyLCAxMCAqIChwIC09IDEpKSAqIE1hdGguc2luKCAocCAtIHRoaXMuX3AzKSAqIHRoaXMuX3AyKSkgOiB0aGlzLl9wMSAqIE1hdGgucG93KDIsIC0xMCAqKHAgLT0gMSkpICogTWF0aC5zaW4oIChwIC0gdGhpcy5fcDMpICogdGhpcy5fcDIgKSAqIDAuNSArIDE7XG5cdFx0XHR9LCAwLjQ1KVxuXHRcdCk7XG5cblxuXHRcdC8vRXhwb1xuXHRcdF93cmFwKFwiRXhwb1wiLFxuXHRcdFx0X2NyZWF0ZShcIkV4cG9PdXRcIiwgZnVuY3Rpb24ocCkge1xuXHRcdFx0XHRyZXR1cm4gMSAtIE1hdGgucG93KDIsIC0xMCAqIHApO1xuXHRcdFx0fSksXG5cdFx0XHRfY3JlYXRlKFwiRXhwb0luXCIsIGZ1bmN0aW9uKHApIHtcblx0XHRcdFx0cmV0dXJuIE1hdGgucG93KDIsIDEwICogKHAgLSAxKSkgLSAwLjAwMTtcblx0XHRcdH0pLFxuXHRcdFx0X2NyZWF0ZShcIkV4cG9Jbk91dFwiLCBmdW5jdGlvbihwKSB7XG5cdFx0XHRcdHJldHVybiAoKHAgKj0gMikgPCAxKSA/IDAuNSAqIE1hdGgucG93KDIsIDEwICogKHAgLSAxKSkgOiAwLjUgKiAoMiAtIE1hdGgucG93KDIsIC0xMCAqIChwIC0gMSkpKTtcblx0XHRcdH0pXG5cdFx0KTtcblxuXG5cdFx0Ly9TaW5lXG5cdFx0X3dyYXAoXCJTaW5lXCIsXG5cdFx0XHRfY3JlYXRlKFwiU2luZU91dFwiLCBmdW5jdGlvbihwKSB7XG5cdFx0XHRcdHJldHVybiBNYXRoLnNpbihwICogX0hBTEZfUEkpO1xuXHRcdFx0fSksXG5cdFx0XHRfY3JlYXRlKFwiU2luZUluXCIsIGZ1bmN0aW9uKHApIHtcblx0XHRcdFx0cmV0dXJuIC1NYXRoLmNvcyhwICogX0hBTEZfUEkpICsgMTtcblx0XHRcdH0pLFxuXHRcdFx0X2NyZWF0ZShcIlNpbmVJbk91dFwiLCBmdW5jdGlvbihwKSB7XG5cdFx0XHRcdHJldHVybiAtMC41ICogKE1hdGguY29zKE1hdGguUEkgKiBwKSAtIDEpO1xuXHRcdFx0fSlcblx0XHQpO1xuXG5cdFx0X2NsYXNzKFwiZWFzaW5nLkVhc2VMb29rdXBcIiwge1xuXHRcdFx0XHRmaW5kOmZ1bmN0aW9uKHMpIHtcblx0XHRcdFx0XHRyZXR1cm4gRWFzZS5tYXBbc107XG5cdFx0XHRcdH1cblx0XHRcdH0sIHRydWUpO1xuXG5cdFx0Ly9yZWdpc3RlciB0aGUgbm9uLXN0YW5kYXJkIGVhc2VzXG5cdFx0X2Vhc2VSZWcody5TbG93TW8sIFwiU2xvd01vXCIsIFwiZWFzZSxcIik7XG5cdFx0X2Vhc2VSZWcoUm91Z2hFYXNlLCBcIlJvdWdoRWFzZVwiLCBcImVhc2UsXCIpO1xuXHRcdF9lYXNlUmVnKFN0ZXBwZWRFYXNlLCBcIlN0ZXBwZWRFYXNlXCIsIFwiZWFzZSxcIik7XG5cblx0XHRyZXR1cm4gQmFjaztcblx0XHRcblx0fSwgdHJ1ZSk7XG5cblxufSk7XG5cbmlmIChfZ3NTY29wZS5fZ3NEZWZpbmUpIHsgX2dzU2NvcGUuX2dzUXVldWUucG9wKCkoKTsgfSAvL25lY2Vzc2FyeSBpbiBjYXNlIFR3ZWVuTGl0ZSB3YXMgYWxyZWFkeSBsb2FkZWQgc2VwYXJhdGVseS5cblxuXG5cblxuXG5cblxuXG5cblxuXG4vKlxuICogLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICogQmFzZSBjbGFzc2VzIGxpa2UgVHdlZW5MaXRlLCBTaW1wbGVUaW1lbGluZSwgRWFzZSwgVGlja2VyLCBldGMuXG4gKiAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gKi9cbihmdW5jdGlvbih3aW5kb3csIG1vZHVsZU5hbWUpIHtcblxuXHRcdFwidXNlIHN0cmljdFwiO1xuXHRcdHZhciBfZ2xvYmFscyA9IHdpbmRvdy5HcmVlblNvY2tHbG9iYWxzID0gd2luZG93LkdyZWVuU29ja0dsb2JhbHMgfHwgd2luZG93O1xuXHRcdGlmIChfZ2xvYmFscy5Ud2VlbkxpdGUpIHtcblx0XHRcdHJldHVybjsgLy9pbiBjYXNlIHRoZSBjb3JlIHNldCBvZiBjbGFzc2VzIGlzIGFscmVhZHkgbG9hZGVkLCBkb24ndCBpbnN0YW50aWF0ZSB0d2ljZS5cblx0XHR9XG5cdFx0dmFyIF9uYW1lc3BhY2UgPSBmdW5jdGlvbihucykge1xuXHRcdFx0XHR2YXIgYSA9IG5zLnNwbGl0KFwiLlwiKSxcblx0XHRcdFx0XHRwID0gX2dsb2JhbHMsIGk7XG5cdFx0XHRcdGZvciAoaSA9IDA7IGkgPCBhLmxlbmd0aDsgaSsrKSB7XG5cdFx0XHRcdFx0cFthW2ldXSA9IHAgPSBwW2FbaV1dIHx8IHt9O1xuXHRcdFx0XHR9XG5cdFx0XHRcdHJldHVybiBwO1xuXHRcdFx0fSxcblx0XHRcdGdzID0gX25hbWVzcGFjZShcImNvbS5ncmVlbnNvY2tcIiksXG5cdFx0XHRfdGlueU51bSA9IDAuMDAwMDAwMDAwMSxcblx0XHRcdF9zbGljZSA9IGZ1bmN0aW9uKGEpIHsgLy9kb24ndCB1c2UgQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwodGFyZ2V0LCAwKSBiZWNhdXNlIHRoYXQgZG9lc24ndCB3b3JrIGluIElFOCB3aXRoIGEgTm9kZUxpc3QgdGhhdCdzIHJldHVybmVkIGJ5IHF1ZXJ5U2VsZWN0b3JBbGwoKVxuXHRcdFx0XHR2YXIgYiA9IFtdLFxuXHRcdFx0XHRcdGwgPSBhLmxlbmd0aCxcblx0XHRcdFx0XHRpO1xuXHRcdFx0XHRmb3IgKGkgPSAwOyBpICE9PSBsOyBiLnB1c2goYVtpKytdKSkge31cblx0XHRcdFx0cmV0dXJuIGI7XG5cdFx0XHR9LFxuXHRcdFx0X2VtcHR5RnVuYyA9IGZ1bmN0aW9uKCkge30sXG5cdFx0XHRfaXNBcnJheSA9IChmdW5jdGlvbigpIHsgLy93b3JrcyBhcm91bmQgaXNzdWVzIGluIGlmcmFtZSBlbnZpcm9ubWVudHMgd2hlcmUgdGhlIEFycmF5IGdsb2JhbCBpc24ndCBzaGFyZWQsIHRodXMgaWYgdGhlIG9iamVjdCBvcmlnaW5hdGVzIGluIGEgZGlmZmVyZW50IHdpbmRvdy9pZnJhbWUsIFwiKG9iaiBpbnN0YW5jZW9mIEFycmF5KVwiIHdpbGwgZXZhbHVhdGUgZmFsc2UuIFdlIGFkZGVkIHNvbWUgc3BlZWQgb3B0aW1pemF0aW9ucyB0byBhdm9pZCBPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwoKSB1bmxlc3MgaXQncyBhYnNvbHV0ZWx5IG5lY2Vzc2FyeSBiZWNhdXNlIGl0J3MgVkVSWSBzbG93IChsaWtlIDIweCBzbG93ZXIpXG5cdFx0XHRcdHZhciB0b1N0cmluZyA9IE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcsXG5cdFx0XHRcdFx0YXJyYXkgPSB0b1N0cmluZy5jYWxsKFtdKTtcblx0XHRcdFx0cmV0dXJuIGZ1bmN0aW9uKG9iaikge1xuXHRcdFx0XHRcdHJldHVybiBvYmogIT0gbnVsbCAmJiAob2JqIGluc3RhbmNlb2YgQXJyYXkgfHwgKHR5cGVvZihvYmopID09PSBcIm9iamVjdFwiICYmICEhb2JqLnB1c2ggJiYgdG9TdHJpbmcuY2FsbChvYmopID09PSBhcnJheSkpO1xuXHRcdFx0XHR9O1xuXHRcdFx0fSgpKSxcblx0XHRcdGEsIGksIHAsIF90aWNrZXIsIF90aWNrZXJBY3RpdmUsXG5cdFx0XHRfZGVmTG9va3VwID0ge30sXG5cblx0XHRcdC8qKlxuXHRcdFx0ICogQGNvbnN0cnVjdG9yXG5cdFx0XHQgKiBEZWZpbmVzIGEgR3JlZW5Tb2NrIGNsYXNzLCBvcHRpb25hbGx5IHdpdGggYW4gYXJyYXkgb2YgZGVwZW5kZW5jaWVzIHRoYXQgbXVzdCBiZSBpbnN0YW50aWF0ZWQgZmlyc3QgYW5kIHBhc3NlZCBpbnRvIHRoZSBkZWZpbml0aW9uLlxuXHRcdFx0ICogVGhpcyBhbGxvd3MgdXNlcnMgdG8gbG9hZCBHcmVlblNvY2sgSlMgZmlsZXMgaW4gYW55IG9yZGVyIGV2ZW4gaWYgdGhleSBoYXZlIGludGVyZGVwZW5kZW5jaWVzIChsaWtlIENTU1BsdWdpbiBleHRlbmRzIFR3ZWVuUGx1Z2luIHdoaWNoIGlzXG5cdFx0XHQgKiBpbnNpZGUgVHdlZW5MaXRlLmpzLCBidXQgaWYgQ1NTUGx1Z2luIGlzIGxvYWRlZCBmaXJzdCwgaXQgc2hvdWxkIHdhaXQgdG8gcnVuIGl0cyBjb2RlIHVudGlsIFR3ZWVuTGl0ZS5qcyBsb2FkcyBhbmQgaW5zdGFudGlhdGVzIFR3ZWVuUGx1Z2luXG5cdFx0XHQgKiBhbmQgdGhlbiBwYXNzIFR3ZWVuUGx1Z2luIHRvIENTU1BsdWdpbidzIGRlZmluaXRpb24pLiBUaGlzIGlzIGFsbCBkb25lIGF1dG9tYXRpY2FsbHkgYW5kIGludGVybmFsbHkuXG5cdFx0XHQgKlxuXHRcdFx0ICogRXZlcnkgZGVmaW5pdGlvbiB3aWxsIGJlIGFkZGVkIHRvIGEgXCJjb20uZ3JlZW5zb2NrXCIgZ2xvYmFsIG9iamVjdCAodHlwaWNhbGx5IHdpbmRvdywgYnV0IGlmIGEgd2luZG93LkdyZWVuU29ja0dsb2JhbHMgb2JqZWN0IGlzIGZvdW5kLFxuXHRcdFx0ICogaXQgd2lsbCBnbyB0aGVyZSBhcyBvZiB2MS43KS4gRm9yIGV4YW1wbGUsIFR3ZWVuTGl0ZSB3aWxsIGJlIGZvdW5kIGF0IHdpbmRvdy5jb20uZ3JlZW5zb2NrLlR3ZWVuTGl0ZSBhbmQgc2luY2UgaXQncyBhIGdsb2JhbCBjbGFzcyB0aGF0IHNob3VsZCBiZSBhdmFpbGFibGUgYW55d2hlcmUsXG5cdFx0XHQgKiBpdCBpcyBBTFNPIHJlZmVyZW5jZWQgYXQgd2luZG93LlR3ZWVuTGl0ZS4gSG93ZXZlciBzb21lIGNsYXNzZXMgYXJlbid0IGNvbnNpZGVyZWQgZ2xvYmFsLCBsaWtlIHRoZSBiYXNlIGNvbS5ncmVlbnNvY2suY29yZS5BbmltYXRpb24gY2xhc3MsIHNvXG5cdFx0XHQgKiB0aG9zZSB3aWxsIG9ubHkgYmUgYXQgdGhlIHBhY2thZ2UgbGlrZSB3aW5kb3cuY29tLmdyZWVuc29jay5jb3JlLkFuaW1hdGlvbi4gQWdhaW4sIGlmIHlvdSBkZWZpbmUgYSBHcmVlblNvY2tHbG9iYWxzIG9iamVjdCBvbiB0aGUgd2luZG93LCBldmVyeXRoaW5nXG5cdFx0XHQgKiBnZXRzIHR1Y2tlZCBuZWF0bHkgaW5zaWRlIHRoZXJlIGluc3RlYWQgb2Ygb24gdGhlIHdpbmRvdyBkaXJlY3RseS4gVGhpcyBhbGxvd3MgeW91IHRvIGRvIGFkdmFuY2VkIHRoaW5ncyBsaWtlIGxvYWQgbXVsdGlwbGUgdmVyc2lvbnMgb2YgR3JlZW5Tb2NrXG5cdFx0XHQgKiBmaWxlcyBhbmQgcHV0IHRoZW0gaW50byBkaXN0aW5jdCBvYmplY3RzIChpbWFnaW5lIGEgYmFubmVyIGFkIHVzZXMgYSBuZXdlciB2ZXJzaW9uIGJ1dCB0aGUgbWFpbiBzaXRlIHVzZXMgYW4gb2xkZXIgb25lKS4gSW4gdGhhdCBjYXNlLCB5b3UgY291bGRcblx0XHRcdCAqIHNhbmRib3ggdGhlIGJhbm5lciBvbmUgbGlrZTpcblx0XHRcdCAqXG5cdFx0XHQgKiA8c2NyaXB0PlxuXHRcdFx0ICogICAgIHZhciBncyA9IHdpbmRvdy5HcmVlblNvY2tHbG9iYWxzID0ge307IC8vdGhlIG5ld2VyIHZlcnNpb24gd2UncmUgYWJvdXQgdG8gbG9hZCBjb3VsZCBub3cgYmUgcmVmZXJlbmNlZCBpbiBhIFwiZ3NcIiBvYmplY3QsIGxpa2UgZ3MuVHdlZW5MaXRlLnRvKC4uLikuIFVzZSB3aGF0ZXZlciBhbGlhcyB5b3Ugd2FudCBhcyBsb25nIGFzIGl0J3MgdW5pcXVlLCBcImdzXCIgb3IgXCJiYW5uZXJcIiBvciB3aGF0ZXZlci5cblx0XHRcdCAqIDwvc2NyaXB0PlxuXHRcdFx0ICogPHNjcmlwdCBzcmM9XCJqcy9ncmVlbnNvY2svdjEuNy9Ud2Vlbk1heC5qc1wiPjwvc2NyaXB0PlxuXHRcdFx0ICogPHNjcmlwdD5cblx0XHRcdCAqICAgICB3aW5kb3cuR3JlZW5Tb2NrR2xvYmFscyA9IHdpbmRvdy5fZ3NRdWV1ZSA9IHdpbmRvdy5fZ3NEZWZpbmUgPSBudWxsOyAvL3Jlc2V0IGl0IGJhY2sgdG8gbnVsbCAoYWxvbmcgd2l0aCB0aGUgc3BlY2lhbCBfZ3NRdWV1ZSB2YXJpYWJsZSkgc28gdGhhdCB0aGUgbmV4dCBsb2FkIG9mIFR3ZWVuTWF4IGFmZmVjdHMgdGhlIHdpbmRvdyBhbmQgd2UgY2FuIHJlZmVyZW5jZSB0aGluZ3MgZGlyZWN0bHkgbGlrZSBUd2VlbkxpdGUudG8oLi4uKVxuXHRcdFx0ICogPC9zY3JpcHQ+XG5cdFx0XHQgKiA8c2NyaXB0IHNyYz1cImpzL2dyZWVuc29jay92MS42L1R3ZWVuTWF4LmpzXCI+PC9zY3JpcHQ+XG5cdFx0XHQgKiA8c2NyaXB0PlxuXHRcdFx0ICogICAgIGdzLlR3ZWVuTGl0ZS50byguLi4pOyAvL3dvdWxkIHVzZSB2MS43XG5cdFx0XHQgKiAgICAgVHdlZW5MaXRlLnRvKC4uLik7IC8vd291bGQgdXNlIHYxLjZcblx0XHRcdCAqIDwvc2NyaXB0PlxuXHRcdFx0ICpcblx0XHRcdCAqIEBwYXJhbSB7IXN0cmluZ30gbnMgVGhlIG5hbWVzcGFjZSBvZiB0aGUgY2xhc3MgZGVmaW5pdGlvbiwgbGVhdmluZyBvZmYgXCJjb20uZ3JlZW5zb2NrLlwiIGFzIHRoYXQncyBhc3N1bWVkLiBGb3IgZXhhbXBsZSwgXCJUd2VlbkxpdGVcIiBvciBcInBsdWdpbnMuQ1NTUGx1Z2luXCIgb3IgXCJlYXNpbmcuQmFja1wiLlxuXHRcdFx0ICogQHBhcmFtIHshQXJyYXkuPHN0cmluZz59IGRlcGVuZGVuY2llcyBBbiBhcnJheSBvZiBkZXBlbmRlbmNpZXMgKGRlc2NyaWJlZCBhcyB0aGVpciBuYW1lc3BhY2VzIG1pbnVzIFwiY29tLmdyZWVuc29jay5cIiBwcmVmaXgpLiBGb3IgZXhhbXBsZSBbXCJUd2VlbkxpdGVcIixcInBsdWdpbnMuVHdlZW5QbHVnaW5cIixcImNvcmUuQW5pbWF0aW9uXCJdXG5cdFx0XHQgKiBAcGFyYW0geyFmdW5jdGlvbigpOk9iamVjdH0gZnVuYyBUaGUgZnVuY3Rpb24gdGhhdCBzaG91bGQgYmUgY2FsbGVkIGFuZCBwYXNzZWQgdGhlIHJlc29sdmVkIGRlcGVuZGVuY2llcyB3aGljaCB3aWxsIHJldHVybiB0aGUgYWN0dWFsIGNsYXNzIGZvciB0aGlzIGRlZmluaXRpb24uXG5cdFx0XHQgKiBAcGFyYW0ge2Jvb2xlYW49fSBnbG9iYWwgSWYgdHJ1ZSwgdGhlIGNsYXNzIHdpbGwgYmUgYWRkZWQgdG8gdGhlIGdsb2JhbCBzY29wZSAodHlwaWNhbGx5IHdpbmRvdyB1bmxlc3MgeW91IGRlZmluZSBhIHdpbmRvdy5HcmVlblNvY2tHbG9iYWxzIG9iamVjdClcblx0XHRcdCAqL1xuXHRcdFx0RGVmaW5pdGlvbiA9IGZ1bmN0aW9uKG5zLCBkZXBlbmRlbmNpZXMsIGZ1bmMsIGdsb2JhbCkge1xuXHRcdFx0XHR0aGlzLnNjID0gKF9kZWZMb29rdXBbbnNdKSA/IF9kZWZMb29rdXBbbnNdLnNjIDogW107IC8vc3ViY2xhc3Nlc1xuXHRcdFx0XHRfZGVmTG9va3VwW25zXSA9IHRoaXM7XG5cdFx0XHRcdHRoaXMuZ3NDbGFzcyA9IG51bGw7XG5cdFx0XHRcdHRoaXMuZnVuYyA9IGZ1bmM7XG5cdFx0XHRcdHZhciBfY2xhc3NlcyA9IFtdO1xuXHRcdFx0XHR0aGlzLmNoZWNrID0gZnVuY3Rpb24oaW5pdCkge1xuXHRcdFx0XHRcdHZhciBpID0gZGVwZW5kZW5jaWVzLmxlbmd0aCxcblx0XHRcdFx0XHRcdG1pc3NpbmcgPSBpLFxuXHRcdFx0XHRcdFx0Y3VyLCBhLCBuLCBjbCwgaGFzTW9kdWxlO1xuXHRcdFx0XHRcdHdoaWxlICgtLWkgPiAtMSkge1xuXHRcdFx0XHRcdFx0aWYgKChjdXIgPSBfZGVmTG9va3VwW2RlcGVuZGVuY2llc1tpXV0gfHwgbmV3IERlZmluaXRpb24oZGVwZW5kZW5jaWVzW2ldLCBbXSkpLmdzQ2xhc3MpIHtcblx0XHRcdFx0XHRcdFx0X2NsYXNzZXNbaV0gPSBjdXIuZ3NDbGFzcztcblx0XHRcdFx0XHRcdFx0bWlzc2luZy0tO1xuXHRcdFx0XHRcdFx0fSBlbHNlIGlmIChpbml0KSB7XG5cdFx0XHRcdFx0XHRcdGN1ci5zYy5wdXNoKHRoaXMpO1xuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHRpZiAobWlzc2luZyA9PT0gMCAmJiBmdW5jKSB7XG5cdFx0XHRcdFx0XHRhID0gKFwiY29tLmdyZWVuc29jay5cIiArIG5zKS5zcGxpdChcIi5cIik7XG5cdFx0XHRcdFx0XHRuID0gYS5wb3AoKTtcblx0XHRcdFx0XHRcdGNsID0gX25hbWVzcGFjZShhLmpvaW4oXCIuXCIpKVtuXSA9IHRoaXMuZ3NDbGFzcyA9IGZ1bmMuYXBwbHkoZnVuYywgX2NsYXNzZXMpO1xuXG5cdFx0XHRcdFx0XHQvL2V4cG9ydHMgdG8gbXVsdGlwbGUgZW52aXJvbm1lbnRzXG5cdFx0XHRcdFx0XHRpZiAoZ2xvYmFsKSB7XG5cdFx0XHRcdFx0XHRcdF9nbG9iYWxzW25dID0gY2w7IC8vcHJvdmlkZXMgYSB3YXkgdG8gYXZvaWQgZ2xvYmFsIG5hbWVzcGFjZSBwb2xsdXRpb24uIEJ5IGRlZmF1bHQsIHRoZSBtYWluIGNsYXNzZXMgbGlrZSBUd2VlbkxpdGUsIFBvd2VyMSwgU3Ryb25nLCBldGMuIGFyZSBhZGRlZCB0byB3aW5kb3cgdW5sZXNzIGEgR3JlZW5Tb2NrR2xvYmFscyBpcyBkZWZpbmVkLiBTbyBpZiB5b3Ugd2FudCB0byBoYXZlIHRoaW5ncyBhZGRlZCB0byBhIGN1c3RvbSBvYmplY3QgaW5zdGVhZCwganVzdCBkbyBzb21ldGhpbmcgbGlrZSB3aW5kb3cuR3JlZW5Tb2NrR2xvYmFscyA9IHt9IGJlZm9yZSBsb2FkaW5nIGFueSBHcmVlblNvY2sgZmlsZXMuIFlvdSBjYW4gZXZlbiBzZXQgdXAgYW4gYWxpYXMgbGlrZSB3aW5kb3cuR3JlZW5Tb2NrR2xvYmFscyA9IHdpbmRvd3MuZ3MgPSB7fSBzbyB0aGF0IHlvdSBjYW4gYWNjZXNzIGV2ZXJ5dGhpbmcgbGlrZSBncy5Ud2VlbkxpdGUuIEFsc28gcmVtZW1iZXIgdGhhdCBBTEwgY2xhc3NlcyBhcmUgYWRkZWQgdG8gdGhlIHdpbmRvdy5jb20uZ3JlZW5zb2NrIG9iamVjdCAoaW4gdGhlaXIgcmVzcGVjdGl2ZSBwYWNrYWdlcywgbGlrZSBjb20uZ3JlZW5zb2NrLmVhc2luZy5Qb3dlcjEsIGNvbS5ncmVlbnNvY2suVHdlZW5MaXRlLCBldGMuKVxuXHRcdFx0XHRcdFx0XHRoYXNNb2R1bGUgPSAodHlwZW9mKG1vZHVsZSkgIT09IFwidW5kZWZpbmVkXCIgJiYgbW9kdWxlLmV4cG9ydHMpO1xuXHRcdFx0XHRcdFx0XHRpZiAoIWhhc01vZHVsZSAmJiB0eXBlb2YoZGVmaW5lKSA9PT0gXCJmdW5jdGlvblwiICYmIGRlZmluZS5hbWQpeyAvL0FNRFxuXHRcdFx0XHRcdFx0XHRcdGRlZmluZSgod2luZG93LkdyZWVuU29ja0FNRFBhdGggPyB3aW5kb3cuR3JlZW5Tb2NrQU1EUGF0aCArIFwiL1wiIDogXCJcIikgKyBucy5zcGxpdChcIi5cIikucG9wKCksIFtdLCBmdW5jdGlvbigpIHsgcmV0dXJuIGNsOyB9KTtcblx0XHRcdFx0XHRcdFx0fSBlbHNlIGlmIChucyA9PT0gbW9kdWxlTmFtZSAmJiBoYXNNb2R1bGUpeyAvL25vZGVcblx0XHRcdFx0XHRcdFx0XHRtb2R1bGUuZXhwb3J0cyA9IGNsO1xuXHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRmb3IgKGkgPSAwOyBpIDwgdGhpcy5zYy5sZW5ndGg7IGkrKykge1xuXHRcdFx0XHRcdFx0XHR0aGlzLnNjW2ldLmNoZWNrKCk7XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9O1xuXHRcdFx0XHR0aGlzLmNoZWNrKHRydWUpO1xuXHRcdFx0fSxcblxuXHRcdFx0Ly91c2VkIHRvIGNyZWF0ZSBEZWZpbml0aW9uIGluc3RhbmNlcyAod2hpY2ggYmFzaWNhbGx5IHJlZ2lzdGVycyBhIGNsYXNzIHRoYXQgaGFzIGRlcGVuZGVuY2llcykuXG5cdFx0XHRfZ3NEZWZpbmUgPSB3aW5kb3cuX2dzRGVmaW5lID0gZnVuY3Rpb24obnMsIGRlcGVuZGVuY2llcywgZnVuYywgZ2xvYmFsKSB7XG5cdFx0XHRcdHJldHVybiBuZXcgRGVmaW5pdGlvbihucywgZGVwZW5kZW5jaWVzLCBmdW5jLCBnbG9iYWwpO1xuXHRcdFx0fSxcblxuXHRcdFx0Ly9hIHF1aWNrIHdheSB0byBjcmVhdGUgYSBjbGFzcyB0aGF0IGRvZXNuJ3QgaGF2ZSBhbnkgZGVwZW5kZW5jaWVzLiBSZXR1cm5zIHRoZSBjbGFzcywgYnV0IGZpcnN0IHJlZ2lzdGVycyBpdCBpbiB0aGUgR3JlZW5Tb2NrIG5hbWVzcGFjZSBzbyB0aGF0IG90aGVyIGNsYXNzZXMgY2FuIGdyYWIgaXQgKG90aGVyIGNsYXNzZXMgbWlnaHQgYmUgZGVwZW5kZW50IG9uIHRoZSBjbGFzcykuXG5cdFx0XHRfY2xhc3MgPSBncy5fY2xhc3MgPSBmdW5jdGlvbihucywgZnVuYywgZ2xvYmFsKSB7XG5cdFx0XHRcdGZ1bmMgPSBmdW5jIHx8IGZ1bmN0aW9uKCkge307XG5cdFx0XHRcdF9nc0RlZmluZShucywgW10sIGZ1bmN0aW9uKCl7IHJldHVybiBmdW5jOyB9LCBnbG9iYWwpO1xuXHRcdFx0XHRyZXR1cm4gZnVuYztcblx0XHRcdH07XG5cblx0XHRfZ3NEZWZpbmUuZ2xvYmFscyA9IF9nbG9iYWxzO1xuXG5cblxuLypcbiAqIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAqIEVhc2VcbiAqIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAqL1xuXHRcdHZhciBfYmFzZVBhcmFtcyA9IFswLCAwLCAxLCAxXSxcblx0XHRcdF9ibGFua0FycmF5ID0gW10sXG5cdFx0XHRFYXNlID0gX2NsYXNzKFwiZWFzaW5nLkVhc2VcIiwgZnVuY3Rpb24oZnVuYywgZXh0cmFQYXJhbXMsIHR5cGUsIHBvd2VyKSB7XG5cdFx0XHRcdHRoaXMuX2Z1bmMgPSBmdW5jO1xuXHRcdFx0XHR0aGlzLl90eXBlID0gdHlwZSB8fCAwO1xuXHRcdFx0XHR0aGlzLl9wb3dlciA9IHBvd2VyIHx8IDA7XG5cdFx0XHRcdHRoaXMuX3BhcmFtcyA9IGV4dHJhUGFyYW1zID8gX2Jhc2VQYXJhbXMuY29uY2F0KGV4dHJhUGFyYW1zKSA6IF9iYXNlUGFyYW1zO1xuXHRcdFx0fSwgdHJ1ZSksXG5cdFx0XHRfZWFzZU1hcCA9IEVhc2UubWFwID0ge30sXG5cdFx0XHRfZWFzZVJlZyA9IEVhc2UucmVnaXN0ZXIgPSBmdW5jdGlvbihlYXNlLCBuYW1lcywgdHlwZXMsIGNyZWF0ZSkge1xuXHRcdFx0XHR2YXIgbmEgPSBuYW1lcy5zcGxpdChcIixcIiksXG5cdFx0XHRcdFx0aSA9IG5hLmxlbmd0aCxcblx0XHRcdFx0XHR0YSA9ICh0eXBlcyB8fCBcImVhc2VJbixlYXNlT3V0LGVhc2VJbk91dFwiKS5zcGxpdChcIixcIiksXG5cdFx0XHRcdFx0ZSwgbmFtZSwgaiwgdHlwZTtcblx0XHRcdFx0d2hpbGUgKC0taSA+IC0xKSB7XG5cdFx0XHRcdFx0bmFtZSA9IG5hW2ldO1xuXHRcdFx0XHRcdGUgPSBjcmVhdGUgPyBfY2xhc3MoXCJlYXNpbmcuXCIrbmFtZSwgbnVsbCwgdHJ1ZSkgOiBncy5lYXNpbmdbbmFtZV0gfHwge307XG5cdFx0XHRcdFx0aiA9IHRhLmxlbmd0aDtcblx0XHRcdFx0XHR3aGlsZSAoLS1qID4gLTEpIHtcblx0XHRcdFx0XHRcdHR5cGUgPSB0YVtqXTtcblx0XHRcdFx0XHRcdF9lYXNlTWFwW25hbWUgKyBcIi5cIiArIHR5cGVdID0gX2Vhc2VNYXBbdHlwZSArIG5hbWVdID0gZVt0eXBlXSA9IGVhc2UuZ2V0UmF0aW8gPyBlYXNlIDogZWFzZVt0eXBlXSB8fCBuZXcgZWFzZSgpO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXHRcdFx0fTtcblxuXHRcdHAgPSBFYXNlLnByb3RvdHlwZTtcblx0XHRwLl9jYWxjRW5kID0gZmFsc2U7XG5cdFx0cC5nZXRSYXRpbyA9IGZ1bmN0aW9uKHApIHtcblx0XHRcdGlmICh0aGlzLl9mdW5jKSB7XG5cdFx0XHRcdHRoaXMuX3BhcmFtc1swXSA9IHA7XG5cdFx0XHRcdHJldHVybiB0aGlzLl9mdW5jLmFwcGx5KG51bGwsIHRoaXMuX3BhcmFtcyk7XG5cdFx0XHR9XG5cdFx0XHR2YXIgdCA9IHRoaXMuX3R5cGUsXG5cdFx0XHRcdHB3ID0gdGhpcy5fcG93ZXIsXG5cdFx0XHRcdHIgPSAodCA9PT0gMSkgPyAxIC0gcCA6ICh0ID09PSAyKSA/IHAgOiAocCA8IDAuNSkgPyBwICogMiA6ICgxIC0gcCkgKiAyO1xuXHRcdFx0aWYgKHB3ID09PSAxKSB7XG5cdFx0XHRcdHIgKj0gcjtcblx0XHRcdH0gZWxzZSBpZiAocHcgPT09IDIpIHtcblx0XHRcdFx0ciAqPSByICogcjtcblx0XHRcdH0gZWxzZSBpZiAocHcgPT09IDMpIHtcblx0XHRcdFx0ciAqPSByICogciAqIHI7XG5cdFx0XHR9IGVsc2UgaWYgKHB3ID09PSA0KSB7XG5cdFx0XHRcdHIgKj0gciAqIHIgKiByICogcjtcblx0XHRcdH1cblx0XHRcdHJldHVybiAodCA9PT0gMSkgPyAxIC0gciA6ICh0ID09PSAyKSA/IHIgOiAocCA8IDAuNSkgPyByIC8gMiA6IDEgLSAociAvIDIpO1xuXHRcdH07XG5cblx0XHQvL2NyZWF0ZSBhbGwgdGhlIHN0YW5kYXJkIGVhc2VzIGxpa2UgTGluZWFyLCBRdWFkLCBDdWJpYywgUXVhcnQsIFF1aW50LCBTdHJvbmcsIFBvd2VyMCwgUG93ZXIxLCBQb3dlcjIsIFBvd2VyMywgYW5kIFBvd2VyNCAoZWFjaCB3aXRoIGVhc2VJbiwgZWFzZU91dCwgYW5kIGVhc2VJbk91dClcblx0XHRhID0gW1wiTGluZWFyXCIsXCJRdWFkXCIsXCJDdWJpY1wiLFwiUXVhcnRcIixcIlF1aW50LFN0cm9uZ1wiXTtcblx0XHRpID0gYS5sZW5ndGg7XG5cdFx0d2hpbGUgKC0taSA+IC0xKSB7XG5cdFx0XHRwID0gYVtpXStcIixQb3dlclwiK2k7XG5cdFx0XHRfZWFzZVJlZyhuZXcgRWFzZShudWxsLG51bGwsMSxpKSwgcCwgXCJlYXNlT3V0XCIsIHRydWUpO1xuXHRcdFx0X2Vhc2VSZWcobmV3IEVhc2UobnVsbCxudWxsLDIsaSksIHAsIFwiZWFzZUluXCIgKyAoKGkgPT09IDApID8gXCIsZWFzZU5vbmVcIiA6IFwiXCIpKTtcblx0XHRcdF9lYXNlUmVnKG5ldyBFYXNlKG51bGwsbnVsbCwzLGkpLCBwLCBcImVhc2VJbk91dFwiKTtcblx0XHR9XG5cdFx0X2Vhc2VNYXAubGluZWFyID0gZ3MuZWFzaW5nLkxpbmVhci5lYXNlSW47XG5cdFx0X2Vhc2VNYXAuc3dpbmcgPSBncy5lYXNpbmcuUXVhZC5lYXNlSW5PdXQ7IC8vZm9yIGpRdWVyeSBmb2xrc1xuXG5cbi8qXG4gKiAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gKiBFdmVudERpc3BhdGNoZXJcbiAqIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAqL1xuXHRcdHZhciBFdmVudERpc3BhdGNoZXIgPSBfY2xhc3MoXCJldmVudHMuRXZlbnREaXNwYXRjaGVyXCIsIGZ1bmN0aW9uKHRhcmdldCkge1xuXHRcdFx0dGhpcy5fbGlzdGVuZXJzID0ge307XG5cdFx0XHR0aGlzLl9ldmVudFRhcmdldCA9IHRhcmdldCB8fCB0aGlzO1xuXHRcdH0pO1xuXHRcdHAgPSBFdmVudERpc3BhdGNoZXIucHJvdG90eXBlO1xuXG5cdFx0cC5hZGRFdmVudExpc3RlbmVyID0gZnVuY3Rpb24odHlwZSwgY2FsbGJhY2ssIHNjb3BlLCB1c2VQYXJhbSwgcHJpb3JpdHkpIHtcblx0XHRcdHByaW9yaXR5ID0gcHJpb3JpdHkgfHwgMDtcblx0XHRcdHZhciBsaXN0ID0gdGhpcy5fbGlzdGVuZXJzW3R5cGVdLFxuXHRcdFx0XHRpbmRleCA9IDAsXG5cdFx0XHRcdGxpc3RlbmVyLCBpO1xuXHRcdFx0aWYgKGxpc3QgPT0gbnVsbCkge1xuXHRcdFx0XHR0aGlzLl9saXN0ZW5lcnNbdHlwZV0gPSBsaXN0ID0gW107XG5cdFx0XHR9XG5cdFx0XHRpID0gbGlzdC5sZW5ndGg7XG5cdFx0XHR3aGlsZSAoLS1pID4gLTEpIHtcblx0XHRcdFx0bGlzdGVuZXIgPSBsaXN0W2ldO1xuXHRcdFx0XHRpZiAobGlzdGVuZXIuYyA9PT0gY2FsbGJhY2sgJiYgbGlzdGVuZXIucyA9PT0gc2NvcGUpIHtcblx0XHRcdFx0XHRsaXN0LnNwbGljZShpLCAxKTtcblx0XHRcdFx0fSBlbHNlIGlmIChpbmRleCA9PT0gMCAmJiBsaXN0ZW5lci5wciA8IHByaW9yaXR5KSB7XG5cdFx0XHRcdFx0aW5kZXggPSBpICsgMTtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdFx0bGlzdC5zcGxpY2UoaW5kZXgsIDAsIHtjOmNhbGxiYWNrLCBzOnNjb3BlLCB1cDp1c2VQYXJhbSwgcHI6cHJpb3JpdHl9KTtcblx0XHRcdGlmICh0aGlzID09PSBfdGlja2VyICYmICFfdGlja2VyQWN0aXZlKSB7XG5cdFx0XHRcdF90aWNrZXIud2FrZSgpO1xuXHRcdFx0fVxuXHRcdH07XG5cblx0XHRwLnJlbW92ZUV2ZW50TGlzdGVuZXIgPSBmdW5jdGlvbih0eXBlLCBjYWxsYmFjaykge1xuXHRcdFx0dmFyIGxpc3QgPSB0aGlzLl9saXN0ZW5lcnNbdHlwZV0sIGk7XG5cdFx0XHRpZiAobGlzdCkge1xuXHRcdFx0XHRpID0gbGlzdC5sZW5ndGg7XG5cdFx0XHRcdHdoaWxlICgtLWkgPiAtMSkge1xuXHRcdFx0XHRcdGlmIChsaXN0W2ldLmMgPT09IGNhbGxiYWNrKSB7XG5cdFx0XHRcdFx0XHRsaXN0LnNwbGljZShpLCAxKTtcblx0XHRcdFx0XHRcdHJldHVybjtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9O1xuXG5cdFx0cC5kaXNwYXRjaEV2ZW50ID0gZnVuY3Rpb24odHlwZSkge1xuXHRcdFx0dmFyIGxpc3QgPSB0aGlzLl9saXN0ZW5lcnNbdHlwZV0sXG5cdFx0XHRcdGksIHQsIGxpc3RlbmVyO1xuXHRcdFx0aWYgKGxpc3QpIHtcblx0XHRcdFx0aSA9IGxpc3QubGVuZ3RoO1xuXHRcdFx0XHR0ID0gdGhpcy5fZXZlbnRUYXJnZXQ7XG5cdFx0XHRcdHdoaWxlICgtLWkgPiAtMSkge1xuXHRcdFx0XHRcdGxpc3RlbmVyID0gbGlzdFtpXTtcblx0XHRcdFx0XHRpZiAobGlzdGVuZXIpIHtcblx0XHRcdFx0XHRcdGlmIChsaXN0ZW5lci51cCkge1xuXHRcdFx0XHRcdFx0XHRsaXN0ZW5lci5jLmNhbGwobGlzdGVuZXIucyB8fCB0LCB7dHlwZTp0eXBlLCB0YXJnZXQ6dH0pO1xuXHRcdFx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRcdFx0bGlzdGVuZXIuYy5jYWxsKGxpc3RlbmVyLnMgfHwgdCk7XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fTtcblxuXG4vKlxuICogLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICogVGlja2VyXG4gKiAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gKi9cbiBcdFx0dmFyIF9yZXFBbmltRnJhbWUgPSB3aW5kb3cucmVxdWVzdEFuaW1hdGlvbkZyYW1lLFxuXHRcdFx0X2NhbmNlbEFuaW1GcmFtZSA9IHdpbmRvdy5jYW5jZWxBbmltYXRpb25GcmFtZSxcblx0XHRcdF9nZXRUaW1lID0gRGF0ZS5ub3cgfHwgZnVuY3Rpb24oKSB7cmV0dXJuIG5ldyBEYXRlKCkuZ2V0VGltZSgpO30sXG5cdFx0XHRfbGFzdFVwZGF0ZSA9IF9nZXRUaW1lKCk7XG5cblx0XHQvL25vdyB0cnkgdG8gZGV0ZXJtaW5lIHRoZSByZXF1ZXN0QW5pbWF0aW9uRnJhbWUgYW5kIGNhbmNlbEFuaW1hdGlvbkZyYW1lIGZ1bmN0aW9ucyBhbmQgaWYgbm9uZSBhcmUgZm91bmQsIHdlJ2xsIHVzZSBhIHNldFRpbWVvdXQoKS9jbGVhclRpbWVvdXQoKSBwb2x5ZmlsbC5cblx0XHRhID0gW1wibXNcIixcIm1velwiLFwid2Via2l0XCIsXCJvXCJdO1xuXHRcdGkgPSBhLmxlbmd0aDtcblx0XHR3aGlsZSAoLS1pID4gLTEgJiYgIV9yZXFBbmltRnJhbWUpIHtcblx0XHRcdF9yZXFBbmltRnJhbWUgPSB3aW5kb3dbYVtpXSArIFwiUmVxdWVzdEFuaW1hdGlvbkZyYW1lXCJdO1xuXHRcdFx0X2NhbmNlbEFuaW1GcmFtZSA9IHdpbmRvd1thW2ldICsgXCJDYW5jZWxBbmltYXRpb25GcmFtZVwiXSB8fCB3aW5kb3dbYVtpXSArIFwiQ2FuY2VsUmVxdWVzdEFuaW1hdGlvbkZyYW1lXCJdO1xuXHRcdH1cblxuXHRcdF9jbGFzcyhcIlRpY2tlclwiLCBmdW5jdGlvbihmcHMsIHVzZVJBRikge1xuXHRcdFx0dmFyIF9zZWxmID0gdGhpcyxcblx0XHRcdFx0X3N0YXJ0VGltZSA9IF9nZXRUaW1lKCksXG5cdFx0XHRcdF91c2VSQUYgPSAodXNlUkFGICE9PSBmYWxzZSAmJiBfcmVxQW5pbUZyYW1lKSA/IFwiYXV0b1wiIDogZmFsc2UsXG5cdFx0XHRcdF9sYWdUaHJlc2hvbGQgPSA1MDAsXG5cdFx0XHRcdF9hZGp1c3RlZExhZyA9IDMzLFxuXHRcdFx0XHRfdGlja1dvcmQgPSBcInRpY2tcIiwgLy9oZWxwcyByZWR1Y2UgZ2MgYnVyZGVuXG5cdFx0XHRcdF9mcHMsIF9yZXEsIF9pZCwgX2dhcCwgX25leHRUaW1lLFxuXHRcdFx0XHRfdGljayA9IGZ1bmN0aW9uKG1hbnVhbCkge1xuXHRcdFx0XHRcdHZhciBlbGFwc2VkID0gX2dldFRpbWUoKSAtIF9sYXN0VXBkYXRlLFxuXHRcdFx0XHRcdFx0b3ZlcmxhcCwgZGlzcGF0Y2g7XG5cdFx0XHRcdFx0aWYgKGVsYXBzZWQgPiBfbGFnVGhyZXNob2xkKSB7XG5cdFx0XHRcdFx0XHRfc3RhcnRUaW1lICs9IGVsYXBzZWQgLSBfYWRqdXN0ZWRMYWc7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdF9sYXN0VXBkYXRlICs9IGVsYXBzZWQ7XG5cdFx0XHRcdFx0X3NlbGYudGltZSA9IChfbGFzdFVwZGF0ZSAtIF9zdGFydFRpbWUpIC8gMTAwMDtcblx0XHRcdFx0XHRvdmVybGFwID0gX3NlbGYudGltZSAtIF9uZXh0VGltZTtcblx0XHRcdFx0XHRpZiAoIV9mcHMgfHwgb3ZlcmxhcCA+IDAgfHwgbWFudWFsID09PSB0cnVlKSB7XG5cdFx0XHRcdFx0XHRfc2VsZi5mcmFtZSsrO1xuXHRcdFx0XHRcdFx0X25leHRUaW1lICs9IG92ZXJsYXAgKyAob3ZlcmxhcCA+PSBfZ2FwID8gMC4wMDQgOiBfZ2FwIC0gb3ZlcmxhcCk7XG5cdFx0XHRcdFx0XHRkaXNwYXRjaCA9IHRydWU7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdGlmIChtYW51YWwgIT09IHRydWUpIHsgLy9tYWtlIHN1cmUgdGhlIHJlcXVlc3QgaXMgbWFkZSBiZWZvcmUgd2UgZGlzcGF0Y2ggdGhlIFwidGlja1wiIGV2ZW50IHNvIHRoYXQgdGltaW5nIGlzIG1haW50YWluZWQuIE90aGVyd2lzZSwgaWYgcHJvY2Vzc2luZyB0aGUgXCJ0aWNrXCIgcmVxdWlyZXMgYSBidW5jaCBvZiB0aW1lIChsaWtlIDE1bXMpIGFuZCB3ZSdyZSB1c2luZyBhIHNldFRpbWVvdXQoKSB0aGF0J3MgYmFzZWQgb24gMTYuN21zLCBpdCdkIHRlY2huaWNhbGx5IHRha2UgMzEuN21zIGJldHdlZW4gZnJhbWVzIG90aGVyd2lzZS5cblx0XHRcdFx0XHRcdF9pZCA9IF9yZXEoX3RpY2spO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHRpZiAoZGlzcGF0Y2gpIHtcblx0XHRcdFx0XHRcdF9zZWxmLmRpc3BhdGNoRXZlbnQoX3RpY2tXb3JkKTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH07XG5cblx0XHRcdEV2ZW50RGlzcGF0Y2hlci5jYWxsKF9zZWxmKTtcblx0XHRcdF9zZWxmLnRpbWUgPSBfc2VsZi5mcmFtZSA9IDA7XG5cdFx0XHRfc2VsZi50aWNrID0gZnVuY3Rpb24oKSB7XG5cdFx0XHRcdF90aWNrKHRydWUpO1xuXHRcdFx0fTtcblxuXHRcdFx0X3NlbGYubGFnU21vb3RoaW5nID0gZnVuY3Rpb24odGhyZXNob2xkLCBhZGp1c3RlZExhZykge1xuXHRcdFx0XHRfbGFnVGhyZXNob2xkID0gdGhyZXNob2xkIHx8ICgxIC8gX3RpbnlOdW0pOyAvL3plcm8gc2hvdWxkIGJlIGludGVycHJldGVkIGFzIGJhc2ljYWxseSB1bmxpbWl0ZWRcblx0XHRcdFx0X2FkanVzdGVkTGFnID0gTWF0aC5taW4oYWRqdXN0ZWRMYWcsIF9sYWdUaHJlc2hvbGQsIDApO1xuXHRcdFx0fTtcblxuXHRcdFx0X3NlbGYuc2xlZXAgPSBmdW5jdGlvbigpIHtcblx0XHRcdFx0aWYgKF9pZCA9PSBudWxsKSB7XG5cdFx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0XHR9XG5cdFx0XHRcdGlmICghX3VzZVJBRiB8fCAhX2NhbmNlbEFuaW1GcmFtZSkge1xuXHRcdFx0XHRcdGNsZWFyVGltZW91dChfaWQpO1xuXHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdF9jYW5jZWxBbmltRnJhbWUoX2lkKTtcblx0XHRcdFx0fVxuXHRcdFx0XHRfcmVxID0gX2VtcHR5RnVuYztcblx0XHRcdFx0X2lkID0gbnVsbDtcblx0XHRcdFx0aWYgKF9zZWxmID09PSBfdGlja2VyKSB7XG5cdFx0XHRcdFx0X3RpY2tlckFjdGl2ZSA9IGZhbHNlO1xuXHRcdFx0XHR9XG5cdFx0XHR9O1xuXG5cdFx0XHRfc2VsZi53YWtlID0gZnVuY3Rpb24oc2VhbWxlc3MpIHtcblx0XHRcdFx0aWYgKF9pZCAhPT0gbnVsbCkge1xuXHRcdFx0XHRcdF9zZWxmLnNsZWVwKCk7XG5cdFx0XHRcdH0gZWxzZSBpZiAoc2VhbWxlc3MpIHtcblx0XHRcdFx0XHRfc3RhcnRUaW1lICs9IC1fbGFzdFVwZGF0ZSArIChfbGFzdFVwZGF0ZSA9IF9nZXRUaW1lKCkpO1xuXHRcdFx0XHR9IGVsc2UgaWYgKF9zZWxmLmZyYW1lID4gMTApIHsgLy9kb24ndCB0cmlnZ2VyIGxhZ1Ntb290aGluZyBpZiB3ZSdyZSBqdXN0IHdha2luZyB1cCwgYW5kIG1ha2Ugc3VyZSB0aGF0IGF0IGxlYXN0IDEwIGZyYW1lcyBoYXZlIGVsYXBzZWQgYmVjYXVzZSBvZiB0aGUgaU9TIGJ1ZyB0aGF0IHdlIHdvcmsgYXJvdW5kIGJlbG93IHdpdGggdGhlIDEuNS1zZWNvbmQgc2V0VGltb3V0KCkuXG5cdFx0XHRcdFx0X2xhc3RVcGRhdGUgPSBfZ2V0VGltZSgpIC0gX2xhZ1RocmVzaG9sZCArIDU7XG5cdFx0XHRcdH1cblx0XHRcdFx0X3JlcSA9IChfZnBzID09PSAwKSA/IF9lbXB0eUZ1bmMgOiAoIV91c2VSQUYgfHwgIV9yZXFBbmltRnJhbWUpID8gZnVuY3Rpb24oZikgeyByZXR1cm4gc2V0VGltZW91dChmLCAoKF9uZXh0VGltZSAtIF9zZWxmLnRpbWUpICogMTAwMCArIDEpIHwgMCk7IH0gOiBfcmVxQW5pbUZyYW1lO1xuXHRcdFx0XHRpZiAoX3NlbGYgPT09IF90aWNrZXIpIHtcblx0XHRcdFx0XHRfdGlja2VyQWN0aXZlID0gdHJ1ZTtcblx0XHRcdFx0fVxuXHRcdFx0XHRfdGljaygyKTtcblx0XHRcdH07XG5cblx0XHRcdF9zZWxmLmZwcyA9IGZ1bmN0aW9uKHZhbHVlKSB7XG5cdFx0XHRcdGlmICghYXJndW1lbnRzLmxlbmd0aCkge1xuXHRcdFx0XHRcdHJldHVybiBfZnBzO1xuXHRcdFx0XHR9XG5cdFx0XHRcdF9mcHMgPSB2YWx1ZTtcblx0XHRcdFx0X2dhcCA9IDEgLyAoX2ZwcyB8fCA2MCk7XG5cdFx0XHRcdF9uZXh0VGltZSA9IHRoaXMudGltZSArIF9nYXA7XG5cdFx0XHRcdF9zZWxmLndha2UoKTtcblx0XHRcdH07XG5cblx0XHRcdF9zZWxmLnVzZVJBRiA9IGZ1bmN0aW9uKHZhbHVlKSB7XG5cdFx0XHRcdGlmICghYXJndW1lbnRzLmxlbmd0aCkge1xuXHRcdFx0XHRcdHJldHVybiBfdXNlUkFGO1xuXHRcdFx0XHR9XG5cdFx0XHRcdF9zZWxmLnNsZWVwKCk7XG5cdFx0XHRcdF91c2VSQUYgPSB2YWx1ZTtcblx0XHRcdFx0X3NlbGYuZnBzKF9mcHMpO1xuXHRcdFx0fTtcblx0XHRcdF9zZWxmLmZwcyhmcHMpO1xuXG5cdFx0XHQvL2EgYnVnIGluIGlPUyA2IFNhZmFyaSBvY2Nhc2lvbmFsbHkgcHJldmVudHMgdGhlIHJlcXVlc3RBbmltYXRpb25GcmFtZSBmcm9tIHdvcmtpbmcgaW5pdGlhbGx5LCBzbyB3ZSB1c2UgYSAxLjUtc2Vjb25kIHRpbWVvdXQgdGhhdCBhdXRvbWF0aWNhbGx5IGZhbGxzIGJhY2sgdG8gc2V0VGltZW91dCgpIGlmIGl0IHNlbnNlcyB0aGlzIGNvbmRpdGlvbi5cblx0XHRcdHNldFRpbWVvdXQoZnVuY3Rpb24oKSB7XG5cdFx0XHRcdGlmIChfdXNlUkFGID09PSBcImF1dG9cIiAmJiBfc2VsZi5mcmFtZSA8IDUgJiYgZG9jdW1lbnQudmlzaWJpbGl0eVN0YXRlICE9PSBcImhpZGRlblwiKSB7XG5cdFx0XHRcdFx0X3NlbGYudXNlUkFGKGZhbHNlKTtcblx0XHRcdFx0fVxuXHRcdFx0fSwgMTUwMCk7XG5cdFx0fSk7XG5cblx0XHRwID0gZ3MuVGlja2VyLnByb3RvdHlwZSA9IG5ldyBncy5ldmVudHMuRXZlbnREaXNwYXRjaGVyKCk7XG5cdFx0cC5jb25zdHJ1Y3RvciA9IGdzLlRpY2tlcjtcblxuXG4vKlxuICogLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICogQW5pbWF0aW9uXG4gKiAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gKi9cblx0XHR2YXIgQW5pbWF0aW9uID0gX2NsYXNzKFwiY29yZS5BbmltYXRpb25cIiwgZnVuY3Rpb24oZHVyYXRpb24sIHZhcnMpIHtcblx0XHRcdFx0dGhpcy52YXJzID0gdmFycyA9IHZhcnMgfHwge307XG5cdFx0XHRcdHRoaXMuX2R1cmF0aW9uID0gdGhpcy5fdG90YWxEdXJhdGlvbiA9IGR1cmF0aW9uIHx8IDA7XG5cdFx0XHRcdHRoaXMuX2RlbGF5ID0gTnVtYmVyKHZhcnMuZGVsYXkpIHx8IDA7XG5cdFx0XHRcdHRoaXMuX3RpbWVTY2FsZSA9IDE7XG5cdFx0XHRcdHRoaXMuX2FjdGl2ZSA9ICh2YXJzLmltbWVkaWF0ZVJlbmRlciA9PT0gdHJ1ZSk7XG5cdFx0XHRcdHRoaXMuZGF0YSA9IHZhcnMuZGF0YTtcblx0XHRcdFx0dGhpcy5fcmV2ZXJzZWQgPSAodmFycy5yZXZlcnNlZCA9PT0gdHJ1ZSk7XG5cblx0XHRcdFx0aWYgKCFfcm9vdFRpbWVsaW5lKSB7XG5cdFx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0XHR9XG5cdFx0XHRcdGlmICghX3RpY2tlckFjdGl2ZSkgeyAvL3NvbWUgYnJvd3NlcnMgKGxpa2UgaU9TIDYgU2FmYXJpKSBzaHV0IGRvd24gSmF2YVNjcmlwdCBleGVjdXRpb24gd2hlbiB0aGUgdGFiIGlzIGRpc2FibGVkIGFuZCB0aGV5IFtvY2Nhc2lvbmFsbHldIG5lZ2xlY3QgdG8gc3RhcnQgdXAgcmVxdWVzdEFuaW1hdGlvbkZyYW1lIGFnYWluIHdoZW4gcmV0dXJuaW5nIC0gdGhpcyBjb2RlIGVuc3VyZXMgdGhhdCB0aGUgZW5naW5lIHN0YXJ0cyB1cCBhZ2FpbiBwcm9wZXJseS5cblx0XHRcdFx0XHRfdGlja2VyLndha2UoKTtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdHZhciB0bCA9IHRoaXMudmFycy51c2VGcmFtZXMgPyBfcm9vdEZyYW1lc1RpbWVsaW5lIDogX3Jvb3RUaW1lbGluZTtcblx0XHRcdFx0dGwuYWRkKHRoaXMsIHRsLl90aW1lKTtcblxuXHRcdFx0XHRpZiAodGhpcy52YXJzLnBhdXNlZCkge1xuXHRcdFx0XHRcdHRoaXMucGF1c2VkKHRydWUpO1xuXHRcdFx0XHR9XG5cdFx0XHR9KTtcblxuXHRcdF90aWNrZXIgPSBBbmltYXRpb24udGlja2VyID0gbmV3IGdzLlRpY2tlcigpO1xuXHRcdHAgPSBBbmltYXRpb24ucHJvdG90eXBlO1xuXHRcdHAuX2RpcnR5ID0gcC5fZ2MgPSBwLl9pbml0dGVkID0gcC5fcGF1c2VkID0gZmFsc2U7XG5cdFx0cC5fdG90YWxUaW1lID0gcC5fdGltZSA9IDA7XG5cdFx0cC5fcmF3UHJldlRpbWUgPSAtMTtcblx0XHRwLl9uZXh0ID0gcC5fbGFzdCA9IHAuX29uVXBkYXRlID0gcC5fdGltZWxpbmUgPSBwLnRpbWVsaW5lID0gbnVsbDtcblx0XHRwLl9wYXVzZWQgPSBmYWxzZTtcblxuXG5cdFx0Ly9zb21lIGJyb3dzZXJzIChsaWtlIGlPUykgb2NjYXNpb25hbGx5IGRyb3AgdGhlIHJlcXVlc3RBbmltYXRpb25GcmFtZSBldmVudCB3aGVuIHRoZSB1c2VyIHN3aXRjaGVzIHRvIGEgZGlmZmVyZW50IHRhYiBhbmQgdGhlbiBjb21lcyBiYWNrIGFnYWluLCBzbyB3ZSB1c2UgYSAyLXNlY29uZCBzZXRUaW1lb3V0KCkgdG8gc2Vuc2UgaWYvd2hlbiB0aGF0IGNvbmRpdGlvbiBvY2N1cnMgYW5kIHRoZW4gd2FrZSgpIHRoZSB0aWNrZXIuXG5cdFx0dmFyIF9jaGVja1RpbWVvdXQgPSBmdW5jdGlvbigpIHtcblx0XHRcdFx0aWYgKF90aWNrZXJBY3RpdmUgJiYgX2dldFRpbWUoKSAtIF9sYXN0VXBkYXRlID4gMjAwMCkge1xuXHRcdFx0XHRcdF90aWNrZXIud2FrZSgpO1xuXHRcdFx0XHR9XG5cdFx0XHRcdHNldFRpbWVvdXQoX2NoZWNrVGltZW91dCwgMjAwMCk7XG5cdFx0XHR9O1xuXHRcdF9jaGVja1RpbWVvdXQoKTtcblxuXG5cdFx0cC5wbGF5ID0gZnVuY3Rpb24oZnJvbSwgc3VwcHJlc3NFdmVudHMpIHtcblx0XHRcdGlmIChmcm9tICE9IG51bGwpIHtcblx0XHRcdFx0dGhpcy5zZWVrKGZyb20sIHN1cHByZXNzRXZlbnRzKTtcblx0XHRcdH1cblx0XHRcdHJldHVybiB0aGlzLnJldmVyc2VkKGZhbHNlKS5wYXVzZWQoZmFsc2UpO1xuXHRcdH07XG5cblx0XHRwLnBhdXNlID0gZnVuY3Rpb24oYXRUaW1lLCBzdXBwcmVzc0V2ZW50cykge1xuXHRcdFx0aWYgKGF0VGltZSAhPSBudWxsKSB7XG5cdFx0XHRcdHRoaXMuc2VlayhhdFRpbWUsIHN1cHByZXNzRXZlbnRzKTtcblx0XHRcdH1cblx0XHRcdHJldHVybiB0aGlzLnBhdXNlZCh0cnVlKTtcblx0XHR9O1xuXG5cdFx0cC5yZXN1bWUgPSBmdW5jdGlvbihmcm9tLCBzdXBwcmVzc0V2ZW50cykge1xuXHRcdFx0aWYgKGZyb20gIT0gbnVsbCkge1xuXHRcdFx0XHR0aGlzLnNlZWsoZnJvbSwgc3VwcHJlc3NFdmVudHMpO1xuXHRcdFx0fVxuXHRcdFx0cmV0dXJuIHRoaXMucGF1c2VkKGZhbHNlKTtcblx0XHR9O1xuXG5cdFx0cC5zZWVrID0gZnVuY3Rpb24odGltZSwgc3VwcHJlc3NFdmVudHMpIHtcblx0XHRcdHJldHVybiB0aGlzLnRvdGFsVGltZShOdW1iZXIodGltZSksIHN1cHByZXNzRXZlbnRzICE9PSBmYWxzZSk7XG5cdFx0fTtcblxuXHRcdHAucmVzdGFydCA9IGZ1bmN0aW9uKGluY2x1ZGVEZWxheSwgc3VwcHJlc3NFdmVudHMpIHtcblx0XHRcdHJldHVybiB0aGlzLnJldmVyc2VkKGZhbHNlKS5wYXVzZWQoZmFsc2UpLnRvdGFsVGltZShpbmNsdWRlRGVsYXkgPyAtdGhpcy5fZGVsYXkgOiAwLCAoc3VwcHJlc3NFdmVudHMgIT09IGZhbHNlKSwgdHJ1ZSk7XG5cdFx0fTtcblxuXHRcdHAucmV2ZXJzZSA9IGZ1bmN0aW9uKGZyb20sIHN1cHByZXNzRXZlbnRzKSB7XG5cdFx0XHRpZiAoZnJvbSAhPSBudWxsKSB7XG5cdFx0XHRcdHRoaXMuc2VlaygoZnJvbSB8fCB0aGlzLnRvdGFsRHVyYXRpb24oKSksIHN1cHByZXNzRXZlbnRzKTtcblx0XHRcdH1cblx0XHRcdHJldHVybiB0aGlzLnJldmVyc2VkKHRydWUpLnBhdXNlZChmYWxzZSk7XG5cdFx0fTtcblxuXHRcdHAucmVuZGVyID0gZnVuY3Rpb24odGltZSwgc3VwcHJlc3NFdmVudHMsIGZvcmNlKSB7XG5cdFx0XHQvL3N0dWIgLSB3ZSBvdmVycmlkZSB0aGlzIG1ldGhvZCBpbiBzdWJjbGFzc2VzLlxuXHRcdH07XG5cblx0XHRwLmludmFsaWRhdGUgPSBmdW5jdGlvbigpIHtcblx0XHRcdHRoaXMuX3RpbWUgPSB0aGlzLl90b3RhbFRpbWUgPSAwO1xuXHRcdFx0dGhpcy5faW5pdHRlZCA9IHRoaXMuX2djID0gZmFsc2U7XG5cdFx0XHR0aGlzLl9yYXdQcmV2VGltZSA9IC0xO1xuXHRcdFx0aWYgKHRoaXMuX2djIHx8ICF0aGlzLnRpbWVsaW5lKSB7XG5cdFx0XHRcdHRoaXMuX2VuYWJsZWQodHJ1ZSk7XG5cdFx0XHR9XG5cdFx0XHRyZXR1cm4gdGhpcztcblx0XHR9O1xuXG5cdFx0cC5pc0FjdGl2ZSA9IGZ1bmN0aW9uKCkge1xuXHRcdFx0dmFyIHRsID0gdGhpcy5fdGltZWxpbmUsIC8vdGhlIDIgcm9vdCB0aW1lbGluZXMgd29uJ3QgaGF2ZSBhIF90aW1lbGluZTsgdGhleSdyZSBhbHdheXMgYWN0aXZlLlxuXHRcdFx0XHRzdGFydFRpbWUgPSB0aGlzLl9zdGFydFRpbWUsXG5cdFx0XHRcdHJhd1RpbWU7XG5cdFx0XHRyZXR1cm4gKCF0bCB8fCAoIXRoaXMuX2djICYmICF0aGlzLl9wYXVzZWQgJiYgdGwuaXNBY3RpdmUoKSAmJiAocmF3VGltZSA9IHRsLnJhd1RpbWUoKSkgPj0gc3RhcnRUaW1lICYmIHJhd1RpbWUgPCBzdGFydFRpbWUgKyB0aGlzLnRvdGFsRHVyYXRpb24oKSAvIHRoaXMuX3RpbWVTY2FsZSkpO1xuXHRcdH07XG5cblx0XHRwLl9lbmFibGVkID0gZnVuY3Rpb24gKGVuYWJsZWQsIGlnbm9yZVRpbWVsaW5lKSB7XG5cdFx0XHRpZiAoIV90aWNrZXJBY3RpdmUpIHtcblx0XHRcdFx0X3RpY2tlci53YWtlKCk7XG5cdFx0XHR9XG5cdFx0XHR0aGlzLl9nYyA9ICFlbmFibGVkO1xuXHRcdFx0dGhpcy5fYWN0aXZlID0gdGhpcy5pc0FjdGl2ZSgpO1xuXHRcdFx0aWYgKGlnbm9yZVRpbWVsaW5lICE9PSB0cnVlKSB7XG5cdFx0XHRcdGlmIChlbmFibGVkICYmICF0aGlzLnRpbWVsaW5lKSB7XG5cdFx0XHRcdFx0dGhpcy5fdGltZWxpbmUuYWRkKHRoaXMsIHRoaXMuX3N0YXJ0VGltZSAtIHRoaXMuX2RlbGF5KTtcblx0XHRcdFx0fSBlbHNlIGlmICghZW5hYmxlZCAmJiB0aGlzLnRpbWVsaW5lKSB7XG5cdFx0XHRcdFx0dGhpcy5fdGltZWxpbmUuX3JlbW92ZSh0aGlzLCB0cnVlKTtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdFx0cmV0dXJuIGZhbHNlO1xuXHRcdH07XG5cblxuXHRcdHAuX2tpbGwgPSBmdW5jdGlvbih2YXJzLCB0YXJnZXQpIHtcblx0XHRcdHJldHVybiB0aGlzLl9lbmFibGVkKGZhbHNlLCBmYWxzZSk7XG5cdFx0fTtcblxuXHRcdHAua2lsbCA9IGZ1bmN0aW9uKHZhcnMsIHRhcmdldCkge1xuXHRcdFx0dGhpcy5fa2lsbCh2YXJzLCB0YXJnZXQpO1xuXHRcdFx0cmV0dXJuIHRoaXM7XG5cdFx0fTtcblxuXHRcdHAuX3VuY2FjaGUgPSBmdW5jdGlvbihpbmNsdWRlU2VsZikge1xuXHRcdFx0dmFyIHR3ZWVuID0gaW5jbHVkZVNlbGYgPyB0aGlzIDogdGhpcy50aW1lbGluZTtcblx0XHRcdHdoaWxlICh0d2Vlbikge1xuXHRcdFx0XHR0d2Vlbi5fZGlydHkgPSB0cnVlO1xuXHRcdFx0XHR0d2VlbiA9IHR3ZWVuLnRpbWVsaW5lO1xuXHRcdFx0fVxuXHRcdFx0cmV0dXJuIHRoaXM7XG5cdFx0fTtcblxuXHRcdHAuX3N3YXBTZWxmSW5QYXJhbXMgPSBmdW5jdGlvbihwYXJhbXMpIHtcblx0XHRcdHZhciBpID0gcGFyYW1zLmxlbmd0aCxcblx0XHRcdFx0Y29weSA9IHBhcmFtcy5jb25jYXQoKTtcblx0XHRcdHdoaWxlICgtLWkgPiAtMSkge1xuXHRcdFx0XHRpZiAocGFyYW1zW2ldID09PSBcIntzZWxmfVwiKSB7XG5cdFx0XHRcdFx0Y29weVtpXSA9IHRoaXM7XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHRcdHJldHVybiBjb3B5O1xuXHRcdH07XG5cblx0XHRwLl9jYWxsYmFjayA9IGZ1bmN0aW9uKHR5cGUpIHtcblx0XHRcdHZhciB2ID0gdGhpcy52YXJzO1xuXHRcdFx0dlt0eXBlXS5hcHBseSh2W3R5cGUgKyBcIlNjb3BlXCJdIHx8IHYuY2FsbGJhY2tTY29wZSB8fCB0aGlzLCB2W3R5cGUgKyBcIlBhcmFtc1wiXSB8fCBfYmxhbmtBcnJheSk7XG5cdFx0fTtcblxuLy8tLS0tQW5pbWF0aW9uIGdldHRlcnMvc2V0dGVycyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG5cdFx0cC5ldmVudENhbGxiYWNrID0gZnVuY3Rpb24odHlwZSwgY2FsbGJhY2ssIHBhcmFtcywgc2NvcGUpIHtcblx0XHRcdGlmICgodHlwZSB8fCBcIlwiKS5zdWJzdHIoMCwyKSA9PT0gXCJvblwiKSB7XG5cdFx0XHRcdHZhciB2ID0gdGhpcy52YXJzO1xuXHRcdFx0XHRpZiAoYXJndW1lbnRzLmxlbmd0aCA9PT0gMSkge1xuXHRcdFx0XHRcdHJldHVybiB2W3R5cGVdO1xuXHRcdFx0XHR9XG5cdFx0XHRcdGlmIChjYWxsYmFjayA9PSBudWxsKSB7XG5cdFx0XHRcdFx0ZGVsZXRlIHZbdHlwZV07XG5cdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0dlt0eXBlXSA9IGNhbGxiYWNrO1xuXHRcdFx0XHRcdHZbdHlwZSArIFwiUGFyYW1zXCJdID0gKF9pc0FycmF5KHBhcmFtcykgJiYgcGFyYW1zLmpvaW4oXCJcIikuaW5kZXhPZihcIntzZWxmfVwiKSAhPT0gLTEpID8gdGhpcy5fc3dhcFNlbGZJblBhcmFtcyhwYXJhbXMpIDogcGFyYW1zO1xuXHRcdFx0XHRcdHZbdHlwZSArIFwiU2NvcGVcIl0gPSBzY29wZTtcblx0XHRcdFx0fVxuXHRcdFx0XHRpZiAodHlwZSA9PT0gXCJvblVwZGF0ZVwiKSB7XG5cdFx0XHRcdFx0dGhpcy5fb25VcGRhdGUgPSBjYWxsYmFjaztcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdFx0cmV0dXJuIHRoaXM7XG5cdFx0fTtcblxuXHRcdHAuZGVsYXkgPSBmdW5jdGlvbih2YWx1ZSkge1xuXHRcdFx0aWYgKCFhcmd1bWVudHMubGVuZ3RoKSB7XG5cdFx0XHRcdHJldHVybiB0aGlzLl9kZWxheTtcblx0XHRcdH1cblx0XHRcdGlmICh0aGlzLl90aW1lbGluZS5zbW9vdGhDaGlsZFRpbWluZykge1xuXHRcdFx0XHR0aGlzLnN0YXJ0VGltZSggdGhpcy5fc3RhcnRUaW1lICsgdmFsdWUgLSB0aGlzLl9kZWxheSApO1xuXHRcdFx0fVxuXHRcdFx0dGhpcy5fZGVsYXkgPSB2YWx1ZTtcblx0XHRcdHJldHVybiB0aGlzO1xuXHRcdH07XG5cblx0XHRwLmR1cmF0aW9uID0gZnVuY3Rpb24odmFsdWUpIHtcblx0XHRcdGlmICghYXJndW1lbnRzLmxlbmd0aCkge1xuXHRcdFx0XHR0aGlzLl9kaXJ0eSA9IGZhbHNlO1xuXHRcdFx0XHRyZXR1cm4gdGhpcy5fZHVyYXRpb247XG5cdFx0XHR9XG5cdFx0XHR0aGlzLl9kdXJhdGlvbiA9IHRoaXMuX3RvdGFsRHVyYXRpb24gPSB2YWx1ZTtcblx0XHRcdHRoaXMuX3VuY2FjaGUodHJ1ZSk7IC8vdHJ1ZSBpbiBjYXNlIGl0J3MgYSBUd2Vlbk1heCBvciBUaW1lbGluZU1heCB0aGF0IGhhcyBhIHJlcGVhdCAtIHdlJ2xsIG5lZWQgdG8gcmVmcmVzaCB0aGUgdG90YWxEdXJhdGlvbi5cblx0XHRcdGlmICh0aGlzLl90aW1lbGluZS5zbW9vdGhDaGlsZFRpbWluZykgaWYgKHRoaXMuX3RpbWUgPiAwKSBpZiAodGhpcy5fdGltZSA8IHRoaXMuX2R1cmF0aW9uKSBpZiAodmFsdWUgIT09IDApIHtcblx0XHRcdFx0dGhpcy50b3RhbFRpbWUodGhpcy5fdG90YWxUaW1lICogKHZhbHVlIC8gdGhpcy5fZHVyYXRpb24pLCB0cnVlKTtcblx0XHRcdH1cblx0XHRcdHJldHVybiB0aGlzO1xuXHRcdH07XG5cblx0XHRwLnRvdGFsRHVyYXRpb24gPSBmdW5jdGlvbih2YWx1ZSkge1xuXHRcdFx0dGhpcy5fZGlydHkgPSBmYWxzZTtcblx0XHRcdHJldHVybiAoIWFyZ3VtZW50cy5sZW5ndGgpID8gdGhpcy5fdG90YWxEdXJhdGlvbiA6IHRoaXMuZHVyYXRpb24odmFsdWUpO1xuXHRcdH07XG5cblx0XHRwLnRpbWUgPSBmdW5jdGlvbih2YWx1ZSwgc3VwcHJlc3NFdmVudHMpIHtcblx0XHRcdGlmICghYXJndW1lbnRzLmxlbmd0aCkge1xuXHRcdFx0XHRyZXR1cm4gdGhpcy5fdGltZTtcblx0XHRcdH1cblx0XHRcdGlmICh0aGlzLl9kaXJ0eSkge1xuXHRcdFx0XHR0aGlzLnRvdGFsRHVyYXRpb24oKTtcblx0XHRcdH1cblx0XHRcdHJldHVybiB0aGlzLnRvdGFsVGltZSgodmFsdWUgPiB0aGlzLl9kdXJhdGlvbikgPyB0aGlzLl9kdXJhdGlvbiA6IHZhbHVlLCBzdXBwcmVzc0V2ZW50cyk7XG5cdFx0fTtcblxuXHRcdHAudG90YWxUaW1lID0gZnVuY3Rpb24odGltZSwgc3VwcHJlc3NFdmVudHMsIHVuY2FwcGVkKSB7XG5cdFx0XHRpZiAoIV90aWNrZXJBY3RpdmUpIHtcblx0XHRcdFx0X3RpY2tlci53YWtlKCk7XG5cdFx0XHR9XG5cdFx0XHRpZiAoIWFyZ3VtZW50cy5sZW5ndGgpIHtcblx0XHRcdFx0cmV0dXJuIHRoaXMuX3RvdGFsVGltZTtcblx0XHRcdH1cblx0XHRcdGlmICh0aGlzLl90aW1lbGluZSkge1xuXHRcdFx0XHRpZiAodGltZSA8IDAgJiYgIXVuY2FwcGVkKSB7XG5cdFx0XHRcdFx0dGltZSArPSB0aGlzLnRvdGFsRHVyYXRpb24oKTtcblx0XHRcdFx0fVxuXHRcdFx0XHRpZiAodGhpcy5fdGltZWxpbmUuc21vb3RoQ2hpbGRUaW1pbmcpIHtcblx0XHRcdFx0XHRpZiAodGhpcy5fZGlydHkpIHtcblx0XHRcdFx0XHRcdHRoaXMudG90YWxEdXJhdGlvbigpO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHR2YXIgdG90YWxEdXJhdGlvbiA9IHRoaXMuX3RvdGFsRHVyYXRpb24sXG5cdFx0XHRcdFx0XHR0bCA9IHRoaXMuX3RpbWVsaW5lO1xuXHRcdFx0XHRcdGlmICh0aW1lID4gdG90YWxEdXJhdGlvbiAmJiAhdW5jYXBwZWQpIHtcblx0XHRcdFx0XHRcdHRpbWUgPSB0b3RhbER1cmF0aW9uO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHR0aGlzLl9zdGFydFRpbWUgPSAodGhpcy5fcGF1c2VkID8gdGhpcy5fcGF1c2VUaW1lIDogdGwuX3RpbWUpIC0gKCghdGhpcy5fcmV2ZXJzZWQgPyB0aW1lIDogdG90YWxEdXJhdGlvbiAtIHRpbWUpIC8gdGhpcy5fdGltZVNjYWxlKTtcblx0XHRcdFx0XHRpZiAoIXRsLl9kaXJ0eSkgeyAvL2ZvciBwZXJmb3JtYW5jZSBpbXByb3ZlbWVudC4gSWYgdGhlIHBhcmVudCdzIGNhY2hlIGlzIGFscmVhZHkgZGlydHksIGl0IGFscmVhZHkgdG9vayBjYXJlIG9mIG1hcmtpbmcgdGhlIGFuY2VzdG9ycyBhcyBkaXJ0eSB0b28sIHNvIHNraXAgdGhlIGZ1bmN0aW9uIGNhbGwgaGVyZS5cblx0XHRcdFx0XHRcdHRoaXMuX3VuY2FjaGUoZmFsc2UpO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHQvL2luIGNhc2UgYW55IG9mIHRoZSBhbmNlc3RvciB0aW1lbGluZXMgaGFkIGNvbXBsZXRlZCBidXQgc2hvdWxkIG5vdyBiZSBlbmFibGVkLCB3ZSBzaG91bGQgcmVzZXQgdGhlaXIgdG90YWxUaW1lKCkgd2hpY2ggd2lsbCBhbHNvIGVuc3VyZSB0aGF0IHRoZXkncmUgbGluZWQgdXAgcHJvcGVybHkgYW5kIGVuYWJsZWQuIFNraXAgZm9yIGFuaW1hdGlvbnMgdGhhdCBhcmUgb24gdGhlIHJvb3QgKHdhc3RlZnVsKS4gRXhhbXBsZTogYSBUaW1lbGluZUxpdGUuZXhwb3J0Um9vdCgpIGlzIHBlcmZvcm1lZCB3aGVuIHRoZXJlJ3MgYSBwYXVzZWQgdHdlZW4gb24gdGhlIHJvb3QsIHRoZSBleHBvcnQgd2lsbCBub3QgY29tcGxldGUgdW50aWwgdGhhdCB0d2VlbiBpcyB1bnBhdXNlZCwgYnV0IGltYWdpbmUgYSBjaGlsZCBnZXRzIHJlc3RhcnRlZCBsYXRlciwgYWZ0ZXIgYWxsIFt1bnBhdXNlZF0gdHdlZW5zIGhhdmUgY29tcGxldGVkLiBUaGUgc3RhcnRUaW1lIG9mIHRoYXQgY2hpbGQgd291bGQgZ2V0IHB1c2hlZCBvdXQsIGJ1dCBvbmUgb2YgdGhlIGFuY2VzdG9ycyBtYXkgaGF2ZSBjb21wbGV0ZWQuXG5cdFx0XHRcdFx0aWYgKHRsLl90aW1lbGluZSkge1xuXHRcdFx0XHRcdFx0d2hpbGUgKHRsLl90aW1lbGluZSkge1xuXHRcdFx0XHRcdFx0XHRpZiAodGwuX3RpbWVsaW5lLl90aW1lICE9PSAodGwuX3N0YXJ0VGltZSArIHRsLl90b3RhbFRpbWUpIC8gdGwuX3RpbWVTY2FsZSkge1xuXHRcdFx0XHRcdFx0XHRcdHRsLnRvdGFsVGltZSh0bC5fdG90YWxUaW1lLCB0cnVlKTtcblx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0XHR0bCA9IHRsLl90aW1lbGluZTtcblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblx0XHRcdFx0aWYgKHRoaXMuX2djKSB7XG5cdFx0XHRcdFx0dGhpcy5fZW5hYmxlZCh0cnVlLCBmYWxzZSk7XG5cdFx0XHRcdH1cblx0XHRcdFx0aWYgKHRoaXMuX3RvdGFsVGltZSAhPT0gdGltZSB8fCB0aGlzLl9kdXJhdGlvbiA9PT0gMCkge1xuXHRcdFx0XHRcdGlmIChfbGF6eVR3ZWVucy5sZW5ndGgpIHtcblx0XHRcdFx0XHRcdF9sYXp5UmVuZGVyKCk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdHRoaXMucmVuZGVyKHRpbWUsIHN1cHByZXNzRXZlbnRzLCBmYWxzZSk7XG5cdFx0XHRcdFx0aWYgKF9sYXp5VHdlZW5zLmxlbmd0aCkgeyAvL2luIGNhc2UgcmVuZGVyaW5nIGNhdXNlZCBhbnkgdHdlZW5zIHRvIGxhenktaW5pdCwgd2Ugc2hvdWxkIHJlbmRlciB0aGVtIGJlY2F1c2UgdHlwaWNhbGx5IHdoZW4gc29tZW9uZSBjYWxscyBzZWVrKCkgb3IgdGltZSgpIG9yIHByb2dyZXNzKCksIHRoZXkgZXhwZWN0IGFuIGltbWVkaWF0ZSByZW5kZXIuXG5cdFx0XHRcdFx0XHRfbGF6eVJlbmRlcigpO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdFx0cmV0dXJuIHRoaXM7XG5cdFx0fTtcblxuXHRcdHAucHJvZ3Jlc3MgPSBwLnRvdGFsUHJvZ3Jlc3MgPSBmdW5jdGlvbih2YWx1ZSwgc3VwcHJlc3NFdmVudHMpIHtcblx0XHRcdHZhciBkdXJhdGlvbiA9IHRoaXMuZHVyYXRpb24oKTtcblx0XHRcdHJldHVybiAoIWFyZ3VtZW50cy5sZW5ndGgpID8gKGR1cmF0aW9uID8gdGhpcy5fdGltZSAvIGR1cmF0aW9uIDogdGhpcy5yYXRpbykgOiB0aGlzLnRvdGFsVGltZShkdXJhdGlvbiAqIHZhbHVlLCBzdXBwcmVzc0V2ZW50cyk7XG5cdFx0fTtcblxuXHRcdHAuc3RhcnRUaW1lID0gZnVuY3Rpb24odmFsdWUpIHtcblx0XHRcdGlmICghYXJndW1lbnRzLmxlbmd0aCkge1xuXHRcdFx0XHRyZXR1cm4gdGhpcy5fc3RhcnRUaW1lO1xuXHRcdFx0fVxuXHRcdFx0aWYgKHZhbHVlICE9PSB0aGlzLl9zdGFydFRpbWUpIHtcblx0XHRcdFx0dGhpcy5fc3RhcnRUaW1lID0gdmFsdWU7XG5cdFx0XHRcdGlmICh0aGlzLnRpbWVsaW5lKSBpZiAodGhpcy50aW1lbGluZS5fc29ydENoaWxkcmVuKSB7XG5cdFx0XHRcdFx0dGhpcy50aW1lbGluZS5hZGQodGhpcywgdmFsdWUgLSB0aGlzLl9kZWxheSk7IC8vZW5zdXJlcyB0aGF0IGFueSBuZWNlc3NhcnkgcmUtc2VxdWVuY2luZyBvZiBBbmltYXRpb25zIGluIHRoZSB0aW1lbGluZSBvY2N1cnMgdG8gbWFrZSBzdXJlIHRoZSByZW5kZXJpbmcgb3JkZXIgaXMgY29ycmVjdC5cblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdFx0cmV0dXJuIHRoaXM7XG5cdFx0fTtcblxuXHRcdHAuZW5kVGltZSA9IGZ1bmN0aW9uKGluY2x1ZGVSZXBlYXRzKSB7XG5cdFx0XHRyZXR1cm4gdGhpcy5fc3RhcnRUaW1lICsgKChpbmNsdWRlUmVwZWF0cyAhPSBmYWxzZSkgPyB0aGlzLnRvdGFsRHVyYXRpb24oKSA6IHRoaXMuZHVyYXRpb24oKSkgLyB0aGlzLl90aW1lU2NhbGU7XG5cdFx0fTtcblxuXHRcdHAudGltZVNjYWxlID0gZnVuY3Rpb24odmFsdWUpIHtcblx0XHRcdGlmICghYXJndW1lbnRzLmxlbmd0aCkge1xuXHRcdFx0XHRyZXR1cm4gdGhpcy5fdGltZVNjYWxlO1xuXHRcdFx0fVxuXHRcdFx0dmFsdWUgPSB2YWx1ZSB8fCBfdGlueU51bTsgLy9jYW4ndCBhbGxvdyB6ZXJvIGJlY2F1c2UgaXQnbGwgdGhyb3cgdGhlIG1hdGggb2ZmXG5cdFx0XHRpZiAodGhpcy5fdGltZWxpbmUgJiYgdGhpcy5fdGltZWxpbmUuc21vb3RoQ2hpbGRUaW1pbmcpIHtcblx0XHRcdFx0dmFyIHBhdXNlVGltZSA9IHRoaXMuX3BhdXNlVGltZSxcblx0XHRcdFx0XHR0ID0gKHBhdXNlVGltZSB8fCBwYXVzZVRpbWUgPT09IDApID8gcGF1c2VUaW1lIDogdGhpcy5fdGltZWxpbmUudG90YWxUaW1lKCk7XG5cdFx0XHRcdHRoaXMuX3N0YXJ0VGltZSA9IHQgLSAoKHQgLSB0aGlzLl9zdGFydFRpbWUpICogdGhpcy5fdGltZVNjYWxlIC8gdmFsdWUpO1xuXHRcdFx0fVxuXHRcdFx0dGhpcy5fdGltZVNjYWxlID0gdmFsdWU7XG5cdFx0XHRyZXR1cm4gdGhpcy5fdW5jYWNoZShmYWxzZSk7XG5cdFx0fTtcblxuXHRcdHAucmV2ZXJzZWQgPSBmdW5jdGlvbih2YWx1ZSkge1xuXHRcdFx0aWYgKCFhcmd1bWVudHMubGVuZ3RoKSB7XG5cdFx0XHRcdHJldHVybiB0aGlzLl9yZXZlcnNlZDtcblx0XHRcdH1cblx0XHRcdGlmICh2YWx1ZSAhPSB0aGlzLl9yZXZlcnNlZCkge1xuXHRcdFx0XHR0aGlzLl9yZXZlcnNlZCA9IHZhbHVlO1xuXHRcdFx0XHR0aGlzLnRvdGFsVGltZSgoKHRoaXMuX3RpbWVsaW5lICYmICF0aGlzLl90aW1lbGluZS5zbW9vdGhDaGlsZFRpbWluZykgPyB0aGlzLnRvdGFsRHVyYXRpb24oKSAtIHRoaXMuX3RvdGFsVGltZSA6IHRoaXMuX3RvdGFsVGltZSksIHRydWUpO1xuXHRcdFx0fVxuXHRcdFx0cmV0dXJuIHRoaXM7XG5cdFx0fTtcblxuXHRcdHAucGF1c2VkID0gZnVuY3Rpb24odmFsdWUpIHtcblx0XHRcdGlmICghYXJndW1lbnRzLmxlbmd0aCkge1xuXHRcdFx0XHRyZXR1cm4gdGhpcy5fcGF1c2VkO1xuXHRcdFx0fVxuXHRcdFx0dmFyIHRsID0gdGhpcy5fdGltZWxpbmUsXG5cdFx0XHRcdHJhdywgZWxhcHNlZDtcblx0XHRcdGlmICh2YWx1ZSAhPSB0aGlzLl9wYXVzZWQpIGlmICh0bCkge1xuXHRcdFx0XHRpZiAoIV90aWNrZXJBY3RpdmUgJiYgIXZhbHVlKSB7XG5cdFx0XHRcdFx0X3RpY2tlci53YWtlKCk7XG5cdFx0XHRcdH1cblx0XHRcdFx0cmF3ID0gdGwucmF3VGltZSgpO1xuXHRcdFx0XHRlbGFwc2VkID0gcmF3IC0gdGhpcy5fcGF1c2VUaW1lO1xuXHRcdFx0XHRpZiAoIXZhbHVlICYmIHRsLnNtb290aENoaWxkVGltaW5nKSB7XG5cdFx0XHRcdFx0dGhpcy5fc3RhcnRUaW1lICs9IGVsYXBzZWQ7XG5cdFx0XHRcdFx0dGhpcy5fdW5jYWNoZShmYWxzZSk7XG5cdFx0XHRcdH1cblx0XHRcdFx0dGhpcy5fcGF1c2VUaW1lID0gdmFsdWUgPyByYXcgOiBudWxsO1xuXHRcdFx0XHR0aGlzLl9wYXVzZWQgPSB2YWx1ZTtcblx0XHRcdFx0dGhpcy5fYWN0aXZlID0gdGhpcy5pc0FjdGl2ZSgpO1xuXHRcdFx0XHRpZiAoIXZhbHVlICYmIGVsYXBzZWQgIT09IDAgJiYgdGhpcy5faW5pdHRlZCAmJiB0aGlzLmR1cmF0aW9uKCkpIHtcblx0XHRcdFx0XHRyYXcgPSB0bC5zbW9vdGhDaGlsZFRpbWluZyA/IHRoaXMuX3RvdGFsVGltZSA6IChyYXcgLSB0aGlzLl9zdGFydFRpbWUpIC8gdGhpcy5fdGltZVNjYWxlO1xuXHRcdFx0XHRcdHRoaXMucmVuZGVyKHJhdywgKHJhdyA9PT0gdGhpcy5fdG90YWxUaW1lKSwgdHJ1ZSk7IC8vaW4gY2FzZSB0aGUgdGFyZ2V0J3MgcHJvcGVydGllcyBjaGFuZ2VkIHZpYSBzb21lIG90aGVyIHR3ZWVuIG9yIG1hbnVhbCB1cGRhdGUgYnkgdGhlIHVzZXIsIHdlIHNob3VsZCBmb3JjZSBhIHJlbmRlci5cblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdFx0aWYgKHRoaXMuX2djICYmICF2YWx1ZSkge1xuXHRcdFx0XHR0aGlzLl9lbmFibGVkKHRydWUsIGZhbHNlKTtcblx0XHRcdH1cblx0XHRcdHJldHVybiB0aGlzO1xuXHRcdH07XG5cblxuLypcbiAqIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAqIFNpbXBsZVRpbWVsaW5lXG4gKiAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gKi9cblx0XHR2YXIgU2ltcGxlVGltZWxpbmUgPSBfY2xhc3MoXCJjb3JlLlNpbXBsZVRpbWVsaW5lXCIsIGZ1bmN0aW9uKHZhcnMpIHtcblx0XHRcdEFuaW1hdGlvbi5jYWxsKHRoaXMsIDAsIHZhcnMpO1xuXHRcdFx0dGhpcy5hdXRvUmVtb3ZlQ2hpbGRyZW4gPSB0aGlzLnNtb290aENoaWxkVGltaW5nID0gdHJ1ZTtcblx0XHR9KTtcblxuXHRcdHAgPSBTaW1wbGVUaW1lbGluZS5wcm90b3R5cGUgPSBuZXcgQW5pbWF0aW9uKCk7XG5cdFx0cC5jb25zdHJ1Y3RvciA9IFNpbXBsZVRpbWVsaW5lO1xuXHRcdHAua2lsbCgpLl9nYyA9IGZhbHNlO1xuXHRcdHAuX2ZpcnN0ID0gcC5fbGFzdCA9IHAuX3JlY2VudCA9IG51bGw7XG5cdFx0cC5fc29ydENoaWxkcmVuID0gZmFsc2U7XG5cblx0XHRwLmFkZCA9IHAuaW5zZXJ0ID0gZnVuY3Rpb24oY2hpbGQsIHBvc2l0aW9uLCBhbGlnbiwgc3RhZ2dlcikge1xuXHRcdFx0dmFyIHByZXZUd2Vlbiwgc3Q7XG5cdFx0XHRjaGlsZC5fc3RhcnRUaW1lID0gTnVtYmVyKHBvc2l0aW9uIHx8IDApICsgY2hpbGQuX2RlbGF5O1xuXHRcdFx0aWYgKGNoaWxkLl9wYXVzZWQpIGlmICh0aGlzICE9PSBjaGlsZC5fdGltZWxpbmUpIHsgLy93ZSBvbmx5IGFkanVzdCB0aGUgX3BhdXNlVGltZSBpZiBpdCB3YXNuJ3QgaW4gdGhpcyB0aW1lbGluZSBhbHJlYWR5LiBSZW1lbWJlciwgc29tZXRpbWVzIGEgdHdlZW4gd2lsbCBiZSBpbnNlcnRlZCBhZ2FpbiBpbnRvIHRoZSBzYW1lIHRpbWVsaW5lIHdoZW4gaXRzIHN0YXJ0VGltZSBpcyBjaGFuZ2VkIHNvIHRoYXQgdGhlIHR3ZWVucyBpbiB0aGUgVGltZWxpbmVMaXRlL01heCBhcmUgcmUtb3JkZXJlZCBwcm9wZXJseSBpbiB0aGUgbGlua2VkIGxpc3QgKHNvIGV2ZXJ5dGhpbmcgcmVuZGVycyBpbiB0aGUgcHJvcGVyIG9yZGVyKS5cblx0XHRcdFx0Y2hpbGQuX3BhdXNlVGltZSA9IGNoaWxkLl9zdGFydFRpbWUgKyAoKHRoaXMucmF3VGltZSgpIC0gY2hpbGQuX3N0YXJ0VGltZSkgLyBjaGlsZC5fdGltZVNjYWxlKTtcblx0XHRcdH1cblx0XHRcdGlmIChjaGlsZC50aW1lbGluZSkge1xuXHRcdFx0XHRjaGlsZC50aW1lbGluZS5fcmVtb3ZlKGNoaWxkLCB0cnVlKTsgLy9yZW1vdmVzIGZyb20gZXhpc3RpbmcgdGltZWxpbmUgc28gdGhhdCBpdCBjYW4gYmUgcHJvcGVybHkgYWRkZWQgdG8gdGhpcyBvbmUuXG5cdFx0XHR9XG5cdFx0XHRjaGlsZC50aW1lbGluZSA9IGNoaWxkLl90aW1lbGluZSA9IHRoaXM7XG5cdFx0XHRpZiAoY2hpbGQuX2djKSB7XG5cdFx0XHRcdGNoaWxkLl9lbmFibGVkKHRydWUsIHRydWUpO1xuXHRcdFx0fVxuXHRcdFx0cHJldlR3ZWVuID0gdGhpcy5fbGFzdDtcblx0XHRcdGlmICh0aGlzLl9zb3J0Q2hpbGRyZW4pIHtcblx0XHRcdFx0c3QgPSBjaGlsZC5fc3RhcnRUaW1lO1xuXHRcdFx0XHR3aGlsZSAocHJldlR3ZWVuICYmIHByZXZUd2Vlbi5fc3RhcnRUaW1lID4gc3QpIHtcblx0XHRcdFx0XHRwcmV2VHdlZW4gPSBwcmV2VHdlZW4uX3ByZXY7XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHRcdGlmIChwcmV2VHdlZW4pIHtcblx0XHRcdFx0Y2hpbGQuX25leHQgPSBwcmV2VHdlZW4uX25leHQ7XG5cdFx0XHRcdHByZXZUd2Vlbi5fbmV4dCA9IGNoaWxkO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0Y2hpbGQuX25leHQgPSB0aGlzLl9maXJzdDtcblx0XHRcdFx0dGhpcy5fZmlyc3QgPSBjaGlsZDtcblx0XHRcdH1cblx0XHRcdGlmIChjaGlsZC5fbmV4dCkge1xuXHRcdFx0XHRjaGlsZC5fbmV4dC5fcHJldiA9IGNoaWxkO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0dGhpcy5fbGFzdCA9IGNoaWxkO1xuXHRcdFx0fVxuXHRcdFx0Y2hpbGQuX3ByZXYgPSBwcmV2VHdlZW47XG5cdFx0XHR0aGlzLl9yZWNlbnQgPSBjaGlsZDtcblx0XHRcdGlmICh0aGlzLl90aW1lbGluZSkge1xuXHRcdFx0XHR0aGlzLl91bmNhY2hlKHRydWUpO1xuXHRcdFx0fVxuXHRcdFx0cmV0dXJuIHRoaXM7XG5cdFx0fTtcblxuXHRcdHAuX3JlbW92ZSA9IGZ1bmN0aW9uKHR3ZWVuLCBza2lwRGlzYWJsZSkge1xuXHRcdFx0aWYgKHR3ZWVuLnRpbWVsaW5lID09PSB0aGlzKSB7XG5cdFx0XHRcdGlmICghc2tpcERpc2FibGUpIHtcblx0XHRcdFx0XHR0d2Vlbi5fZW5hYmxlZChmYWxzZSwgdHJ1ZSk7XG5cdFx0XHRcdH1cblxuXHRcdFx0XHRpZiAodHdlZW4uX3ByZXYpIHtcblx0XHRcdFx0XHR0d2Vlbi5fcHJldi5fbmV4dCA9IHR3ZWVuLl9uZXh0O1xuXHRcdFx0XHR9IGVsc2UgaWYgKHRoaXMuX2ZpcnN0ID09PSB0d2Vlbikge1xuXHRcdFx0XHRcdHRoaXMuX2ZpcnN0ID0gdHdlZW4uX25leHQ7XG5cdFx0XHRcdH1cblx0XHRcdFx0aWYgKHR3ZWVuLl9uZXh0KSB7XG5cdFx0XHRcdFx0dHdlZW4uX25leHQuX3ByZXYgPSB0d2Vlbi5fcHJldjtcblx0XHRcdFx0fSBlbHNlIGlmICh0aGlzLl9sYXN0ID09PSB0d2Vlbikge1xuXHRcdFx0XHRcdHRoaXMuX2xhc3QgPSB0d2Vlbi5fcHJldjtcblx0XHRcdFx0fVxuXHRcdFx0XHR0d2Vlbi5fbmV4dCA9IHR3ZWVuLl9wcmV2ID0gdHdlZW4udGltZWxpbmUgPSBudWxsO1xuXHRcdFx0XHRpZiAodHdlZW4gPT09IHRoaXMuX3JlY2VudCkge1xuXHRcdFx0XHRcdHRoaXMuX3JlY2VudCA9IHRoaXMuX2xhc3Q7XG5cdFx0XHRcdH1cblxuXHRcdFx0XHRpZiAodGhpcy5fdGltZWxpbmUpIHtcblx0XHRcdFx0XHR0aGlzLl91bmNhY2hlKHRydWUpO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0XHRyZXR1cm4gdGhpcztcblx0XHR9O1xuXG5cdFx0cC5yZW5kZXIgPSBmdW5jdGlvbih0aW1lLCBzdXBwcmVzc0V2ZW50cywgZm9yY2UpIHtcblx0XHRcdHZhciB0d2VlbiA9IHRoaXMuX2ZpcnN0LFxuXHRcdFx0XHRuZXh0O1xuXHRcdFx0dGhpcy5fdG90YWxUaW1lID0gdGhpcy5fdGltZSA9IHRoaXMuX3Jhd1ByZXZUaW1lID0gdGltZTtcblx0XHRcdHdoaWxlICh0d2Vlbikge1xuXHRcdFx0XHRuZXh0ID0gdHdlZW4uX25leHQ7IC8vcmVjb3JkIGl0IGhlcmUgYmVjYXVzZSB0aGUgdmFsdWUgY291bGQgY2hhbmdlIGFmdGVyIHJlbmRlcmluZy4uLlxuXHRcdFx0XHRpZiAodHdlZW4uX2FjdGl2ZSB8fCAodGltZSA+PSB0d2Vlbi5fc3RhcnRUaW1lICYmICF0d2Vlbi5fcGF1c2VkKSkge1xuXHRcdFx0XHRcdGlmICghdHdlZW4uX3JldmVyc2VkKSB7XG5cdFx0XHRcdFx0XHR0d2Vlbi5yZW5kZXIoKHRpbWUgLSB0d2Vlbi5fc3RhcnRUaW1lKSAqIHR3ZWVuLl90aW1lU2NhbGUsIHN1cHByZXNzRXZlbnRzLCBmb3JjZSk7XG5cdFx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRcdHR3ZWVuLnJlbmRlcigoKCF0d2Vlbi5fZGlydHkpID8gdHdlZW4uX3RvdGFsRHVyYXRpb24gOiB0d2Vlbi50b3RhbER1cmF0aW9uKCkpIC0gKCh0aW1lIC0gdHdlZW4uX3N0YXJ0VGltZSkgKiB0d2Vlbi5fdGltZVNjYWxlKSwgc3VwcHJlc3NFdmVudHMsIGZvcmNlKTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblx0XHRcdFx0dHdlZW4gPSBuZXh0O1xuXHRcdFx0fVxuXHRcdH07XG5cblx0XHRwLnJhd1RpbWUgPSBmdW5jdGlvbigpIHtcblx0XHRcdGlmICghX3RpY2tlckFjdGl2ZSkge1xuXHRcdFx0XHRfdGlja2VyLndha2UoKTtcblx0XHRcdH1cblx0XHRcdHJldHVybiB0aGlzLl90b3RhbFRpbWU7XG5cdFx0fTtcblxuLypcbiAqIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAqIFR3ZWVuTGl0ZVxuICogLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICovXG5cdFx0dmFyIFR3ZWVuTGl0ZSA9IF9jbGFzcyhcIlR3ZWVuTGl0ZVwiLCBmdW5jdGlvbih0YXJnZXQsIGR1cmF0aW9uLCB2YXJzKSB7XG5cdFx0XHRcdEFuaW1hdGlvbi5jYWxsKHRoaXMsIGR1cmF0aW9uLCB2YXJzKTtcblx0XHRcdFx0dGhpcy5yZW5kZXIgPSBUd2VlbkxpdGUucHJvdG90eXBlLnJlbmRlcjsgLy9zcGVlZCBvcHRpbWl6YXRpb24gKGF2b2lkIHByb3RvdHlwZSBsb29rdXAgb24gdGhpcyBcImhvdFwiIG1ldGhvZClcblxuXHRcdFx0XHRpZiAodGFyZ2V0ID09IG51bGwpIHtcblx0XHRcdFx0XHR0aHJvdyBcIkNhbm5vdCB0d2VlbiBhIG51bGwgdGFyZ2V0LlwiO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0dGhpcy50YXJnZXQgPSB0YXJnZXQgPSAodHlwZW9mKHRhcmdldCkgIT09IFwic3RyaW5nXCIpID8gdGFyZ2V0IDogVHdlZW5MaXRlLnNlbGVjdG9yKHRhcmdldCkgfHwgdGFyZ2V0O1xuXG5cdFx0XHRcdHZhciBpc1NlbGVjdG9yID0gKHRhcmdldC5qcXVlcnkgfHwgKHRhcmdldC5sZW5ndGggJiYgdGFyZ2V0ICE9PSB3aW5kb3cgJiYgdGFyZ2V0WzBdICYmICh0YXJnZXRbMF0gPT09IHdpbmRvdyB8fCAodGFyZ2V0WzBdLm5vZGVUeXBlICYmIHRhcmdldFswXS5zdHlsZSAmJiAhdGFyZ2V0Lm5vZGVUeXBlKSkpKSxcblx0XHRcdFx0XHRvdmVyd3JpdGUgPSB0aGlzLnZhcnMub3ZlcndyaXRlLFxuXHRcdFx0XHRcdGksIHRhcmcsIHRhcmdldHM7XG5cblx0XHRcdFx0dGhpcy5fb3ZlcndyaXRlID0gb3ZlcndyaXRlID0gKG92ZXJ3cml0ZSA9PSBudWxsKSA/IF9vdmVyd3JpdGVMb29rdXBbVHdlZW5MaXRlLmRlZmF1bHRPdmVyd3JpdGVdIDogKHR5cGVvZihvdmVyd3JpdGUpID09PSBcIm51bWJlclwiKSA/IG92ZXJ3cml0ZSA+PiAwIDogX292ZXJ3cml0ZUxvb2t1cFtvdmVyd3JpdGVdO1xuXG5cdFx0XHRcdGlmICgoaXNTZWxlY3RvciB8fCB0YXJnZXQgaW5zdGFuY2VvZiBBcnJheSB8fCAodGFyZ2V0LnB1c2ggJiYgX2lzQXJyYXkodGFyZ2V0KSkpICYmIHR5cGVvZih0YXJnZXRbMF0pICE9PSBcIm51bWJlclwiKSB7XG5cdFx0XHRcdFx0dGhpcy5fdGFyZ2V0cyA9IHRhcmdldHMgPSBfc2xpY2UodGFyZ2V0KTsgIC8vZG9uJ3QgdXNlIEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKHRhcmdldCwgMCkgYmVjYXVzZSB0aGF0IGRvZXNuJ3Qgd29yayBpbiBJRTggd2l0aCBhIE5vZGVMaXN0IHRoYXQncyByZXR1cm5lZCBieSBxdWVyeVNlbGVjdG9yQWxsKClcblx0XHRcdFx0XHR0aGlzLl9wcm9wTG9va3VwID0gW107XG5cdFx0XHRcdFx0dGhpcy5fc2libGluZ3MgPSBbXTtcblx0XHRcdFx0XHRmb3IgKGkgPSAwOyBpIDwgdGFyZ2V0cy5sZW5ndGg7IGkrKykge1xuXHRcdFx0XHRcdFx0dGFyZyA9IHRhcmdldHNbaV07XG5cdFx0XHRcdFx0XHRpZiAoIXRhcmcpIHtcblx0XHRcdFx0XHRcdFx0dGFyZ2V0cy5zcGxpY2UoaS0tLCAxKTtcblx0XHRcdFx0XHRcdFx0Y29udGludWU7XG5cdFx0XHRcdFx0XHR9IGVsc2UgaWYgKHR5cGVvZih0YXJnKSA9PT0gXCJzdHJpbmdcIikge1xuXHRcdFx0XHRcdFx0XHR0YXJnID0gdGFyZ2V0c1tpLS1dID0gVHdlZW5MaXRlLnNlbGVjdG9yKHRhcmcpOyAvL2luIGNhc2UgaXQncyBhbiBhcnJheSBvZiBzdHJpbmdzXG5cdFx0XHRcdFx0XHRcdGlmICh0eXBlb2YodGFyZykgPT09IFwic3RyaW5nXCIpIHtcblx0XHRcdFx0XHRcdFx0XHR0YXJnZXRzLnNwbGljZShpKzEsIDEpOyAvL3RvIGF2b2lkIGFuIGVuZGxlc3MgbG9vcCAoY2FuJ3QgaW1hZ2luZSB3aHkgdGhlIHNlbGVjdG9yIHdvdWxkIHJldHVybiBhIHN0cmluZywgYnV0IGp1c3QgaW4gY2FzZSlcblx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0XHRjb250aW51ZTtcblx0XHRcdFx0XHRcdH0gZWxzZSBpZiAodGFyZy5sZW5ndGggJiYgdGFyZyAhPT0gd2luZG93ICYmIHRhcmdbMF0gJiYgKHRhcmdbMF0gPT09IHdpbmRvdyB8fCAodGFyZ1swXS5ub2RlVHlwZSAmJiB0YXJnWzBdLnN0eWxlICYmICF0YXJnLm5vZGVUeXBlKSkpIHsgLy9pbiBjYXNlIHRoZSB1c2VyIGlzIHBhc3NpbmcgaW4gYW4gYXJyYXkgb2Ygc2VsZWN0b3Igb2JqZWN0cyAobGlrZSBqUXVlcnkgb2JqZWN0cyksIHdlIG5lZWQgdG8gY2hlY2sgb25lIG1vcmUgbGV2ZWwgYW5kIHB1bGwgdGhpbmdzIG91dCBpZiBuZWNlc3NhcnkuIEFsc28gbm90ZSB0aGF0IDxzZWxlY3Q+IGVsZW1lbnRzIHBhc3MgYWxsIHRoZSBjcml0ZXJpYSByZWdhcmRpbmcgbGVuZ3RoIGFuZCB0aGUgZmlyc3QgY2hpbGQgaGF2aW5nIHN0eWxlLCBzbyB3ZSBtdXN0IGFsc28gY2hlY2sgdG8gZW5zdXJlIHRoZSB0YXJnZXQgaXNuJ3QgYW4gSFRNTCBub2RlIGl0c2VsZi5cblx0XHRcdFx0XHRcdFx0dGFyZ2V0cy5zcGxpY2UoaS0tLCAxKTtcblx0XHRcdFx0XHRcdFx0dGhpcy5fdGFyZ2V0cyA9IHRhcmdldHMgPSB0YXJnZXRzLmNvbmNhdChfc2xpY2UodGFyZykpO1xuXHRcdFx0XHRcdFx0XHRjb250aW51ZTtcblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdHRoaXMuX3NpYmxpbmdzW2ldID0gX3JlZ2lzdGVyKHRhcmcsIHRoaXMsIGZhbHNlKTtcblx0XHRcdFx0XHRcdGlmIChvdmVyd3JpdGUgPT09IDEpIGlmICh0aGlzLl9zaWJsaW5nc1tpXS5sZW5ndGggPiAxKSB7XG5cdFx0XHRcdFx0XHRcdF9hcHBseU92ZXJ3cml0ZSh0YXJnLCB0aGlzLCBudWxsLCAxLCB0aGlzLl9zaWJsaW5nc1tpXSk7XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0fVxuXG5cdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0dGhpcy5fcHJvcExvb2t1cCA9IHt9O1xuXHRcdFx0XHRcdHRoaXMuX3NpYmxpbmdzID0gX3JlZ2lzdGVyKHRhcmdldCwgdGhpcywgZmFsc2UpO1xuXHRcdFx0XHRcdGlmIChvdmVyd3JpdGUgPT09IDEpIGlmICh0aGlzLl9zaWJsaW5ncy5sZW5ndGggPiAxKSB7XG5cdFx0XHRcdFx0XHRfYXBwbHlPdmVyd3JpdGUodGFyZ2V0LCB0aGlzLCBudWxsLCAxLCB0aGlzLl9zaWJsaW5ncyk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cdFx0XHRcdGlmICh0aGlzLnZhcnMuaW1tZWRpYXRlUmVuZGVyIHx8IChkdXJhdGlvbiA9PT0gMCAmJiB0aGlzLl9kZWxheSA9PT0gMCAmJiB0aGlzLnZhcnMuaW1tZWRpYXRlUmVuZGVyICE9PSBmYWxzZSkpIHtcblx0XHRcdFx0XHR0aGlzLl90aW1lID0gLV90aW55TnVtOyAvL2ZvcmNlcyBhIHJlbmRlciB3aXRob3V0IGhhdmluZyB0byBzZXQgdGhlIHJlbmRlcigpIFwiZm9yY2VcIiBwYXJhbWV0ZXIgdG8gdHJ1ZSBiZWNhdXNlIHdlIHdhbnQgdG8gYWxsb3cgbGF6eWluZyBieSBkZWZhdWx0ICh1c2luZyB0aGUgXCJmb3JjZVwiIHBhcmFtZXRlciBhbHdheXMgZm9yY2VzIGFuIGltbWVkaWF0ZSBmdWxsIHJlbmRlcilcblx0XHRcdFx0XHR0aGlzLnJlbmRlcigtdGhpcy5fZGVsYXkpO1xuXHRcdFx0XHR9XG5cdFx0XHR9LCB0cnVlKSxcblx0XHRcdF9pc1NlbGVjdG9yID0gZnVuY3Rpb24odikge1xuXHRcdFx0XHRyZXR1cm4gKHYgJiYgdi5sZW5ndGggJiYgdiAhPT0gd2luZG93ICYmIHZbMF0gJiYgKHZbMF0gPT09IHdpbmRvdyB8fCAodlswXS5ub2RlVHlwZSAmJiB2WzBdLnN0eWxlICYmICF2Lm5vZGVUeXBlKSkpOyAvL3dlIGNhbm5vdCBjaGVjayBcIm5vZGVUeXBlXCIgaWYgdGhlIHRhcmdldCBpcyB3aW5kb3cgZnJvbSB3aXRoaW4gYW4gaWZyYW1lLCBvdGhlcndpc2UgaXQgd2lsbCB0cmlnZ2VyIGEgc2VjdXJpdHkgZXJyb3IgaW4gc29tZSBicm93c2VycyBsaWtlIEZpcmVmb3guXG5cdFx0XHR9LFxuXHRcdFx0X2F1dG9DU1MgPSBmdW5jdGlvbih2YXJzLCB0YXJnZXQpIHtcblx0XHRcdFx0dmFyIGNzcyA9IHt9LFxuXHRcdFx0XHRcdHA7XG5cdFx0XHRcdGZvciAocCBpbiB2YXJzKSB7XG5cdFx0XHRcdFx0aWYgKCFfcmVzZXJ2ZWRQcm9wc1twXSAmJiAoIShwIGluIHRhcmdldCkgfHwgcCA9PT0gXCJ0cmFuc2Zvcm1cIiB8fCBwID09PSBcInhcIiB8fCBwID09PSBcInlcIiB8fCBwID09PSBcIndpZHRoXCIgfHwgcCA9PT0gXCJoZWlnaHRcIiB8fCBwID09PSBcImNsYXNzTmFtZVwiIHx8IHAgPT09IFwiYm9yZGVyXCIpICYmICghX3BsdWdpbnNbcF0gfHwgKF9wbHVnaW5zW3BdICYmIF9wbHVnaW5zW3BdLl9hdXRvQ1NTKSkpIHsgLy9ub3RlOiA8aW1nPiBlbGVtZW50cyBjb250YWluIHJlYWQtb25seSBcInhcIiBhbmQgXCJ5XCIgcHJvcGVydGllcy4gV2Ugc2hvdWxkIGFsc28gcHJpb3JpdGl6ZSBlZGl0aW5nIGNzcyB3aWR0aC9oZWlnaHQgcmF0aGVyIHRoYW4gdGhlIGVsZW1lbnQncyBwcm9wZXJ0aWVzLlxuXHRcdFx0XHRcdFx0Y3NzW3BdID0gdmFyc1twXTtcblx0XHRcdFx0XHRcdGRlbGV0ZSB2YXJzW3BdO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXHRcdFx0XHR2YXJzLmNzcyA9IGNzcztcblx0XHRcdH07XG5cblx0XHRwID0gVHdlZW5MaXRlLnByb3RvdHlwZSA9IG5ldyBBbmltYXRpb24oKTtcblx0XHRwLmNvbnN0cnVjdG9yID0gVHdlZW5MaXRlO1xuXHRcdHAua2lsbCgpLl9nYyA9IGZhbHNlO1xuXG4vLy0tLS1Ud2VlbkxpdGUgZGVmYXVsdHMsIG92ZXJ3cml0ZSBtYW5hZ2VtZW50LCBhbmQgcm9vdCB1cGRhdGVzIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblxuXHRcdHAucmF0aW8gPSAwO1xuXHRcdHAuX2ZpcnN0UFQgPSBwLl90YXJnZXRzID0gcC5fb3ZlcndyaXR0ZW5Qcm9wcyA9IHAuX3N0YXJ0QXQgPSBudWxsO1xuXHRcdHAuX25vdGlmeVBsdWdpbnNPZkVuYWJsZWQgPSBwLl9sYXp5ID0gZmFsc2U7XG5cblx0XHRUd2VlbkxpdGUudmVyc2lvbiA9IFwiMS4xOC4yXCI7XG5cdFx0VHdlZW5MaXRlLmRlZmF1bHRFYXNlID0gcC5fZWFzZSA9IG5ldyBFYXNlKG51bGwsIG51bGwsIDEsIDEpO1xuXHRcdFR3ZWVuTGl0ZS5kZWZhdWx0T3ZlcndyaXRlID0gXCJhdXRvXCI7XG5cdFx0VHdlZW5MaXRlLnRpY2tlciA9IF90aWNrZXI7XG5cdFx0VHdlZW5MaXRlLmF1dG9TbGVlcCA9IDEyMDtcblx0XHRUd2VlbkxpdGUubGFnU21vb3RoaW5nID0gZnVuY3Rpb24odGhyZXNob2xkLCBhZGp1c3RlZExhZykge1xuXHRcdFx0X3RpY2tlci5sYWdTbW9vdGhpbmcodGhyZXNob2xkLCBhZGp1c3RlZExhZyk7XG5cdFx0fTtcblxuXHRcdFR3ZWVuTGl0ZS5zZWxlY3RvciA9IHdpbmRvdy4kIHx8IHdpbmRvdy5qUXVlcnkgfHwgZnVuY3Rpb24oZSkge1xuXHRcdFx0dmFyIHNlbGVjdG9yID0gd2luZG93LiQgfHwgd2luZG93LmpRdWVyeTtcblx0XHRcdGlmIChzZWxlY3Rvcikge1xuXHRcdFx0XHRUd2VlbkxpdGUuc2VsZWN0b3IgPSBzZWxlY3Rvcjtcblx0XHRcdFx0cmV0dXJuIHNlbGVjdG9yKGUpO1xuXHRcdFx0fVxuXHRcdFx0cmV0dXJuICh0eXBlb2YoZG9jdW1lbnQpID09PSBcInVuZGVmaW5lZFwiKSA/IGUgOiAoZG9jdW1lbnQucXVlcnlTZWxlY3RvckFsbCA/IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3JBbGwoZSkgOiBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgoZS5jaGFyQXQoMCkgPT09IFwiI1wiKSA/IGUuc3Vic3RyKDEpIDogZSkpO1xuXHRcdH07XG5cblx0XHR2YXIgX2xhenlUd2VlbnMgPSBbXSxcblx0XHRcdF9sYXp5TG9va3VwID0ge30sXG5cdFx0XHRfbnVtYmVyc0V4cCA9IC8oPzooLXwtPXxcXCs9KT9cXGQqXFwuP1xcZCooPzplW1xcLStdP1xcZCspPylbMC05XS9pZyxcblx0XHRcdC8vX25vbk51bWJlcnNFeHAgPSAvKD86KFtcXC0rXSg/IShcXGR8PSkpKXxbXlxcZFxcLSs9ZV18KGUoPyFbXFwtK11bXFxkXSkpKSsvaWcsXG5cdFx0XHRfc2V0UmF0aW8gPSBmdW5jdGlvbih2KSB7XG5cdFx0XHRcdHZhciBwdCA9IHRoaXMuX2ZpcnN0UFQsXG5cdFx0XHRcdFx0bWluID0gMC4wMDAwMDEsXG5cdFx0XHRcdFx0dmFsO1xuXHRcdFx0XHR3aGlsZSAocHQpIHtcblx0XHRcdFx0XHR2YWwgPSAhcHQuYmxvYiA/IHB0LmMgKiB2ICsgcHQucyA6IHYgPyB0aGlzLmpvaW4oXCJcIikgOiB0aGlzLnN0YXJ0O1xuXHRcdFx0XHRcdGlmIChwdC5yKSB7XG5cdFx0XHRcdFx0XHR2YWwgPSBNYXRoLnJvdW5kKHZhbCk7XG5cdFx0XHRcdFx0fSBlbHNlIGlmICh2YWwgPCBtaW4pIGlmICh2YWwgPiAtbWluKSB7IC8vcHJldmVudHMgaXNzdWVzIHdpdGggY29udmVydGluZyB2ZXJ5IHNtYWxsIG51bWJlcnMgdG8gc3RyaW5ncyBpbiB0aGUgYnJvd3NlclxuXHRcdFx0XHRcdFx0dmFsID0gMDtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0aWYgKCFwdC5mKSB7XG5cdFx0XHRcdFx0XHRwdC50W3B0LnBdID0gdmFsO1xuXHRcdFx0XHRcdH0gZWxzZSBpZiAocHQuZnApIHtcblx0XHRcdFx0XHRcdHB0LnRbcHQucF0ocHQuZnAsIHZhbCk7XG5cdFx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRcdHB0LnRbcHQucF0odmFsKTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0cHQgPSBwdC5fbmV4dDtcblx0XHRcdFx0fVxuXHRcdFx0fSxcblx0XHRcdC8vY29tcGFyZXMgdHdvIHN0cmluZ3MgKHN0YXJ0L2VuZCksIGZpbmRzIHRoZSBudW1iZXJzIHRoYXQgYXJlIGRpZmZlcmVudCBhbmQgc3BpdHMgYmFjayBhbiBhcnJheSByZXByZXNlbnRpbmcgdGhlIHdob2xlIHZhbHVlIGJ1dCB3aXRoIHRoZSBjaGFuZ2luZyB2YWx1ZXMgaXNvbGF0ZWQgYXMgZWxlbWVudHMuIEZvciBleGFtcGxlLCBcInJnYigwLDAsMClcIiBhbmQgXCJyZ2IoMTAwLDUwLDApXCIgd291bGQgYmVjb21lIFtcInJnYihcIiwgMCwgXCIsXCIsIDUwLCBcIiwwKVwiXS4gTm90aWNlIGl0IG1lcmdlcyB0aGUgcGFydHMgdGhhdCBhcmUgaWRlbnRpY2FsIChwZXJmb3JtYW5jZSBvcHRpbWl6YXRpb24pLiBUaGUgYXJyYXkgYWxzbyBoYXMgYSBsaW5rZWQgbGlzdCBvZiBQcm9wVHdlZW5zIGF0dGFjaGVkIHN0YXJ0aW5nIHdpdGggX2ZpcnN0UFQgdGhhdCBjb250YWluIHRoZSB0d2VlbmluZyBkYXRhICh0LCBwLCBzLCBjLCBmLCBldGMuKS4gSXQgYWxzbyBzdG9yZXMgdGhlIHN0YXJ0aW5nIHZhbHVlIGFzIGEgXCJzdGFydFwiIHByb3BlcnR5IHNvIHRoYXQgd2UgY2FuIHJldmVydCB0byBpdCBpZi93aGVuIG5lY2Vzc2FyeSwgbGlrZSB3aGVuIGEgdHdlZW4gcmV3aW5kcyBmdWxseS4gSWYgdGhlIHF1YW50aXR5IG9mIG51bWJlcnMgZGlmZmVycyBiZXR3ZWVuIHRoZSBzdGFydCBhbmQgZW5kLCBpdCB3aWxsIGFsd2F5cyBwcmlvcml0aXplIHRoZSBlbmQgdmFsdWUocykuIFRoZSBwdCBwYXJhbWV0ZXIgaXMgb3B0aW9uYWwgLSBpdCdzIGZvciBhIFByb3BUd2VlbiB0aGF0IHdpbGwgYmUgYXBwZW5kZWQgdG8gdGhlIGVuZCBvZiB0aGUgbGlua2VkIGxpc3QgYW5kIGlzIHR5cGljYWxseSBmb3IgYWN0dWFsbHkgc2V0dGluZyB0aGUgdmFsdWUgYWZ0ZXIgYWxsIG9mIHRoZSBlbGVtZW50cyBoYXZlIGJlZW4gdXBkYXRlZCAod2l0aCBhcnJheS5qb2luKFwiXCIpKS5cblx0XHRcdF9ibG9iRGlmID0gZnVuY3Rpb24oc3RhcnQsIGVuZCwgZmlsdGVyLCBwdCkge1xuXHRcdFx0XHR2YXIgYSA9IFtzdGFydCwgZW5kXSxcblx0XHRcdFx0XHRjaGFySW5kZXggPSAwLFxuXHRcdFx0XHRcdHMgPSBcIlwiLFxuXHRcdFx0XHRcdGNvbG9yID0gMCxcblx0XHRcdFx0XHRzdGFydE51bXMsIGVuZE51bXMsIG51bSwgaSwgbCwgbm9uTnVtYmVycywgY3VycmVudE51bTtcblx0XHRcdFx0YS5zdGFydCA9IHN0YXJ0O1xuXHRcdFx0XHRpZiAoZmlsdGVyKSB7XG5cdFx0XHRcdFx0ZmlsdGVyKGEpOyAvL3Bhc3MgYW4gYXJyYXkgd2l0aCB0aGUgc3RhcnRpbmcgYW5kIGVuZGluZyB2YWx1ZXMgYW5kIGxldCB0aGUgZmlsdGVyIGRvIHdoYXRldmVyIGl0IG5lZWRzIHRvIHRoZSB2YWx1ZXMuXG5cdFx0XHRcdFx0c3RhcnQgPSBhWzBdO1xuXHRcdFx0XHRcdGVuZCA9IGFbMV07XG5cdFx0XHRcdH1cblx0XHRcdFx0YS5sZW5ndGggPSAwO1xuXHRcdFx0XHRzdGFydE51bXMgPSBzdGFydC5tYXRjaChfbnVtYmVyc0V4cCkgfHwgW107XG5cdFx0XHRcdGVuZE51bXMgPSBlbmQubWF0Y2goX251bWJlcnNFeHApIHx8IFtdO1xuXHRcdFx0XHRpZiAocHQpIHtcblx0XHRcdFx0XHRwdC5fbmV4dCA9IG51bGw7XG5cdFx0XHRcdFx0cHQuYmxvYiA9IDE7XG5cdFx0XHRcdFx0YS5fZmlyc3RQVCA9IHB0OyAvL2FwcGx5IGxhc3QgaW4gdGhlIGxpbmtlZCBsaXN0ICh3aGljaCBtZWFucyBpbnNlcnRpbmcgaXQgZmlyc3QpXG5cdFx0XHRcdH1cblx0XHRcdFx0bCA9IGVuZE51bXMubGVuZ3RoO1xuXHRcdFx0XHRmb3IgKGkgPSAwOyBpIDwgbDsgaSsrKSB7XG5cdFx0XHRcdFx0Y3VycmVudE51bSA9IGVuZE51bXNbaV07XG5cdFx0XHRcdFx0bm9uTnVtYmVycyA9IGVuZC5zdWJzdHIoY2hhckluZGV4LCBlbmQuaW5kZXhPZihjdXJyZW50TnVtLCBjaGFySW5kZXgpLWNoYXJJbmRleCk7XG5cdFx0XHRcdFx0cyArPSAobm9uTnVtYmVycyB8fCAhaSkgPyBub25OdW1iZXJzIDogXCIsXCI7IC8vbm90ZTogU1ZHIHNwZWMgYWxsb3dzIG9taXNzaW9uIG9mIGNvbW1hL3NwYWNlIHdoZW4gYSBuZWdhdGl2ZSBzaWduIGlzIHdlZGdlZCBiZXR3ZWVuIHR3byBudW1iZXJzLCBsaWtlIDIuNS01LjMgaW5zdGVhZCBvZiAyLjUsLTUuMyBidXQgd2hlbiB0d2VlbmluZywgdGhlIG5lZ2F0aXZlIHZhbHVlIG1heSBzd2l0Y2ggdG8gcG9zaXRpdmUsIHNvIHdlIGluc2VydCB0aGUgY29tbWEganVzdCBpbiBjYXNlLlxuXHRcdFx0XHRcdGNoYXJJbmRleCArPSBub25OdW1iZXJzLmxlbmd0aDtcblx0XHRcdFx0XHRpZiAoY29sb3IpIHsgLy9zZW5zZSByZ2JhKCkgdmFsdWVzIGFuZCByb3VuZCB0aGVtLlxuXHRcdFx0XHRcdFx0Y29sb3IgPSAoY29sb3IgKyAxKSAlIDU7XG5cdFx0XHRcdFx0fSBlbHNlIGlmIChub25OdW1iZXJzLnN1YnN0cigtNSkgPT09IFwicmdiYShcIikge1xuXHRcdFx0XHRcdFx0Y29sb3IgPSAxO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHRpZiAoY3VycmVudE51bSA9PT0gc3RhcnROdW1zW2ldIHx8IHN0YXJ0TnVtcy5sZW5ndGggPD0gaSkge1xuXHRcdFx0XHRcdFx0cyArPSBjdXJyZW50TnVtO1xuXHRcdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0XHRpZiAocykge1xuXHRcdFx0XHRcdFx0XHRhLnB1c2gocyk7XG5cdFx0XHRcdFx0XHRcdHMgPSBcIlwiO1xuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0bnVtID0gcGFyc2VGbG9hdChzdGFydE51bXNbaV0pO1xuXHRcdFx0XHRcdFx0YS5wdXNoKG51bSk7XG5cdFx0XHRcdFx0XHRhLl9maXJzdFBUID0ge19uZXh0OiBhLl9maXJzdFBULCB0OmEsIHA6IGEubGVuZ3RoLTEsIHM6bnVtLCBjOigoY3VycmVudE51bS5jaGFyQXQoMSkgPT09IFwiPVwiKSA/IHBhcnNlSW50KGN1cnJlbnROdW0uY2hhckF0KDApICsgXCIxXCIsIDEwKSAqIHBhcnNlRmxvYXQoY3VycmVudE51bS5zdWJzdHIoMikpIDogKHBhcnNlRmxvYXQoY3VycmVudE51bSkgLSBudW0pKSB8fCAwLCBmOjAsIHI6KGNvbG9yICYmIGNvbG9yIDwgNCl9O1xuXHRcdFx0XHRcdFx0Ly9ub3RlOiB3ZSBkb24ndCBzZXQgX3ByZXYgYmVjYXVzZSB3ZSdsbCBuZXZlciBuZWVkIHRvIHJlbW92ZSBpbmRpdmlkdWFsIFByb3BUd2VlbnMgZnJvbSB0aGlzIGxpc3QuXG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdGNoYXJJbmRleCArPSBjdXJyZW50TnVtLmxlbmd0aDtcblx0XHRcdFx0fVxuXHRcdFx0XHRzICs9IGVuZC5zdWJzdHIoY2hhckluZGV4KTtcblx0XHRcdFx0aWYgKHMpIHtcblx0XHRcdFx0XHRhLnB1c2gocyk7XG5cdFx0XHRcdH1cblx0XHRcdFx0YS5zZXRSYXRpbyA9IF9zZXRSYXRpbztcblx0XHRcdFx0cmV0dXJuIGE7XG5cdFx0XHR9LFxuXHRcdFx0Ly9ub3RlOiBcImZ1bmNQYXJhbVwiIGlzIG9ubHkgbmVjZXNzYXJ5IGZvciBmdW5jdGlvbi1iYXNlZCBnZXR0ZXJzL3NldHRlcnMgdGhhdCByZXF1aXJlIGFuIGV4dHJhIHBhcmFtZXRlciBsaWtlIGdldEF0dHJpYnV0ZShcIndpZHRoXCIpIGFuZCBzZXRBdHRyaWJ1dGUoXCJ3aWR0aFwiLCB2YWx1ZSkuIEluIHRoaXMgZXhhbXBsZSwgZnVuY1BhcmFtIHdvdWxkIGJlIFwid2lkdGhcIi4gVXNlZCBieSBBdHRyUGx1Z2luIGZvciBleGFtcGxlLlxuXHRcdFx0X2FkZFByb3BUd2VlbiA9IGZ1bmN0aW9uKHRhcmdldCwgcHJvcCwgc3RhcnQsIGVuZCwgb3ZlcndyaXRlUHJvcCwgcm91bmQsIGZ1bmNQYXJhbSwgc3RyaW5nRmlsdGVyKSB7XG5cdFx0XHRcdHZhciBzID0gKHN0YXJ0ID09PSBcImdldFwiKSA/IHRhcmdldFtwcm9wXSA6IHN0YXJ0LFxuXHRcdFx0XHRcdHR5cGUgPSB0eXBlb2YodGFyZ2V0W3Byb3BdKSxcblx0XHRcdFx0XHRpc1JlbGF0aXZlID0gKHR5cGVvZihlbmQpID09PSBcInN0cmluZ1wiICYmIGVuZC5jaGFyQXQoMSkgPT09IFwiPVwiKSxcblx0XHRcdFx0XHRwdCA9IHt0OnRhcmdldCwgcDpwcm9wLCBzOnMsIGY6KHR5cGUgPT09IFwiZnVuY3Rpb25cIiksIHBnOjAsIG46b3ZlcndyaXRlUHJvcCB8fCBwcm9wLCByOnJvdW5kLCBwcjowLCBjOmlzUmVsYXRpdmUgPyBwYXJzZUludChlbmQuY2hhckF0KDApICsgXCIxXCIsIDEwKSAqIHBhcnNlRmxvYXQoZW5kLnN1YnN0cigyKSkgOiAocGFyc2VGbG9hdChlbmQpIC0gcykgfHwgMH0sXG5cdFx0XHRcdFx0YmxvYiwgZ2V0dGVyTmFtZTtcblx0XHRcdFx0aWYgKHR5cGUgIT09IFwibnVtYmVyXCIpIHtcblx0XHRcdFx0XHRpZiAodHlwZSA9PT0gXCJmdW5jdGlvblwiICYmIHN0YXJ0ID09PSBcImdldFwiKSB7XG5cdFx0XHRcdFx0XHRnZXR0ZXJOYW1lID0gKChwcm9wLmluZGV4T2YoXCJzZXRcIikgfHwgdHlwZW9mKHRhcmdldFtcImdldFwiICsgcHJvcC5zdWJzdHIoMyldKSAhPT0gXCJmdW5jdGlvblwiKSA/IHByb3AgOiBcImdldFwiICsgcHJvcC5zdWJzdHIoMykpO1xuXHRcdFx0XHRcdFx0cHQucyA9IHMgPSBmdW5jUGFyYW0gPyB0YXJnZXRbZ2V0dGVyTmFtZV0oZnVuY1BhcmFtKSA6IHRhcmdldFtnZXR0ZXJOYW1lXSgpO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHRpZiAodHlwZW9mKHMpID09PSBcInN0cmluZ1wiICYmIChmdW5jUGFyYW0gfHwgaXNOYU4ocykpKSB7XG5cdFx0XHRcdFx0XHQvL2EgYmxvYiAoc3RyaW5nIHRoYXQgaGFzIG11bHRpcGxlIG51bWJlcnMgaW4gaXQpXG5cdFx0XHRcdFx0XHRwdC5mcCA9IGZ1bmNQYXJhbTtcblx0XHRcdFx0XHRcdGJsb2IgPSBfYmxvYkRpZihzLCBlbmQsIHN0cmluZ0ZpbHRlciB8fCBUd2VlbkxpdGUuZGVmYXVsdFN0cmluZ0ZpbHRlciwgcHQpO1xuXHRcdFx0XHRcdFx0cHQgPSB7dDpibG9iLCBwOlwic2V0UmF0aW9cIiwgczowLCBjOjEsIGY6MiwgcGc6MCwgbjpvdmVyd3JpdGVQcm9wIHx8IHByb3AsIHByOjB9OyAvL1wiMlwiIGluZGljYXRlcyBpdCdzIGEgQmxvYiBwcm9wZXJ0eSB0d2Vlbi4gTmVlZGVkIGZvciBSb3VuZFByb3BzUGx1Z2luIGZvciBleGFtcGxlLlxuXHRcdFx0XHRcdH0gZWxzZSBpZiAoIWlzUmVsYXRpdmUpIHtcblx0XHRcdFx0XHRcdHB0LnMgPSBwYXJzZUZsb2F0KHMpO1xuXHRcdFx0XHRcdFx0cHQuYyA9IChwYXJzZUZsb2F0KGVuZCkgLSBwdC5zKSB8fCAwO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXHRcdFx0XHRpZiAocHQuYykgeyAvL29ubHkgYWRkIGl0IHRvIHRoZSBsaW5rZWQgbGlzdCBpZiB0aGVyZSdzIGEgY2hhbmdlLlxuXHRcdFx0XHRcdGlmICgocHQuX25leHQgPSB0aGlzLl9maXJzdFBUKSkge1xuXHRcdFx0XHRcdFx0cHQuX25leHQuX3ByZXYgPSBwdDtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0dGhpcy5fZmlyc3RQVCA9IHB0O1xuXHRcdFx0XHRcdHJldHVybiBwdDtcblx0XHRcdFx0fVxuXHRcdFx0fSxcblx0XHRcdF9pbnRlcm5hbHMgPSBUd2VlbkxpdGUuX2ludGVybmFscyA9IHtpc0FycmF5Ol9pc0FycmF5LCBpc1NlbGVjdG9yOl9pc1NlbGVjdG9yLCBsYXp5VHdlZW5zOl9sYXp5VHdlZW5zLCBibG9iRGlmOl9ibG9iRGlmfSwgLy9naXZlcyB1cyBhIHdheSB0byBleHBvc2UgY2VydGFpbiBwcml2YXRlIHZhbHVlcyB0byBvdGhlciBHcmVlblNvY2sgY2xhc3NlcyB3aXRob3V0IGNvbnRhbWluYXRpbmcgdGhhIG1haW4gVHdlZW5MaXRlIG9iamVjdC5cblx0XHRcdF9wbHVnaW5zID0gVHdlZW5MaXRlLl9wbHVnaW5zID0ge30sXG5cdFx0XHRfdHdlZW5Mb29rdXAgPSBfaW50ZXJuYWxzLnR3ZWVuTG9va3VwID0ge30sXG5cdFx0XHRfdHdlZW5Mb29rdXBOdW0gPSAwLFxuXHRcdFx0X3Jlc2VydmVkUHJvcHMgPSBfaW50ZXJuYWxzLnJlc2VydmVkUHJvcHMgPSB7ZWFzZToxLCBkZWxheToxLCBvdmVyd3JpdGU6MSwgb25Db21wbGV0ZToxLCBvbkNvbXBsZXRlUGFyYW1zOjEsIG9uQ29tcGxldGVTY29wZToxLCB1c2VGcmFtZXM6MSwgcnVuQmFja3dhcmRzOjEsIHN0YXJ0QXQ6MSwgb25VcGRhdGU6MSwgb25VcGRhdGVQYXJhbXM6MSwgb25VcGRhdGVTY29wZToxLCBvblN0YXJ0OjEsIG9uU3RhcnRQYXJhbXM6MSwgb25TdGFydFNjb3BlOjEsIG9uUmV2ZXJzZUNvbXBsZXRlOjEsIG9uUmV2ZXJzZUNvbXBsZXRlUGFyYW1zOjEsIG9uUmV2ZXJzZUNvbXBsZXRlU2NvcGU6MSwgb25SZXBlYXQ6MSwgb25SZXBlYXRQYXJhbXM6MSwgb25SZXBlYXRTY29wZToxLCBlYXNlUGFyYW1zOjEsIHlveW86MSwgaW1tZWRpYXRlUmVuZGVyOjEsIHJlcGVhdDoxLCByZXBlYXREZWxheToxLCBkYXRhOjEsIHBhdXNlZDoxLCByZXZlcnNlZDoxLCBhdXRvQ1NTOjEsIGxhenk6MSwgb25PdmVyd3JpdGU6MSwgY2FsbGJhY2tTY29wZToxLCBzdHJpbmdGaWx0ZXI6MX0sXG5cdFx0XHRfb3ZlcndyaXRlTG9va3VwID0ge25vbmU6MCwgYWxsOjEsIGF1dG86MiwgY29uY3VycmVudDozLCBhbGxPblN0YXJ0OjQsIHByZWV4aXN0aW5nOjUsIFwidHJ1ZVwiOjEsIFwiZmFsc2VcIjowfSxcblx0XHRcdF9yb290RnJhbWVzVGltZWxpbmUgPSBBbmltYXRpb24uX3Jvb3RGcmFtZXNUaW1lbGluZSA9IG5ldyBTaW1wbGVUaW1lbGluZSgpLFxuXHRcdFx0X3Jvb3RUaW1lbGluZSA9IEFuaW1hdGlvbi5fcm9vdFRpbWVsaW5lID0gbmV3IFNpbXBsZVRpbWVsaW5lKCksXG5cdFx0XHRfbmV4dEdDRnJhbWUgPSAzMCxcblx0XHRcdF9sYXp5UmVuZGVyID0gX2ludGVybmFscy5sYXp5UmVuZGVyID0gZnVuY3Rpb24oKSB7XG5cdFx0XHRcdHZhciBpID0gX2xhenlUd2VlbnMubGVuZ3RoLFxuXHRcdFx0XHRcdHR3ZWVuO1xuXHRcdFx0XHRfbGF6eUxvb2t1cCA9IHt9O1xuXHRcdFx0XHR3aGlsZSAoLS1pID4gLTEpIHtcblx0XHRcdFx0XHR0d2VlbiA9IF9sYXp5VHdlZW5zW2ldO1xuXHRcdFx0XHRcdGlmICh0d2VlbiAmJiB0d2Vlbi5fbGF6eSAhPT0gZmFsc2UpIHtcblx0XHRcdFx0XHRcdHR3ZWVuLnJlbmRlcih0d2Vlbi5fbGF6eVswXSwgdHdlZW4uX2xhenlbMV0sIHRydWUpO1xuXHRcdFx0XHRcdFx0dHdlZW4uX2xhenkgPSBmYWxzZTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblx0XHRcdFx0X2xhenlUd2VlbnMubGVuZ3RoID0gMDtcblx0XHRcdH07XG5cblx0XHRfcm9vdFRpbWVsaW5lLl9zdGFydFRpbWUgPSBfdGlja2VyLnRpbWU7XG5cdFx0X3Jvb3RGcmFtZXNUaW1lbGluZS5fc3RhcnRUaW1lID0gX3RpY2tlci5mcmFtZTtcblx0XHRfcm9vdFRpbWVsaW5lLl9hY3RpdmUgPSBfcm9vdEZyYW1lc1RpbWVsaW5lLl9hY3RpdmUgPSB0cnVlO1xuXHRcdHNldFRpbWVvdXQoX2xhenlSZW5kZXIsIDEpOyAvL29uIHNvbWUgbW9iaWxlIGRldmljZXMsIHRoZXJlIGlzbid0IGEgXCJ0aWNrXCIgYmVmb3JlIGNvZGUgcnVucyB3aGljaCBtZWFucyBhbnkgbGF6eSByZW5kZXJzIHdvdWxkbid0IHJ1biBiZWZvcmUgdGhlIG5leHQgb2ZmaWNpYWwgXCJ0aWNrXCIuXG5cblx0XHRBbmltYXRpb24uX3VwZGF0ZVJvb3QgPSBUd2VlbkxpdGUucmVuZGVyID0gZnVuY3Rpb24oKSB7XG5cdFx0XHRcdHZhciBpLCBhLCBwO1xuXHRcdFx0XHRpZiAoX2xhenlUd2VlbnMubGVuZ3RoKSB7IC8vaWYgY29kZSBpcyBydW4gb3V0c2lkZSBvZiB0aGUgcmVxdWVzdEFuaW1hdGlvbkZyYW1lIGxvb3AsIHRoZXJlIG1heSBiZSB0d2VlbnMgcXVldWVkIEFGVEVSIHRoZSBlbmdpbmUgcmVmcmVzaGVkLCBzbyB3ZSBuZWVkIHRvIGVuc3VyZSBhbnkgcGVuZGluZyByZW5kZXJzIG9jY3VyIGJlZm9yZSB3ZSByZWZyZXNoIGFnYWluLlxuXHRcdFx0XHRcdF9sYXp5UmVuZGVyKCk7XG5cdFx0XHRcdH1cblx0XHRcdFx0X3Jvb3RUaW1lbGluZS5yZW5kZXIoKF90aWNrZXIudGltZSAtIF9yb290VGltZWxpbmUuX3N0YXJ0VGltZSkgKiBfcm9vdFRpbWVsaW5lLl90aW1lU2NhbGUsIGZhbHNlLCBmYWxzZSk7XG5cdFx0XHRcdF9yb290RnJhbWVzVGltZWxpbmUucmVuZGVyKChfdGlja2VyLmZyYW1lIC0gX3Jvb3RGcmFtZXNUaW1lbGluZS5fc3RhcnRUaW1lKSAqIF9yb290RnJhbWVzVGltZWxpbmUuX3RpbWVTY2FsZSwgZmFsc2UsIGZhbHNlKTtcblx0XHRcdFx0aWYgKF9sYXp5VHdlZW5zLmxlbmd0aCkge1xuXHRcdFx0XHRcdF9sYXp5UmVuZGVyKCk7XG5cdFx0XHRcdH1cblx0XHRcdFx0aWYgKF90aWNrZXIuZnJhbWUgPj0gX25leHRHQ0ZyYW1lKSB7IC8vZHVtcCBnYXJiYWdlIGV2ZXJ5IDEyMCBmcmFtZXMgb3Igd2hhdGV2ZXIgdGhlIHVzZXIgc2V0cyBUd2VlbkxpdGUuYXV0b1NsZWVwIHRvXG5cdFx0XHRcdFx0X25leHRHQ0ZyYW1lID0gX3RpY2tlci5mcmFtZSArIChwYXJzZUludChUd2VlbkxpdGUuYXV0b1NsZWVwLCAxMCkgfHwgMTIwKTtcblx0XHRcdFx0XHRmb3IgKHAgaW4gX3R3ZWVuTG9va3VwKSB7XG5cdFx0XHRcdFx0XHRhID0gX3R3ZWVuTG9va3VwW3BdLnR3ZWVucztcblx0XHRcdFx0XHRcdGkgPSBhLmxlbmd0aDtcblx0XHRcdFx0XHRcdHdoaWxlICgtLWkgPiAtMSkge1xuXHRcdFx0XHRcdFx0XHRpZiAoYVtpXS5fZ2MpIHtcblx0XHRcdFx0XHRcdFx0XHRhLnNwbGljZShpLCAxKTtcblx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0aWYgKGEubGVuZ3RoID09PSAwKSB7XG5cdFx0XHRcdFx0XHRcdGRlbGV0ZSBfdHdlZW5Mb29rdXBbcF07XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdC8vaWYgdGhlcmUgYXJlIG5vIG1vcmUgdHdlZW5zIGluIHRoZSByb290IHRpbWVsaW5lcywgb3IgaWYgdGhleSdyZSBhbGwgcGF1c2VkLCBtYWtlIHRoZSBfdGltZXIgc2xlZXAgdG8gcmVkdWNlIGxvYWQgb24gdGhlIENQVSBzbGlnaHRseVxuXHRcdFx0XHRcdHAgPSBfcm9vdFRpbWVsaW5lLl9maXJzdDtcblx0XHRcdFx0XHRpZiAoIXAgfHwgcC5fcGF1c2VkKSBpZiAoVHdlZW5MaXRlLmF1dG9TbGVlcCAmJiAhX3Jvb3RGcmFtZXNUaW1lbGluZS5fZmlyc3QgJiYgX3RpY2tlci5fbGlzdGVuZXJzLnRpY2subGVuZ3RoID09PSAxKSB7XG5cdFx0XHRcdFx0XHR3aGlsZSAocCAmJiBwLl9wYXVzZWQpIHtcblx0XHRcdFx0XHRcdFx0cCA9IHAuX25leHQ7XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRpZiAoIXApIHtcblx0XHRcdFx0XHRcdFx0X3RpY2tlci5zbGVlcCgpO1xuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXHRcdFx0fTtcblxuXHRcdF90aWNrZXIuYWRkRXZlbnRMaXN0ZW5lcihcInRpY2tcIiwgQW5pbWF0aW9uLl91cGRhdGVSb290KTtcblxuXHRcdHZhciBfcmVnaXN0ZXIgPSBmdW5jdGlvbih0YXJnZXQsIHR3ZWVuLCBzY3J1Yikge1xuXHRcdFx0XHR2YXIgaWQgPSB0YXJnZXQuX2dzVHdlZW5JRCwgYSwgaTtcblx0XHRcdFx0aWYgKCFfdHdlZW5Mb29rdXBbaWQgfHwgKHRhcmdldC5fZ3NUd2VlbklEID0gaWQgPSBcInRcIiArIChfdHdlZW5Mb29rdXBOdW0rKykpXSkge1xuXHRcdFx0XHRcdF90d2Vlbkxvb2t1cFtpZF0gPSB7dGFyZ2V0OnRhcmdldCwgdHdlZW5zOltdfTtcblx0XHRcdFx0fVxuXHRcdFx0XHRpZiAodHdlZW4pIHtcblx0XHRcdFx0XHRhID0gX3R3ZWVuTG9va3VwW2lkXS50d2VlbnM7XG5cdFx0XHRcdFx0YVsoaSA9IGEubGVuZ3RoKV0gPSB0d2Vlbjtcblx0XHRcdFx0XHRpZiAoc2NydWIpIHtcblx0XHRcdFx0XHRcdHdoaWxlICgtLWkgPiAtMSkge1xuXHRcdFx0XHRcdFx0XHRpZiAoYVtpXSA9PT0gdHdlZW4pIHtcblx0XHRcdFx0XHRcdFx0XHRhLnNwbGljZShpLCAxKTtcblx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXHRcdFx0XHRyZXR1cm4gX3R3ZWVuTG9va3VwW2lkXS50d2VlbnM7XG5cdFx0XHR9LFxuXHRcdFx0X29uT3ZlcndyaXRlID0gZnVuY3Rpb24ob3ZlcndyaXR0ZW5Ud2Vlbiwgb3ZlcndyaXRpbmdUd2VlbiwgdGFyZ2V0LCBraWxsZWRQcm9wcykge1xuXHRcdFx0XHR2YXIgZnVuYyA9IG92ZXJ3cml0dGVuVHdlZW4udmFycy5vbk92ZXJ3cml0ZSwgcjEsIHIyO1xuXHRcdFx0XHRpZiAoZnVuYykge1xuXHRcdFx0XHRcdHIxID0gZnVuYyhvdmVyd3JpdHRlblR3ZWVuLCBvdmVyd3JpdGluZ1R3ZWVuLCB0YXJnZXQsIGtpbGxlZFByb3BzKTtcblx0XHRcdFx0fVxuXHRcdFx0XHRmdW5jID0gVHdlZW5MaXRlLm9uT3ZlcndyaXRlO1xuXHRcdFx0XHRpZiAoZnVuYykge1xuXHRcdFx0XHRcdHIyID0gZnVuYyhvdmVyd3JpdHRlblR3ZWVuLCBvdmVyd3JpdGluZ1R3ZWVuLCB0YXJnZXQsIGtpbGxlZFByb3BzKTtcblx0XHRcdFx0fVxuXHRcdFx0XHRyZXR1cm4gKHIxICE9PSBmYWxzZSAmJiByMiAhPT0gZmFsc2UpO1xuXHRcdFx0fSxcblx0XHRcdF9hcHBseU92ZXJ3cml0ZSA9IGZ1bmN0aW9uKHRhcmdldCwgdHdlZW4sIHByb3BzLCBtb2RlLCBzaWJsaW5ncykge1xuXHRcdFx0XHR2YXIgaSwgY2hhbmdlZCwgY3VyVHdlZW4sIGw7XG5cdFx0XHRcdGlmIChtb2RlID09PSAxIHx8IG1vZGUgPj0gNCkge1xuXHRcdFx0XHRcdGwgPSBzaWJsaW5ncy5sZW5ndGg7XG5cdFx0XHRcdFx0Zm9yIChpID0gMDsgaSA8IGw7IGkrKykge1xuXHRcdFx0XHRcdFx0aWYgKChjdXJUd2VlbiA9IHNpYmxpbmdzW2ldKSAhPT0gdHdlZW4pIHtcblx0XHRcdFx0XHRcdFx0aWYgKCFjdXJUd2Vlbi5fZ2MpIHtcblx0XHRcdFx0XHRcdFx0XHRpZiAoY3VyVHdlZW4uX2tpbGwobnVsbCwgdGFyZ2V0LCB0d2VlbikpIHtcblx0XHRcdFx0XHRcdFx0XHRcdGNoYW5nZWQgPSB0cnVlO1xuXHRcdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0fSBlbHNlIGlmIChtb2RlID09PSA1KSB7XG5cdFx0XHRcdFx0XHRcdGJyZWFrO1xuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHRyZXR1cm4gY2hhbmdlZDtcblx0XHRcdFx0fVxuXHRcdFx0XHQvL05PVEU6IEFkZCAwLjAwMDAwMDAwMDEgdG8gb3ZlcmNvbWUgZmxvYXRpbmcgcG9pbnQgZXJyb3JzIHRoYXQgY2FuIGNhdXNlIHRoZSBzdGFydFRpbWUgdG8gYmUgVkVSWSBzbGlnaHRseSBvZmYgKHdoZW4gYSB0d2VlbidzIHRpbWUoKSBpcyBzZXQgZm9yIGV4YW1wbGUpXG5cdFx0XHRcdHZhciBzdGFydFRpbWUgPSB0d2Vlbi5fc3RhcnRUaW1lICsgX3RpbnlOdW0sXG5cdFx0XHRcdFx0b3ZlcmxhcHMgPSBbXSxcblx0XHRcdFx0XHRvQ291bnQgPSAwLFxuXHRcdFx0XHRcdHplcm9EdXIgPSAodHdlZW4uX2R1cmF0aW9uID09PSAwKSxcblx0XHRcdFx0XHRnbG9iYWxTdGFydDtcblx0XHRcdFx0aSA9IHNpYmxpbmdzLmxlbmd0aDtcblx0XHRcdFx0d2hpbGUgKC0taSA+IC0xKSB7XG5cdFx0XHRcdFx0aWYgKChjdXJUd2VlbiA9IHNpYmxpbmdzW2ldKSA9PT0gdHdlZW4gfHwgY3VyVHdlZW4uX2djIHx8IGN1clR3ZWVuLl9wYXVzZWQpIHtcblx0XHRcdFx0XHRcdC8vaWdub3JlXG5cdFx0XHRcdFx0fSBlbHNlIGlmIChjdXJUd2Vlbi5fdGltZWxpbmUgIT09IHR3ZWVuLl90aW1lbGluZSkge1xuXHRcdFx0XHRcdFx0Z2xvYmFsU3RhcnQgPSBnbG9iYWxTdGFydCB8fCBfY2hlY2tPdmVybGFwKHR3ZWVuLCAwLCB6ZXJvRHVyKTtcblx0XHRcdFx0XHRcdGlmIChfY2hlY2tPdmVybGFwKGN1clR3ZWVuLCBnbG9iYWxTdGFydCwgemVyb0R1cikgPT09IDApIHtcblx0XHRcdFx0XHRcdFx0b3ZlcmxhcHNbb0NvdW50KytdID0gY3VyVHdlZW47XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0fSBlbHNlIGlmIChjdXJUd2Vlbi5fc3RhcnRUaW1lIDw9IHN0YXJ0VGltZSkgaWYgKGN1clR3ZWVuLl9zdGFydFRpbWUgKyBjdXJUd2Vlbi50b3RhbER1cmF0aW9uKCkgLyBjdXJUd2Vlbi5fdGltZVNjYWxlID4gc3RhcnRUaW1lKSBpZiAoISgoemVyb0R1ciB8fCAhY3VyVHdlZW4uX2luaXR0ZWQpICYmIHN0YXJ0VGltZSAtIGN1clR3ZWVuLl9zdGFydFRpbWUgPD0gMC4wMDAwMDAwMDAyKSkge1xuXHRcdFx0XHRcdFx0b3ZlcmxhcHNbb0NvdW50KytdID0gY3VyVHdlZW47XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cblx0XHRcdFx0aSA9IG9Db3VudDtcblx0XHRcdFx0d2hpbGUgKC0taSA+IC0xKSB7XG5cdFx0XHRcdFx0Y3VyVHdlZW4gPSBvdmVybGFwc1tpXTtcblx0XHRcdFx0XHRpZiAobW9kZSA9PT0gMikgaWYgKGN1clR3ZWVuLl9raWxsKHByb3BzLCB0YXJnZXQsIHR3ZWVuKSkge1xuXHRcdFx0XHRcdFx0Y2hhbmdlZCA9IHRydWU7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdGlmIChtb2RlICE9PSAyIHx8ICghY3VyVHdlZW4uX2ZpcnN0UFQgJiYgY3VyVHdlZW4uX2luaXR0ZWQpKSB7XG5cdFx0XHRcdFx0XHRpZiAobW9kZSAhPT0gMiAmJiAhX29uT3ZlcndyaXRlKGN1clR3ZWVuLCB0d2VlbikpIHtcblx0XHRcdFx0XHRcdFx0Y29udGludWU7XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRpZiAoY3VyVHdlZW4uX2VuYWJsZWQoZmFsc2UsIGZhbHNlKSkgeyAvL2lmIGFsbCBwcm9wZXJ0eSB0d2VlbnMgaGF2ZSBiZWVuIG92ZXJ3cml0dGVuLCBraWxsIHRoZSB0d2Vlbi5cblx0XHRcdFx0XHRcdFx0Y2hhbmdlZCA9IHRydWU7XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cdFx0XHRcdHJldHVybiBjaGFuZ2VkO1xuXHRcdFx0fSxcblx0XHRcdF9jaGVja092ZXJsYXAgPSBmdW5jdGlvbih0d2VlbiwgcmVmZXJlbmNlLCB6ZXJvRHVyKSB7XG5cdFx0XHRcdHZhciB0bCA9IHR3ZWVuLl90aW1lbGluZSxcblx0XHRcdFx0XHR0cyA9IHRsLl90aW1lU2NhbGUsXG5cdFx0XHRcdFx0dCA9IHR3ZWVuLl9zdGFydFRpbWU7XG5cdFx0XHRcdHdoaWxlICh0bC5fdGltZWxpbmUpIHtcblx0XHRcdFx0XHR0ICs9IHRsLl9zdGFydFRpbWU7XG5cdFx0XHRcdFx0dHMgKj0gdGwuX3RpbWVTY2FsZTtcblx0XHRcdFx0XHRpZiAodGwuX3BhdXNlZCkge1xuXHRcdFx0XHRcdFx0cmV0dXJuIC0xMDA7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdHRsID0gdGwuX3RpbWVsaW5lO1xuXHRcdFx0XHR9XG5cdFx0XHRcdHQgLz0gdHM7XG5cdFx0XHRcdHJldHVybiAodCA+IHJlZmVyZW5jZSkgPyB0IC0gcmVmZXJlbmNlIDogKCh6ZXJvRHVyICYmIHQgPT09IHJlZmVyZW5jZSkgfHwgKCF0d2Vlbi5faW5pdHRlZCAmJiB0IC0gcmVmZXJlbmNlIDwgMiAqIF90aW55TnVtKSkgPyBfdGlueU51bSA6ICgodCArPSB0d2Vlbi50b3RhbER1cmF0aW9uKCkgLyB0d2Vlbi5fdGltZVNjYWxlIC8gdHMpID4gcmVmZXJlbmNlICsgX3RpbnlOdW0pID8gMCA6IHQgLSByZWZlcmVuY2UgLSBfdGlueU51bTtcblx0XHRcdH07XG5cblxuLy8tLS0tIFR3ZWVuTGl0ZSBpbnN0YW5jZSBtZXRob2RzIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cblx0XHRwLl9pbml0ID0gZnVuY3Rpb24oKSB7XG5cdFx0XHR2YXIgdiA9IHRoaXMudmFycyxcblx0XHRcdFx0b3AgPSB0aGlzLl9vdmVyd3JpdHRlblByb3BzLFxuXHRcdFx0XHRkdXIgPSB0aGlzLl9kdXJhdGlvbixcblx0XHRcdFx0aW1tZWRpYXRlID0gISF2LmltbWVkaWF0ZVJlbmRlcixcblx0XHRcdFx0ZWFzZSA9IHYuZWFzZSxcblx0XHRcdFx0aSwgaW5pdFBsdWdpbnMsIHB0LCBwLCBzdGFydFZhcnM7XG5cdFx0XHRpZiAodi5zdGFydEF0KSB7XG5cdFx0XHRcdGlmICh0aGlzLl9zdGFydEF0KSB7XG5cdFx0XHRcdFx0dGhpcy5fc3RhcnRBdC5yZW5kZXIoLTEsIHRydWUpOyAvL2lmIHdlJ3ZlIHJ1biBhIHN0YXJ0QXQgcHJldmlvdXNseSAod2hlbiB0aGUgdHdlZW4gaW5zdGFudGlhdGVkKSwgd2Ugc2hvdWxkIHJldmVydCBpdCBzbyB0aGF0IHRoZSB2YWx1ZXMgcmUtaW5zdGFudGlhdGUgY29ycmVjdGx5IHBhcnRpY3VsYXJseSBmb3IgcmVsYXRpdmUgdHdlZW5zLiBXaXRob3V0IHRoaXMsIGEgVHdlZW5MaXRlLmZyb21UbyhvYmosIDEsIHt4OlwiKz0xMDBcIn0sIHt4OlwiLT0xMDBcIn0pLCBmb3IgZXhhbXBsZSwgd291bGQgYWN0dWFsbHkganVtcCB0byArPTIwMCBiZWNhdXNlIHRoZSBzdGFydEF0IHdvdWxkIHJ1biB0d2ljZSwgZG91YmxpbmcgdGhlIHJlbGF0aXZlIGNoYW5nZS5cblx0XHRcdFx0XHR0aGlzLl9zdGFydEF0LmtpbGwoKTtcblx0XHRcdFx0fVxuXHRcdFx0XHRzdGFydFZhcnMgPSB7fTtcblx0XHRcdFx0Zm9yIChwIGluIHYuc3RhcnRBdCkgeyAvL2NvcHkgdGhlIHByb3BlcnRpZXMvdmFsdWVzIGludG8gYSBuZXcgb2JqZWN0IHRvIGF2b2lkIGNvbGxpc2lvbnMsIGxpa2UgdmFyIHRvID0ge3g6MH0sIGZyb20gPSB7eDo1MDB9OyB0aW1lbGluZS5mcm9tVG8oZSwgMSwgZnJvbSwgdG8pLmZyb21UbyhlLCAxLCB0bywgZnJvbSk7XG5cdFx0XHRcdFx0c3RhcnRWYXJzW3BdID0gdi5zdGFydEF0W3BdO1xuXHRcdFx0XHR9XG5cdFx0XHRcdHN0YXJ0VmFycy5vdmVyd3JpdGUgPSBmYWxzZTtcblx0XHRcdFx0c3RhcnRWYXJzLmltbWVkaWF0ZVJlbmRlciA9IHRydWU7XG5cdFx0XHRcdHN0YXJ0VmFycy5sYXp5ID0gKGltbWVkaWF0ZSAmJiB2LmxhenkgIT09IGZhbHNlKTtcblx0XHRcdFx0c3RhcnRWYXJzLnN0YXJ0QXQgPSBzdGFydFZhcnMuZGVsYXkgPSBudWxsOyAvL25vIG5lc3Rpbmcgb2Ygc3RhcnRBdCBvYmplY3RzIGFsbG93ZWQgKG90aGVyd2lzZSBpdCBjb3VsZCBjYXVzZSBhbiBpbmZpbml0ZSBsb29wKS5cblx0XHRcdFx0dGhpcy5fc3RhcnRBdCA9IFR3ZWVuTGl0ZS50byh0aGlzLnRhcmdldCwgMCwgc3RhcnRWYXJzKTtcblx0XHRcdFx0aWYgKGltbWVkaWF0ZSkge1xuXHRcdFx0XHRcdGlmICh0aGlzLl90aW1lID4gMCkge1xuXHRcdFx0XHRcdFx0dGhpcy5fc3RhcnRBdCA9IG51bGw7IC8vdHdlZW5zIHRoYXQgcmVuZGVyIGltbWVkaWF0ZWx5IChsaWtlIG1vc3QgZnJvbSgpIGFuZCBmcm9tVG8oKSB0d2VlbnMpIHNob3VsZG4ndCByZXZlcnQgd2hlbiB0aGVpciBwYXJlbnQgdGltZWxpbmUncyBwbGF5aGVhZCBnb2VzIGJhY2t3YXJkIHBhc3QgdGhlIHN0YXJ0VGltZSBiZWNhdXNlIHRoZSBpbml0aWFsIHJlbmRlciBjb3VsZCBoYXZlIGhhcHBlbmVkIGFueXRpbWUgYW5kIGl0IHNob3VsZG4ndCBiZSBkaXJlY3RseSBjb3JyZWxhdGVkIHRvIHRoaXMgdHdlZW4ncyBzdGFydFRpbWUuIEltYWdpbmUgc2V0dGluZyB1cCBhIGNvbXBsZXggYW5pbWF0aW9uIHdoZXJlIHRoZSBiZWdpbm5pbmcgc3RhdGVzIG9mIHZhcmlvdXMgb2JqZWN0cyBhcmUgcmVuZGVyZWQgaW1tZWRpYXRlbHkgYnV0IHRoZSB0d2VlbiBkb2Vzbid0IGhhcHBlbiBmb3IgcXVpdGUgc29tZSB0aW1lIC0gaWYgd2UgcmV2ZXJ0IHRvIHRoZSBzdGFydGluZyB2YWx1ZXMgYXMgc29vbiBhcyB0aGUgcGxheWhlYWQgZ29lcyBiYWNrd2FyZCBwYXN0IHRoZSB0d2VlbidzIHN0YXJ0VGltZSwgaXQgd2lsbCB0aHJvdyB0aGluZ3Mgb2ZmIHZpc3VhbGx5LiBSZXZlcnNpb24gc2hvdWxkIG9ubHkgaGFwcGVuIGluIFRpbWVsaW5lTGl0ZS9NYXggaW5zdGFuY2VzIHdoZXJlIGltbWVkaWF0ZVJlbmRlciB3YXMgZmFsc2UgKHdoaWNoIGlzIHRoZSBkZWZhdWx0IGluIHRoZSBjb252ZW5pZW5jZSBtZXRob2RzIGxpa2UgZnJvbSgpKS5cblx0XHRcdFx0XHR9IGVsc2UgaWYgKGR1ciAhPT0gMCkge1xuXHRcdFx0XHRcdFx0cmV0dXJuOyAvL3dlIHNraXAgaW5pdGlhbGl6YXRpb24gaGVyZSBzbyB0aGF0IG92ZXJ3cml0aW5nIGRvZXNuJ3Qgb2NjdXIgdW50aWwgdGhlIHR3ZWVuIGFjdHVhbGx5IGJlZ2lucy4gT3RoZXJ3aXNlLCBpZiB5b3UgY3JlYXRlIHNldmVyYWwgaW1tZWRpYXRlUmVuZGVyOnRydWUgdHdlZW5zIG9mIHRoZSBzYW1lIHRhcmdldC9wcm9wZXJ0aWVzIHRvIGRyb3AgaW50byBhIFRpbWVsaW5lTGl0ZSBvciBUaW1lbGluZU1heCwgdGhlIGxhc3Qgb25lIGNyZWF0ZWQgd291bGQgb3ZlcndyaXRlIHRoZSBmaXJzdCBvbmVzIGJlY2F1c2UgdGhleSBkaWRuJ3QgZ2V0IHBsYWNlZCBpbnRvIHRoZSB0aW1lbGluZSB5ZXQgYmVmb3JlIHRoZSBmaXJzdCByZW5kZXIgb2NjdXJzIGFuZCBraWNrcyBpbiBvdmVyd3JpdGluZy5cblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblx0XHRcdH0gZWxzZSBpZiAodi5ydW5CYWNrd2FyZHMgJiYgZHVyICE9PSAwKSB7XG5cdFx0XHRcdC8vZnJvbSgpIHR3ZWVucyBtdXN0IGJlIGhhbmRsZWQgdW5pcXVlbHk6IHRoZWlyIGJlZ2lubmluZyB2YWx1ZXMgbXVzdCBiZSByZW5kZXJlZCBidXQgd2UgZG9uJ3Qgd2FudCBvdmVyd3JpdGluZyB0byBvY2N1ciB5ZXQgKHdoZW4gdGltZSBpcyBzdGlsbCAwKS4gV2FpdCB1bnRpbCB0aGUgdHdlZW4gYWN0dWFsbHkgYmVnaW5zIGJlZm9yZSBkb2luZyBhbGwgdGhlIHJvdXRpbmVzIGxpa2Ugb3ZlcndyaXRpbmcuIEF0IHRoYXQgdGltZSwgd2Ugc2hvdWxkIHJlbmRlciBhdCB0aGUgRU5EIG9mIHRoZSB0d2VlbiB0byBlbnN1cmUgdGhhdCB0aGluZ3MgaW5pdGlhbGl6ZSBjb3JyZWN0bHkgKHJlbWVtYmVyLCBmcm9tKCkgdHdlZW5zIGdvIGJhY2t3YXJkcylcblx0XHRcdFx0aWYgKHRoaXMuX3N0YXJ0QXQpIHtcblx0XHRcdFx0XHR0aGlzLl9zdGFydEF0LnJlbmRlcigtMSwgdHJ1ZSk7XG5cdFx0XHRcdFx0dGhpcy5fc3RhcnRBdC5raWxsKCk7XG5cdFx0XHRcdFx0dGhpcy5fc3RhcnRBdCA9IG51bGw7XG5cdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0aWYgKHRoaXMuX3RpbWUgIT09IDApIHsgLy9pbiByYXJlIGNhc2VzIChsaWtlIGlmIGEgZnJvbSgpIHR3ZWVuIHJ1bnMgYW5kIHRoZW4gaXMgaW52YWxpZGF0ZSgpLWVkKSwgaW1tZWRpYXRlUmVuZGVyIGNvdWxkIGJlIHRydWUgYnV0IHRoZSBpbml0aWFsIGZvcmNlZC1yZW5kZXIgZ2V0cyBza2lwcGVkLCBzbyB0aGVyZSdzIG5vIG5lZWQgdG8gZm9yY2UgdGhlIHJlbmRlciBpbiB0aGlzIGNvbnRleHQgd2hlbiB0aGUgX3RpbWUgaXMgZ3JlYXRlciB0aGFuIDBcblx0XHRcdFx0XHRcdGltbWVkaWF0ZSA9IGZhbHNlO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHRwdCA9IHt9O1xuXHRcdFx0XHRcdGZvciAocCBpbiB2KSB7IC8vY29weSBwcm9wcyBpbnRvIGEgbmV3IG9iamVjdCBhbmQgc2tpcCBhbnkgcmVzZXJ2ZWQgcHJvcHMsIG90aGVyd2lzZSBvbkNvbXBsZXRlIG9yIG9uVXBkYXRlIG9yIG9uU3RhcnQgY291bGQgZmlyZS4gV2Ugc2hvdWxkLCBob3dldmVyLCBwZXJtaXQgYXV0b0NTUyB0byBnbyB0aHJvdWdoLlxuXHRcdFx0XHRcdFx0aWYgKCFfcmVzZXJ2ZWRQcm9wc1twXSB8fCBwID09PSBcImF1dG9DU1NcIikge1xuXHRcdFx0XHRcdFx0XHRwdFtwXSA9IHZbcF07XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdHB0Lm92ZXJ3cml0ZSA9IDA7XG5cdFx0XHRcdFx0cHQuZGF0YSA9IFwiaXNGcm9tU3RhcnRcIjsgLy93ZSB0YWcgdGhlIHR3ZWVuIHdpdGggYXMgXCJpc0Zyb21TdGFydFwiIHNvIHRoYXQgaWYgW2luc2lkZSBhIHBsdWdpbl0gd2UgbmVlZCB0byBvbmx5IGRvIHNvbWV0aGluZyBhdCB0aGUgdmVyeSBFTkQgb2YgYSB0d2Vlbiwgd2UgaGF2ZSBhIHdheSBvZiBpZGVudGlmeWluZyB0aGlzIHR3ZWVuIGFzIG1lcmVseSB0aGUgb25lIHRoYXQncyBzZXR0aW5nIHRoZSBiZWdpbm5pbmcgdmFsdWVzIGZvciBhIFwiZnJvbSgpXCIgdHdlZW4uIEZvciBleGFtcGxlLCBjbGVhclByb3BzIGluIENTU1BsdWdpbiBzaG91bGQgb25seSBnZXQgYXBwbGllZCBhdCB0aGUgdmVyeSBFTkQgb2YgYSB0d2VlbiBhbmQgd2l0aG91dCB0aGlzIHRhZywgZnJvbSguLi57aGVpZ2h0OjEwMCwgY2xlYXJQcm9wczpcImhlaWdodFwiLCBkZWxheToxfSkgd291bGQgd2lwZSB0aGUgaGVpZ2h0IGF0IHRoZSBiZWdpbm5pbmcgb2YgdGhlIHR3ZWVuIGFuZCBhZnRlciAxIHNlY29uZCwgaXQnZCBraWNrIGJhY2sgaW4uXG5cdFx0XHRcdFx0cHQubGF6eSA9IChpbW1lZGlhdGUgJiYgdi5sYXp5ICE9PSBmYWxzZSk7XG5cdFx0XHRcdFx0cHQuaW1tZWRpYXRlUmVuZGVyID0gaW1tZWRpYXRlOyAvL3plcm8tZHVyYXRpb24gdHdlZW5zIHJlbmRlciBpbW1lZGlhdGVseSBieSBkZWZhdWx0LCBidXQgaWYgd2UncmUgbm90IHNwZWNpZmljYWxseSBpbnN0cnVjdGVkIHRvIHJlbmRlciB0aGlzIHR3ZWVuIGltbWVkaWF0ZWx5LCB3ZSBzaG91bGQgc2tpcCB0aGlzIGFuZCBtZXJlbHkgX2luaXQoKSB0byByZWNvcmQgdGhlIHN0YXJ0aW5nIHZhbHVlcyAocmVuZGVyaW5nIHRoZW0gaW1tZWRpYXRlbHkgd291bGQgcHVzaCB0aGVtIHRvIGNvbXBsZXRpb24gd2hpY2ggaXMgd2FzdGVmdWwgaW4gdGhhdCBjYXNlIC0gd2UnZCBoYXZlIHRvIHJlbmRlcigtMSkgaW1tZWRpYXRlbHkgYWZ0ZXIpXG5cdFx0XHRcdFx0dGhpcy5fc3RhcnRBdCA9IFR3ZWVuTGl0ZS50byh0aGlzLnRhcmdldCwgMCwgcHQpO1xuXHRcdFx0XHRcdGlmICghaW1tZWRpYXRlKSB7XG5cdFx0XHRcdFx0XHR0aGlzLl9zdGFydEF0Ll9pbml0KCk7IC8vZW5zdXJlcyB0aGF0IHRoZSBpbml0aWFsIHZhbHVlcyBhcmUgcmVjb3JkZWRcblx0XHRcdFx0XHRcdHRoaXMuX3N0YXJ0QXQuX2VuYWJsZWQoZmFsc2UpOyAvL25vIG5lZWQgdG8gaGF2ZSB0aGUgdHdlZW4gcmVuZGVyIG9uIHRoZSBuZXh0IGN5Y2xlLiBEaXNhYmxlIGl0IGJlY2F1c2Ugd2UnbGwgYWx3YXlzIG1hbnVhbGx5IGNvbnRyb2wgdGhlIHJlbmRlcnMgb2YgdGhlIF9zdGFydEF0IHR3ZWVuLlxuXHRcdFx0XHRcdFx0aWYgKHRoaXMudmFycy5pbW1lZGlhdGVSZW5kZXIpIHtcblx0XHRcdFx0XHRcdFx0dGhpcy5fc3RhcnRBdCA9IG51bGw7XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0fSBlbHNlIGlmICh0aGlzLl90aW1lID09PSAwKSB7XG5cdFx0XHRcdFx0XHRyZXR1cm47XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0XHR0aGlzLl9lYXNlID0gZWFzZSA9ICghZWFzZSkgPyBUd2VlbkxpdGUuZGVmYXVsdEVhc2UgOiAoZWFzZSBpbnN0YW5jZW9mIEVhc2UpID8gZWFzZSA6ICh0eXBlb2YoZWFzZSkgPT09IFwiZnVuY3Rpb25cIikgPyBuZXcgRWFzZShlYXNlLCB2LmVhc2VQYXJhbXMpIDogX2Vhc2VNYXBbZWFzZV0gfHwgVHdlZW5MaXRlLmRlZmF1bHRFYXNlO1xuXHRcdFx0aWYgKHYuZWFzZVBhcmFtcyBpbnN0YW5jZW9mIEFycmF5ICYmIGVhc2UuY29uZmlnKSB7XG5cdFx0XHRcdHRoaXMuX2Vhc2UgPSBlYXNlLmNvbmZpZy5hcHBseShlYXNlLCB2LmVhc2VQYXJhbXMpO1xuXHRcdFx0fVxuXHRcdFx0dGhpcy5fZWFzZVR5cGUgPSB0aGlzLl9lYXNlLl90eXBlO1xuXHRcdFx0dGhpcy5fZWFzZVBvd2VyID0gdGhpcy5fZWFzZS5fcG93ZXI7XG5cdFx0XHR0aGlzLl9maXJzdFBUID0gbnVsbDtcblxuXHRcdFx0aWYgKHRoaXMuX3RhcmdldHMpIHtcblx0XHRcdFx0aSA9IHRoaXMuX3RhcmdldHMubGVuZ3RoO1xuXHRcdFx0XHR3aGlsZSAoLS1pID4gLTEpIHtcblx0XHRcdFx0XHRpZiAoIHRoaXMuX2luaXRQcm9wcyggdGhpcy5fdGFyZ2V0c1tpXSwgKHRoaXMuX3Byb3BMb29rdXBbaV0gPSB7fSksIHRoaXMuX3NpYmxpbmdzW2ldLCAob3AgPyBvcFtpXSA6IG51bGwpKSApIHtcblx0XHRcdFx0XHRcdGluaXRQbHVnaW5zID0gdHJ1ZTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdGluaXRQbHVnaW5zID0gdGhpcy5faW5pdFByb3BzKHRoaXMudGFyZ2V0LCB0aGlzLl9wcm9wTG9va3VwLCB0aGlzLl9zaWJsaW5ncywgb3ApO1xuXHRcdFx0fVxuXG5cdFx0XHRpZiAoaW5pdFBsdWdpbnMpIHtcblx0XHRcdFx0VHdlZW5MaXRlLl9vblBsdWdpbkV2ZW50KFwiX29uSW5pdEFsbFByb3BzXCIsIHRoaXMpOyAvL3Jlb3JkZXJzIHRoZSBhcnJheSBpbiBvcmRlciBvZiBwcmlvcml0eS4gVXNlcyBhIHN0YXRpYyBUd2VlblBsdWdpbiBtZXRob2QgaW4gb3JkZXIgdG8gbWluaW1pemUgZmlsZSBzaXplIGluIFR3ZWVuTGl0ZVxuXHRcdFx0fVxuXHRcdFx0aWYgKG9wKSBpZiAoIXRoaXMuX2ZpcnN0UFQpIGlmICh0eXBlb2YodGhpcy50YXJnZXQpICE9PSBcImZ1bmN0aW9uXCIpIHsgLy9pZiBhbGwgdHdlZW5pbmcgcHJvcGVydGllcyBoYXZlIGJlZW4gb3ZlcndyaXR0ZW4sIGtpbGwgdGhlIHR3ZWVuLiBJZiB0aGUgdGFyZ2V0IGlzIGEgZnVuY3Rpb24sIGl0J3MgcHJvYmFibHkgYSBkZWxheWVkQ2FsbCBzbyBsZXQgaXQgbGl2ZS5cblx0XHRcdFx0dGhpcy5fZW5hYmxlZChmYWxzZSwgZmFsc2UpO1xuXHRcdFx0fVxuXHRcdFx0aWYgKHYucnVuQmFja3dhcmRzKSB7XG5cdFx0XHRcdHB0ID0gdGhpcy5fZmlyc3RQVDtcblx0XHRcdFx0d2hpbGUgKHB0KSB7XG5cdFx0XHRcdFx0cHQucyArPSBwdC5jO1xuXHRcdFx0XHRcdHB0LmMgPSAtcHQuYztcblx0XHRcdFx0XHRwdCA9IHB0Ll9uZXh0O1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0XHR0aGlzLl9vblVwZGF0ZSA9IHYub25VcGRhdGU7XG5cdFx0XHR0aGlzLl9pbml0dGVkID0gdHJ1ZTtcblx0XHR9O1xuXG5cdFx0cC5faW5pdFByb3BzID0gZnVuY3Rpb24odGFyZ2V0LCBwcm9wTG9va3VwLCBzaWJsaW5ncywgb3ZlcndyaXR0ZW5Qcm9wcykge1xuXHRcdFx0dmFyIHAsIGksIGluaXRQbHVnaW5zLCBwbHVnaW4sIHB0LCB2O1xuXHRcdFx0aWYgKHRhcmdldCA9PSBudWxsKSB7XG5cdFx0XHRcdHJldHVybiBmYWxzZTtcblx0XHRcdH1cblxuXHRcdFx0aWYgKF9sYXp5TG9va3VwW3RhcmdldC5fZ3NUd2VlbklEXSkge1xuXHRcdFx0XHRfbGF6eVJlbmRlcigpOyAvL2lmIG90aGVyIHR3ZWVucyBvZiB0aGUgc2FtZSB0YXJnZXQgaGF2ZSByZWNlbnRseSBpbml0dGVkIGJ1dCBoYXZlbid0IHJlbmRlcmVkIHlldCwgd2UndmUgZ290IHRvIGZvcmNlIHRoZSByZW5kZXIgc28gdGhhdCB0aGUgc3RhcnRpbmcgdmFsdWVzIGFyZSBjb3JyZWN0IChpbWFnaW5lIHBvcHVsYXRpbmcgYSB0aW1lbGluZSB3aXRoIGEgYnVuY2ggb2Ygc2VxdWVudGlhbCB0d2VlbnMgYW5kIHRoZW4ganVtcGluZyB0byB0aGUgZW5kKVxuXHRcdFx0fVxuXG5cdFx0XHRpZiAoIXRoaXMudmFycy5jc3MpIGlmICh0YXJnZXQuc3R5bGUpIGlmICh0YXJnZXQgIT09IHdpbmRvdyAmJiB0YXJnZXQubm9kZVR5cGUpIGlmIChfcGx1Z2lucy5jc3MpIGlmICh0aGlzLnZhcnMuYXV0b0NTUyAhPT0gZmFsc2UpIHsgLy9pdCdzIHNvIGNvbW1vbiB0byB1c2UgVHdlZW5MaXRlL01heCB0byBhbmltYXRlIHRoZSBjc3Mgb2YgRE9NIGVsZW1lbnRzLCB3ZSBhc3N1bWUgdGhhdCBpZiB0aGUgdGFyZ2V0IGlzIGEgRE9NIGVsZW1lbnQsIHRoYXQncyB3aGF0IGlzIGludGVuZGVkIChhIGNvbnZlbmllbmNlIHNvIHRoYXQgdXNlcnMgZG9uJ3QgaGF2ZSB0byB3cmFwIHRoaW5ncyBpbiBjc3M6e30sIGFsdGhvdWdoIHdlIHN0aWxsIHJlY29tbWVuZCBpdCBmb3IgYSBzbGlnaHQgcGVyZm9ybWFuY2UgYm9vc3QgYW5kIGJldHRlciBzcGVjaWZpY2l0eSkuIE5vdGU6IHdlIGNhbm5vdCBjaGVjayBcIm5vZGVUeXBlXCIgb24gdGhlIHdpbmRvdyBpbnNpZGUgYW4gaWZyYW1lLlxuXHRcdFx0XHRfYXV0b0NTUyh0aGlzLnZhcnMsIHRhcmdldCk7XG5cdFx0XHR9XG5cdFx0XHRmb3IgKHAgaW4gdGhpcy52YXJzKSB7XG5cdFx0XHRcdHYgPSB0aGlzLnZhcnNbcF07XG5cdFx0XHRcdGlmIChfcmVzZXJ2ZWRQcm9wc1twXSkge1xuXHRcdFx0XHRcdGlmICh2KSBpZiAoKHYgaW5zdGFuY2VvZiBBcnJheSkgfHwgKHYucHVzaCAmJiBfaXNBcnJheSh2KSkpIGlmICh2LmpvaW4oXCJcIikuaW5kZXhPZihcIntzZWxmfVwiKSAhPT0gLTEpIHtcblx0XHRcdFx0XHRcdHRoaXMudmFyc1twXSA9IHYgPSB0aGlzLl9zd2FwU2VsZkluUGFyYW1zKHYsIHRoaXMpO1xuXHRcdFx0XHRcdH1cblxuXHRcdFx0XHR9IGVsc2UgaWYgKF9wbHVnaW5zW3BdICYmIChwbHVnaW4gPSBuZXcgX3BsdWdpbnNbcF0oKSkuX29uSW5pdFR3ZWVuKHRhcmdldCwgdGhpcy52YXJzW3BdLCB0aGlzKSkge1xuXG5cdFx0XHRcdFx0Ly90IC0gdGFyZ2V0IFx0XHRbb2JqZWN0XVxuXHRcdFx0XHRcdC8vcCAtIHByb3BlcnR5IFx0XHRbc3RyaW5nXVxuXHRcdFx0XHRcdC8vcyAtIHN0YXJ0XHRcdFx0W251bWJlcl1cblx0XHRcdFx0XHQvL2MgLSBjaGFuZ2VcdFx0W251bWJlcl1cblx0XHRcdFx0XHQvL2YgLSBpc0Z1bmN0aW9uXHRbYm9vbGVhbl1cblx0XHRcdFx0XHQvL24gLSBuYW1lXHRcdFx0W3N0cmluZ11cblx0XHRcdFx0XHQvL3BnIC0gaXNQbHVnaW4gXHRbYm9vbGVhbl1cblx0XHRcdFx0XHQvL3ByIC0gcHJpb3JpdHlcdFx0W251bWJlcl1cblx0XHRcdFx0XHR0aGlzLl9maXJzdFBUID0gcHQgPSB7X25leHQ6dGhpcy5fZmlyc3RQVCwgdDpwbHVnaW4sIHA6XCJzZXRSYXRpb1wiLCBzOjAsIGM6MSwgZjoxLCBuOnAsIHBnOjEsIHByOnBsdWdpbi5fcHJpb3JpdHl9O1xuXHRcdFx0XHRcdGkgPSBwbHVnaW4uX292ZXJ3cml0ZVByb3BzLmxlbmd0aDtcblx0XHRcdFx0XHR3aGlsZSAoLS1pID4gLTEpIHtcblx0XHRcdFx0XHRcdHByb3BMb29rdXBbcGx1Z2luLl9vdmVyd3JpdGVQcm9wc1tpXV0gPSB0aGlzLl9maXJzdFBUO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHRpZiAocGx1Z2luLl9wcmlvcml0eSB8fCBwbHVnaW4uX29uSW5pdEFsbFByb3BzKSB7XG5cdFx0XHRcdFx0XHRpbml0UGx1Z2lucyA9IHRydWU7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdGlmIChwbHVnaW4uX29uRGlzYWJsZSB8fCBwbHVnaW4uX29uRW5hYmxlKSB7XG5cdFx0XHRcdFx0XHR0aGlzLl9ub3RpZnlQbHVnaW5zT2ZFbmFibGVkID0gdHJ1ZTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0aWYgKHB0Ll9uZXh0KSB7XG5cdFx0XHRcdFx0XHRwdC5fbmV4dC5fcHJldiA9IHB0O1xuXHRcdFx0XHRcdH1cblxuXHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdHByb3BMb29rdXBbcF0gPSBfYWRkUHJvcFR3ZWVuLmNhbGwodGhpcywgdGFyZ2V0LCBwLCBcImdldFwiLCB2LCBwLCAwLCBudWxsLCB0aGlzLnZhcnMuc3RyaW5nRmlsdGVyKTtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXG5cdFx0XHRpZiAob3ZlcndyaXR0ZW5Qcm9wcykgaWYgKHRoaXMuX2tpbGwob3ZlcndyaXR0ZW5Qcm9wcywgdGFyZ2V0KSkgeyAvL2Fub3RoZXIgdHdlZW4gbWF5IGhhdmUgdHJpZWQgdG8gb3ZlcndyaXRlIHByb3BlcnRpZXMgb2YgdGhpcyB0d2VlbiBiZWZvcmUgaW5pdCgpIHdhcyBjYWxsZWQgKGxpa2UgaWYgdHdvIHR3ZWVucyBzdGFydCBhdCB0aGUgc2FtZSB0aW1lLCB0aGUgb25lIGNyZWF0ZWQgc2Vjb25kIHdpbGwgcnVuIGZpcnN0KVxuXHRcdFx0XHRyZXR1cm4gdGhpcy5faW5pdFByb3BzKHRhcmdldCwgcHJvcExvb2t1cCwgc2libGluZ3MsIG92ZXJ3cml0dGVuUHJvcHMpO1xuXHRcdFx0fVxuXHRcdFx0aWYgKHRoaXMuX292ZXJ3cml0ZSA+IDEpIGlmICh0aGlzLl9maXJzdFBUKSBpZiAoc2libGluZ3MubGVuZ3RoID4gMSkgaWYgKF9hcHBseU92ZXJ3cml0ZSh0YXJnZXQsIHRoaXMsIHByb3BMb29rdXAsIHRoaXMuX292ZXJ3cml0ZSwgc2libGluZ3MpKSB7XG5cdFx0XHRcdHRoaXMuX2tpbGwocHJvcExvb2t1cCwgdGFyZ2V0KTtcblx0XHRcdFx0cmV0dXJuIHRoaXMuX2luaXRQcm9wcyh0YXJnZXQsIHByb3BMb29rdXAsIHNpYmxpbmdzLCBvdmVyd3JpdHRlblByb3BzKTtcblx0XHRcdH1cblx0XHRcdGlmICh0aGlzLl9maXJzdFBUKSBpZiAoKHRoaXMudmFycy5sYXp5ICE9PSBmYWxzZSAmJiB0aGlzLl9kdXJhdGlvbikgfHwgKHRoaXMudmFycy5sYXp5ICYmICF0aGlzLl9kdXJhdGlvbikpIHsgLy96ZXJvIGR1cmF0aW9uIHR3ZWVucyBkb24ndCBsYXp5IHJlbmRlciBieSBkZWZhdWx0OyBldmVyeXRoaW5nIGVsc2UgZG9lcy5cblx0XHRcdFx0X2xhenlMb29rdXBbdGFyZ2V0Ll9nc1R3ZWVuSURdID0gdHJ1ZTtcblx0XHRcdH1cblx0XHRcdHJldHVybiBpbml0UGx1Z2lucztcblx0XHR9O1xuXG5cdFx0cC5yZW5kZXIgPSBmdW5jdGlvbih0aW1lLCBzdXBwcmVzc0V2ZW50cywgZm9yY2UpIHtcblx0XHRcdHZhciBwcmV2VGltZSA9IHRoaXMuX3RpbWUsXG5cdFx0XHRcdGR1cmF0aW9uID0gdGhpcy5fZHVyYXRpb24sXG5cdFx0XHRcdHByZXZSYXdQcmV2VGltZSA9IHRoaXMuX3Jhd1ByZXZUaW1lLFxuXHRcdFx0XHRpc0NvbXBsZXRlLCBjYWxsYmFjaywgcHQsIHJhd1ByZXZUaW1lO1xuXHRcdFx0aWYgKHRpbWUgPj0gZHVyYXRpb24gLSAwLjAwMDAwMDEpIHsgLy90byB3b3JrIGFyb3VuZCBvY2Nhc2lvbmFsIGZsb2F0aW5nIHBvaW50IG1hdGggYXJ0aWZhY3RzLlxuXHRcdFx0XHR0aGlzLl90b3RhbFRpbWUgPSB0aGlzLl90aW1lID0gZHVyYXRpb247XG5cdFx0XHRcdHRoaXMucmF0aW8gPSB0aGlzLl9lYXNlLl9jYWxjRW5kID8gdGhpcy5fZWFzZS5nZXRSYXRpbygxKSA6IDE7XG5cdFx0XHRcdGlmICghdGhpcy5fcmV2ZXJzZWQgKSB7XG5cdFx0XHRcdFx0aXNDb21wbGV0ZSA9IHRydWU7XG5cdFx0XHRcdFx0Y2FsbGJhY2sgPSBcIm9uQ29tcGxldGVcIjtcblx0XHRcdFx0XHRmb3JjZSA9IChmb3JjZSB8fCB0aGlzLl90aW1lbGluZS5hdXRvUmVtb3ZlQ2hpbGRyZW4pOyAvL290aGVyd2lzZSwgaWYgdGhlIGFuaW1hdGlvbiBpcyB1bnBhdXNlZC9hY3RpdmF0ZWQgYWZ0ZXIgaXQncyBhbHJlYWR5IGZpbmlzaGVkLCBpdCBkb2Vzbid0IGdldCByZW1vdmVkIGZyb20gdGhlIHBhcmVudCB0aW1lbGluZS5cblx0XHRcdFx0fVxuXHRcdFx0XHRpZiAoZHVyYXRpb24gPT09IDApIGlmICh0aGlzLl9pbml0dGVkIHx8ICF0aGlzLnZhcnMubGF6eSB8fCBmb3JjZSkgeyAvL3plcm8tZHVyYXRpb24gdHdlZW5zIGFyZSB0cmlja3kgYmVjYXVzZSB3ZSBtdXN0IGRpc2Nlcm4gdGhlIG1vbWVudHVtL2RpcmVjdGlvbiBvZiB0aW1lIGluIG9yZGVyIHRvIGRldGVybWluZSB3aGV0aGVyIHRoZSBzdGFydGluZyB2YWx1ZXMgc2hvdWxkIGJlIHJlbmRlcmVkIG9yIHRoZSBlbmRpbmcgdmFsdWVzLiBJZiB0aGUgXCJwbGF5aGVhZFwiIG9mIGl0cyB0aW1lbGluZSBnb2VzIHBhc3QgdGhlIHplcm8tZHVyYXRpb24gdHdlZW4gaW4gdGhlIGZvcndhcmQgZGlyZWN0aW9uIG9yIGxhbmRzIGRpcmVjdGx5IG9uIGl0LCB0aGUgZW5kIHZhbHVlcyBzaG91bGQgYmUgcmVuZGVyZWQsIGJ1dCBpZiB0aGUgdGltZWxpbmUncyBcInBsYXloZWFkXCIgbW92ZXMgcGFzdCBpdCBpbiB0aGUgYmFja3dhcmQgZGlyZWN0aW9uIChmcm9tIGEgcG9zdGl0aXZlIHRpbWUgdG8gYSBuZWdhdGl2ZSB0aW1lKSwgdGhlIHN0YXJ0aW5nIHZhbHVlcyBtdXN0IGJlIHJlbmRlcmVkLlxuXHRcdFx0XHRcdGlmICh0aGlzLl9zdGFydFRpbWUgPT09IHRoaXMuX3RpbWVsaW5lLl9kdXJhdGlvbikgeyAvL2lmIGEgemVyby1kdXJhdGlvbiB0d2VlbiBpcyBhdCB0aGUgVkVSWSBlbmQgb2YgYSB0aW1lbGluZSBhbmQgdGhhdCB0aW1lbGluZSByZW5kZXJzIGF0IGl0cyBlbmQsIGl0IHdpbGwgdHlwaWNhbGx5IGFkZCBhIHRpbnkgYml0IG9mIGN1c2hpb24gdG8gdGhlIHJlbmRlciB0aW1lIHRvIHByZXZlbnQgcm91bmRpbmcgZXJyb3JzIGZyb20gZ2V0dGluZyBpbiB0aGUgd2F5IG9mIHR3ZWVucyByZW5kZXJpbmcgdGhlaXIgVkVSWSBlbmQuIElmIHdlIHRoZW4gcmV2ZXJzZSgpIHRoYXQgdGltZWxpbmUsIHRoZSB6ZXJvLWR1cmF0aW9uIHR3ZWVuIHdpbGwgdHJpZ2dlciBpdHMgb25SZXZlcnNlQ29tcGxldGUgZXZlbiB0aG91Z2ggdGVjaG5pY2FsbHkgdGhlIHBsYXloZWFkIGRpZG4ndCBwYXNzIG92ZXIgaXQgYWdhaW4uIEl0J3MgYSB2ZXJ5IHNwZWNpZmljIGVkZ2UgY2FzZSB3ZSBtdXN0IGFjY29tbW9kYXRlLlxuXHRcdFx0XHRcdFx0dGltZSA9IDA7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdGlmIChwcmV2UmF3UHJldlRpbWUgPCAwIHx8ICh0aW1lIDw9IDAgJiYgdGltZSA+PSAtMC4wMDAwMDAxKSB8fCAocHJldlJhd1ByZXZUaW1lID09PSBfdGlueU51bSAmJiB0aGlzLmRhdGEgIT09IFwiaXNQYXVzZVwiKSkgaWYgKHByZXZSYXdQcmV2VGltZSAhPT0gdGltZSkgeyAvL25vdGU6IHdoZW4gdGhpcy5kYXRhIGlzIFwiaXNQYXVzZVwiLCBpdCdzIGEgY2FsbGJhY2sgYWRkZWQgYnkgYWRkUGF1c2UoKSBvbiBhIHRpbWVsaW5lIHRoYXQgd2Ugc2hvdWxkIG5vdCBiZSB0cmlnZ2VyZWQgd2hlbiBMRUFWSU5HIGl0cyBleGFjdCBzdGFydCB0aW1lLiBJbiBvdGhlciB3b3JkcywgdGwuYWRkUGF1c2UoMSkucGxheSgxKSBzaG91bGRuJ3QgcGF1c2UuXG5cdFx0XHRcdFx0XHRmb3JjZSA9IHRydWU7XG5cdFx0XHRcdFx0XHRpZiAocHJldlJhd1ByZXZUaW1lID4gX3RpbnlOdW0pIHtcblx0XHRcdFx0XHRcdFx0Y2FsbGJhY2sgPSBcIm9uUmV2ZXJzZUNvbXBsZXRlXCI7XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdHRoaXMuX3Jhd1ByZXZUaW1lID0gcmF3UHJldlRpbWUgPSAoIXN1cHByZXNzRXZlbnRzIHx8IHRpbWUgfHwgcHJldlJhd1ByZXZUaW1lID09PSB0aW1lKSA/IHRpbWUgOiBfdGlueU51bTsgLy93aGVuIHRoZSBwbGF5aGVhZCBhcnJpdmVzIGF0IEVYQUNUTFkgdGltZSAwIChyaWdodCBvbiB0b3ApIG9mIGEgemVyby1kdXJhdGlvbiB0d2Vlbiwgd2UgbmVlZCB0byBkaXNjZXJuIGlmIGV2ZW50cyBhcmUgc3VwcHJlc3NlZCBzbyB0aGF0IHdoZW4gdGhlIHBsYXloZWFkIG1vdmVzIGFnYWluIChuZXh0IHRpbWUpLCBpdCdsbCB0cmlnZ2VyIHRoZSBjYWxsYmFjay4gSWYgZXZlbnRzIGFyZSBOT1Qgc3VwcHJlc3NlZCwgb2J2aW91c2x5IHRoZSBjYWxsYmFjayB3b3VsZCBiZSB0cmlnZ2VyZWQgaW4gdGhpcyByZW5kZXIuIEJhc2ljYWxseSwgdGhlIGNhbGxiYWNrIHNob3VsZCBmaXJlIGVpdGhlciB3aGVuIHRoZSBwbGF5aGVhZCBBUlJJVkVTIG9yIExFQVZFUyB0aGlzIGV4YWN0IHNwb3QsIG5vdCBib3RoLiBJbWFnaW5lIGRvaW5nIGEgdGltZWxpbmUuc2VlaygwKSBhbmQgdGhlcmUncyBhIGNhbGxiYWNrIHRoYXQgc2l0cyBhdCAwLiBTaW5jZSBldmVudHMgYXJlIHN1cHByZXNzZWQgb24gdGhhdCBzZWVrKCkgYnkgZGVmYXVsdCwgbm90aGluZyB3aWxsIGZpcmUsIGJ1dCB3aGVuIHRoZSBwbGF5aGVhZCBtb3ZlcyBvZmYgb2YgdGhhdCBwb3NpdGlvbiwgdGhlIGNhbGxiYWNrIHNob3VsZCBmaXJlLiBUaGlzIGJlaGF2aW9yIGlzIHdoYXQgcGVvcGxlIGludHVpdGl2ZWx5IGV4cGVjdC4gV2Ugc2V0IHRoZSBfcmF3UHJldlRpbWUgdG8gYmUgYSBwcmVjaXNlIHRpbnkgbnVtYmVyIHRvIGluZGljYXRlIHRoaXMgc2NlbmFyaW8gcmF0aGVyIHRoYW4gdXNpbmcgYW5vdGhlciBwcm9wZXJ0eS92YXJpYWJsZSB3aGljaCB3b3VsZCBpbmNyZWFzZSBtZW1vcnkgdXNhZ2UuIFRoaXMgdGVjaG5pcXVlIGlzIGxlc3MgcmVhZGFibGUsIGJ1dCBtb3JlIGVmZmljaWVudC5cblx0XHRcdFx0fVxuXG5cdFx0XHR9IGVsc2UgaWYgKHRpbWUgPCAwLjAwMDAwMDEpIHsgLy90byB3b3JrIGFyb3VuZCBvY2Nhc2lvbmFsIGZsb2F0aW5nIHBvaW50IG1hdGggYXJ0aWZhY3RzLCByb3VuZCBzdXBlciBzbWFsbCB2YWx1ZXMgdG8gMC5cblx0XHRcdFx0dGhpcy5fdG90YWxUaW1lID0gdGhpcy5fdGltZSA9IDA7XG5cdFx0XHRcdHRoaXMucmF0aW8gPSB0aGlzLl9lYXNlLl9jYWxjRW5kID8gdGhpcy5fZWFzZS5nZXRSYXRpbygwKSA6IDA7XG5cdFx0XHRcdGlmIChwcmV2VGltZSAhPT0gMCB8fCAoZHVyYXRpb24gPT09IDAgJiYgcHJldlJhd1ByZXZUaW1lID4gMCkpIHtcblx0XHRcdFx0XHRjYWxsYmFjayA9IFwib25SZXZlcnNlQ29tcGxldGVcIjtcblx0XHRcdFx0XHRpc0NvbXBsZXRlID0gdGhpcy5fcmV2ZXJzZWQ7XG5cdFx0XHRcdH1cblx0XHRcdFx0aWYgKHRpbWUgPCAwKSB7XG5cdFx0XHRcdFx0dGhpcy5fYWN0aXZlID0gZmFsc2U7XG5cdFx0XHRcdFx0aWYgKGR1cmF0aW9uID09PSAwKSBpZiAodGhpcy5faW5pdHRlZCB8fCAhdGhpcy52YXJzLmxhenkgfHwgZm9yY2UpIHsgLy96ZXJvLWR1cmF0aW9uIHR3ZWVucyBhcmUgdHJpY2t5IGJlY2F1c2Ugd2UgbXVzdCBkaXNjZXJuIHRoZSBtb21lbnR1bS9kaXJlY3Rpb24gb2YgdGltZSBpbiBvcmRlciB0byBkZXRlcm1pbmUgd2hldGhlciB0aGUgc3RhcnRpbmcgdmFsdWVzIHNob3VsZCBiZSByZW5kZXJlZCBvciB0aGUgZW5kaW5nIHZhbHVlcy4gSWYgdGhlIFwicGxheWhlYWRcIiBvZiBpdHMgdGltZWxpbmUgZ29lcyBwYXN0IHRoZSB6ZXJvLWR1cmF0aW9uIHR3ZWVuIGluIHRoZSBmb3J3YXJkIGRpcmVjdGlvbiBvciBsYW5kcyBkaXJlY3RseSBvbiBpdCwgdGhlIGVuZCB2YWx1ZXMgc2hvdWxkIGJlIHJlbmRlcmVkLCBidXQgaWYgdGhlIHRpbWVsaW5lJ3MgXCJwbGF5aGVhZFwiIG1vdmVzIHBhc3QgaXQgaW4gdGhlIGJhY2t3YXJkIGRpcmVjdGlvbiAoZnJvbSBhIHBvc3RpdGl2ZSB0aW1lIHRvIGEgbmVnYXRpdmUgdGltZSksIHRoZSBzdGFydGluZyB2YWx1ZXMgbXVzdCBiZSByZW5kZXJlZC5cblx0XHRcdFx0XHRcdGlmIChwcmV2UmF3UHJldlRpbWUgPj0gMCAmJiAhKHByZXZSYXdQcmV2VGltZSA9PT0gX3RpbnlOdW0gJiYgdGhpcy5kYXRhID09PSBcImlzUGF1c2VcIikpIHtcblx0XHRcdFx0XHRcdFx0Zm9yY2UgPSB0cnVlO1xuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0dGhpcy5fcmF3UHJldlRpbWUgPSByYXdQcmV2VGltZSA9ICghc3VwcHJlc3NFdmVudHMgfHwgdGltZSB8fCBwcmV2UmF3UHJldlRpbWUgPT09IHRpbWUpID8gdGltZSA6IF90aW55TnVtOyAvL3doZW4gdGhlIHBsYXloZWFkIGFycml2ZXMgYXQgRVhBQ1RMWSB0aW1lIDAgKHJpZ2h0IG9uIHRvcCkgb2YgYSB6ZXJvLWR1cmF0aW9uIHR3ZWVuLCB3ZSBuZWVkIHRvIGRpc2Nlcm4gaWYgZXZlbnRzIGFyZSBzdXBwcmVzc2VkIHNvIHRoYXQgd2hlbiB0aGUgcGxheWhlYWQgbW92ZXMgYWdhaW4gKG5leHQgdGltZSksIGl0J2xsIHRyaWdnZXIgdGhlIGNhbGxiYWNrLiBJZiBldmVudHMgYXJlIE5PVCBzdXBwcmVzc2VkLCBvYnZpb3VzbHkgdGhlIGNhbGxiYWNrIHdvdWxkIGJlIHRyaWdnZXJlZCBpbiB0aGlzIHJlbmRlci4gQmFzaWNhbGx5LCB0aGUgY2FsbGJhY2sgc2hvdWxkIGZpcmUgZWl0aGVyIHdoZW4gdGhlIHBsYXloZWFkIEFSUklWRVMgb3IgTEVBVkVTIHRoaXMgZXhhY3Qgc3BvdCwgbm90IGJvdGguIEltYWdpbmUgZG9pbmcgYSB0aW1lbGluZS5zZWVrKDApIGFuZCB0aGVyZSdzIGEgY2FsbGJhY2sgdGhhdCBzaXRzIGF0IDAuIFNpbmNlIGV2ZW50cyBhcmUgc3VwcHJlc3NlZCBvbiB0aGF0IHNlZWsoKSBieSBkZWZhdWx0LCBub3RoaW5nIHdpbGwgZmlyZSwgYnV0IHdoZW4gdGhlIHBsYXloZWFkIG1vdmVzIG9mZiBvZiB0aGF0IHBvc2l0aW9uLCB0aGUgY2FsbGJhY2sgc2hvdWxkIGZpcmUuIFRoaXMgYmVoYXZpb3IgaXMgd2hhdCBwZW9wbGUgaW50dWl0aXZlbHkgZXhwZWN0LiBXZSBzZXQgdGhlIF9yYXdQcmV2VGltZSB0byBiZSBhIHByZWNpc2UgdGlueSBudW1iZXIgdG8gaW5kaWNhdGUgdGhpcyBzY2VuYXJpbyByYXRoZXIgdGhhbiB1c2luZyBhbm90aGVyIHByb3BlcnR5L3ZhcmlhYmxlIHdoaWNoIHdvdWxkIGluY3JlYXNlIG1lbW9yeSB1c2FnZS4gVGhpcyB0ZWNobmlxdWUgaXMgbGVzcyByZWFkYWJsZSwgYnV0IG1vcmUgZWZmaWNpZW50LlxuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXHRcdFx0XHRpZiAoIXRoaXMuX2luaXR0ZWQpIHsgLy9pZiB3ZSByZW5kZXIgdGhlIHZlcnkgYmVnaW5uaW5nICh0aW1lID09IDApIG9mIGEgZnJvbVRvKCksIHdlIG11c3QgZm9yY2UgdGhlIHJlbmRlciAobm9ybWFsIHR3ZWVucyB3b3VsZG4ndCBuZWVkIHRvIHJlbmRlciBhdCBhIHRpbWUgb2YgMCB3aGVuIHRoZSBwcmV2VGltZSB3YXMgYWxzbyAwKS4gVGhpcyBpcyBhbHNvIG1hbmRhdG9yeSB0byBtYWtlIHN1cmUgb3ZlcndyaXRpbmcga2lja3MgaW4gaW1tZWRpYXRlbHkuXG5cdFx0XHRcdFx0Zm9yY2UgPSB0cnVlO1xuXHRcdFx0XHR9XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHR0aGlzLl90b3RhbFRpbWUgPSB0aGlzLl90aW1lID0gdGltZTtcblxuXHRcdFx0XHRpZiAodGhpcy5fZWFzZVR5cGUpIHtcblx0XHRcdFx0XHR2YXIgciA9IHRpbWUgLyBkdXJhdGlvbiwgdHlwZSA9IHRoaXMuX2Vhc2VUeXBlLCBwb3cgPSB0aGlzLl9lYXNlUG93ZXI7XG5cdFx0XHRcdFx0aWYgKHR5cGUgPT09IDEgfHwgKHR5cGUgPT09IDMgJiYgciA+PSAwLjUpKSB7XG5cdFx0XHRcdFx0XHRyID0gMSAtIHI7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdGlmICh0eXBlID09PSAzKSB7XG5cdFx0XHRcdFx0XHRyICo9IDI7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdGlmIChwb3cgPT09IDEpIHtcblx0XHRcdFx0XHRcdHIgKj0gcjtcblx0XHRcdFx0XHR9IGVsc2UgaWYgKHBvdyA9PT0gMikge1xuXHRcdFx0XHRcdFx0ciAqPSByICogcjtcblx0XHRcdFx0XHR9IGVsc2UgaWYgKHBvdyA9PT0gMykge1xuXHRcdFx0XHRcdFx0ciAqPSByICogciAqIHI7XG5cdFx0XHRcdFx0fSBlbHNlIGlmIChwb3cgPT09IDQpIHtcblx0XHRcdFx0XHRcdHIgKj0gciAqIHIgKiByICogcjtcblx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHRpZiAodHlwZSA9PT0gMSkge1xuXHRcdFx0XHRcdFx0dGhpcy5yYXRpbyA9IDEgLSByO1xuXHRcdFx0XHRcdH0gZWxzZSBpZiAodHlwZSA9PT0gMikge1xuXHRcdFx0XHRcdFx0dGhpcy5yYXRpbyA9IHI7XG5cdFx0XHRcdFx0fSBlbHNlIGlmICh0aW1lIC8gZHVyYXRpb24gPCAwLjUpIHtcblx0XHRcdFx0XHRcdHRoaXMucmF0aW8gPSByIC8gMjtcblx0XHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdFx0dGhpcy5yYXRpbyA9IDEgLSAociAvIDIpO1xuXHRcdFx0XHRcdH1cblxuXHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdHRoaXMucmF0aW8gPSB0aGlzLl9lYXNlLmdldFJhdGlvKHRpbWUgLyBkdXJhdGlvbik7XG5cdFx0XHRcdH1cblx0XHRcdH1cblxuXHRcdFx0aWYgKHRoaXMuX3RpbWUgPT09IHByZXZUaW1lICYmICFmb3JjZSkge1xuXHRcdFx0XHRyZXR1cm47XG5cdFx0XHR9IGVsc2UgaWYgKCF0aGlzLl9pbml0dGVkKSB7XG5cdFx0XHRcdHRoaXMuX2luaXQoKTtcblx0XHRcdFx0aWYgKCF0aGlzLl9pbml0dGVkIHx8IHRoaXMuX2djKSB7IC8vaW1tZWRpYXRlUmVuZGVyIHR3ZWVucyB0eXBpY2FsbHkgd29uJ3QgaW5pdGlhbGl6ZSB1bnRpbCB0aGUgcGxheWhlYWQgYWR2YW5jZXMgKF90aW1lIGlzIGdyZWF0ZXIgdGhhbiAwKSBpbiBvcmRlciB0byBlbnN1cmUgdGhhdCBvdmVyd3JpdGluZyBvY2N1cnMgcHJvcGVybHkuIEFsc28sIGlmIGFsbCBvZiB0aGUgdHdlZW5pbmcgcHJvcGVydGllcyBoYXZlIGJlZW4gb3ZlcndyaXR0ZW4gKHdoaWNoIHdvdWxkIGNhdXNlIF9nYyB0byBiZSB0cnVlLCBhcyBzZXQgaW4gX2luaXQoKSksIHdlIHNob3VsZG4ndCBjb250aW51ZSBvdGhlcndpc2UgYW4gb25TdGFydCBjYWxsYmFjayBjb3VsZCBiZSBjYWxsZWQgZm9yIGV4YW1wbGUuXG5cdFx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0XHR9IGVsc2UgaWYgKCFmb3JjZSAmJiB0aGlzLl9maXJzdFBUICYmICgodGhpcy52YXJzLmxhenkgIT09IGZhbHNlICYmIHRoaXMuX2R1cmF0aW9uKSB8fCAodGhpcy52YXJzLmxhenkgJiYgIXRoaXMuX2R1cmF0aW9uKSkpIHtcblx0XHRcdFx0XHR0aGlzLl90aW1lID0gdGhpcy5fdG90YWxUaW1lID0gcHJldlRpbWU7XG5cdFx0XHRcdFx0dGhpcy5fcmF3UHJldlRpbWUgPSBwcmV2UmF3UHJldlRpbWU7XG5cdFx0XHRcdFx0X2xhenlUd2VlbnMucHVzaCh0aGlzKTtcblx0XHRcdFx0XHR0aGlzLl9sYXp5ID0gW3RpbWUsIHN1cHByZXNzRXZlbnRzXTtcblx0XHRcdFx0XHRyZXR1cm47XG5cdFx0XHRcdH1cblx0XHRcdFx0Ly9fZWFzZSBpcyBpbml0aWFsbHkgc2V0IHRvIGRlZmF1bHRFYXNlLCBzbyBub3cgdGhhdCBpbml0KCkgaGFzIHJ1biwgX2Vhc2UgaXMgc2V0IHByb3Blcmx5IGFuZCB3ZSBuZWVkIHRvIHJlY2FsY3VsYXRlIHRoZSByYXRpby4gT3ZlcmFsbCB0aGlzIGlzIGZhc3RlciB0aGFuIHVzaW5nIGNvbmRpdGlvbmFsIGxvZ2ljIGVhcmxpZXIgaW4gdGhlIG1ldGhvZCB0byBhdm9pZCBoYXZpbmcgdG8gc2V0IHJhdGlvIHR3aWNlIGJlY2F1c2Ugd2Ugb25seSBpbml0KCkgb25jZSBidXQgcmVuZGVyVGltZSgpIGdldHMgY2FsbGVkIFZFUlkgZnJlcXVlbnRseS5cblx0XHRcdFx0aWYgKHRoaXMuX3RpbWUgJiYgIWlzQ29tcGxldGUpIHtcblx0XHRcdFx0XHR0aGlzLnJhdGlvID0gdGhpcy5fZWFzZS5nZXRSYXRpbyh0aGlzLl90aW1lIC8gZHVyYXRpb24pO1xuXHRcdFx0XHR9IGVsc2UgaWYgKGlzQ29tcGxldGUgJiYgdGhpcy5fZWFzZS5fY2FsY0VuZCkge1xuXHRcdFx0XHRcdHRoaXMucmF0aW8gPSB0aGlzLl9lYXNlLmdldFJhdGlvKCh0aGlzLl90aW1lID09PSAwKSA/IDAgOiAxKTtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdFx0aWYgKHRoaXMuX2xhenkgIT09IGZhbHNlKSB7IC8vaW4gY2FzZSBhIGxhenkgcmVuZGVyIGlzIHBlbmRpbmcsIHdlIHNob3VsZCBmbHVzaCBpdCBiZWNhdXNlIHRoZSBuZXcgcmVuZGVyIGlzIG9jY3VycmluZyBub3cgKGltYWdpbmUgYSBsYXp5IHR3ZWVuIGluc3RhbnRpYXRpbmcgYW5kIHRoZW4gaW1tZWRpYXRlbHkgdGhlIHVzZXIgY2FsbHMgdHdlZW4uc2Vlayh0d2Vlbi5kdXJhdGlvbigpKSwgc2tpcHBpbmcgdG8gdGhlIGVuZCAtIHRoZSBlbmQgcmVuZGVyIHdvdWxkIGJlIGZvcmNlZCwgYW5kIHRoZW4gaWYgd2UgZGlkbid0IGZsdXNoIHRoZSBsYXp5IHJlbmRlciwgaXQnZCBmaXJlIEFGVEVSIHRoZSBzZWVrKCksIHJlbmRlcmluZyBpdCBhdCB0aGUgd3JvbmcgdGltZS5cblx0XHRcdFx0dGhpcy5fbGF6eSA9IGZhbHNlO1xuXHRcdFx0fVxuXHRcdFx0aWYgKCF0aGlzLl9hY3RpdmUpIGlmICghdGhpcy5fcGF1c2VkICYmIHRoaXMuX3RpbWUgIT09IHByZXZUaW1lICYmIHRpbWUgPj0gMCkge1xuXHRcdFx0XHR0aGlzLl9hY3RpdmUgPSB0cnVlOyAgLy9zbyB0aGF0IGlmIHRoZSB1c2VyIHJlbmRlcnMgYSB0d2VlbiAoYXMgb3Bwb3NlZCB0byB0aGUgdGltZWxpbmUgcmVuZGVyaW5nIGl0KSwgdGhlIHRpbWVsaW5lIGlzIGZvcmNlZCB0byByZS1yZW5kZXIgYW5kIGFsaWduIGl0IHdpdGggdGhlIHByb3BlciB0aW1lL2ZyYW1lIG9uIHRoZSBuZXh0IHJlbmRlcmluZyBjeWNsZS4gTWF5YmUgdGhlIHR3ZWVuIGFscmVhZHkgZmluaXNoZWQgYnV0IHRoZSB1c2VyIG1hbnVhbGx5IHJlLXJlbmRlcnMgaXQgYXMgaGFsZndheSBkb25lLlxuXHRcdFx0fVxuXHRcdFx0aWYgKHByZXZUaW1lID09PSAwKSB7XG5cdFx0XHRcdGlmICh0aGlzLl9zdGFydEF0KSB7XG5cdFx0XHRcdFx0aWYgKHRpbWUgPj0gMCkge1xuXHRcdFx0XHRcdFx0dGhpcy5fc3RhcnRBdC5yZW5kZXIodGltZSwgc3VwcHJlc3NFdmVudHMsIGZvcmNlKTtcblx0XHRcdFx0XHR9IGVsc2UgaWYgKCFjYWxsYmFjaykge1xuXHRcdFx0XHRcdFx0Y2FsbGJhY2sgPSBcIl9kdW1teUdTXCI7IC8vaWYgbm8gY2FsbGJhY2sgaXMgZGVmaW5lZCwgdXNlIGEgZHVtbXkgdmFsdWUganVzdCBzbyB0aGF0IHRoZSBjb25kaXRpb24gYXQgdGhlIGVuZCBldmFsdWF0ZXMgYXMgdHJ1ZSBiZWNhdXNlIF9zdGFydEF0IHNob3VsZCByZW5kZXIgQUZURVIgdGhlIG5vcm1hbCByZW5kZXIgbG9vcCB3aGVuIHRoZSB0aW1lIGlzIG5lZ2F0aXZlLiBXZSBjb3VsZCBoYW5kbGUgdGhpcyBpbiBhIG1vcmUgaW50dWl0aXZlIHdheSwgb2YgY291cnNlLCBidXQgdGhlIHJlbmRlciBsb29wIGlzIHRoZSBNT1NUIGltcG9ydGFudCB0aGluZyB0byBvcHRpbWl6ZSwgc28gdGhpcyB0ZWNobmlxdWUgYWxsb3dzIHVzIHRvIGF2b2lkIGFkZGluZyBleHRyYSBjb25kaXRpb25hbCBsb2dpYyBpbiBhIGhpZ2gtZnJlcXVlbmN5IGFyZWEuXG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cdFx0XHRcdGlmICh0aGlzLnZhcnMub25TdGFydCkgaWYgKHRoaXMuX3RpbWUgIT09IDAgfHwgZHVyYXRpb24gPT09IDApIGlmICghc3VwcHJlc3NFdmVudHMpIHtcblx0XHRcdFx0XHR0aGlzLl9jYWxsYmFjayhcIm9uU3RhcnRcIik7XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHRcdHB0ID0gdGhpcy5fZmlyc3RQVDtcblx0XHRcdHdoaWxlIChwdCkge1xuXHRcdFx0XHRpZiAocHQuZikge1xuXHRcdFx0XHRcdHB0LnRbcHQucF0ocHQuYyAqIHRoaXMucmF0aW8gKyBwdC5zKTtcblx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRwdC50W3B0LnBdID0gcHQuYyAqIHRoaXMucmF0aW8gKyBwdC5zO1xuXHRcdFx0XHR9XG5cdFx0XHRcdHB0ID0gcHQuX25leHQ7XG5cdFx0XHR9XG5cblx0XHRcdGlmICh0aGlzLl9vblVwZGF0ZSkge1xuXHRcdFx0XHRpZiAodGltZSA8IDApIGlmICh0aGlzLl9zdGFydEF0ICYmIHRpbWUgIT09IC0wLjAwMDEpIHsgLy9pZiB0aGUgdHdlZW4gaXMgcG9zaXRpb25lZCBhdCB0aGUgVkVSWSBiZWdpbm5pbmcgKF9zdGFydFRpbWUgMCkgb2YgaXRzIHBhcmVudCB0aW1lbGluZSwgaXQncyBpbGxlZ2FsIGZvciB0aGUgcGxheWhlYWQgdG8gZ28gYmFjayBmdXJ0aGVyLCBzbyB3ZSBzaG91bGQgbm90IHJlbmRlciB0aGUgcmVjb3JkZWQgc3RhcnRBdCB2YWx1ZXMuXG5cdFx0XHRcdFx0dGhpcy5fc3RhcnRBdC5yZW5kZXIodGltZSwgc3VwcHJlc3NFdmVudHMsIGZvcmNlKTsgLy9ub3RlOiBmb3IgcGVyZm9ybWFuY2UgcmVhc29ucywgd2UgdHVjayB0aGlzIGNvbmRpdGlvbmFsIGxvZ2ljIGluc2lkZSBsZXNzIHRyYXZlbGVkIGFyZWFzIChtb3N0IHR3ZWVucyBkb24ndCBoYXZlIGFuIG9uVXBkYXRlKS4gV2UnZCBqdXN0IGhhdmUgaXQgYXQgdGhlIGVuZCBiZWZvcmUgdGhlIG9uQ29tcGxldGUsIGJ1dCB0aGUgdmFsdWVzIHNob3VsZCBiZSB1cGRhdGVkIGJlZm9yZSBhbnkgb25VcGRhdGUgaXMgY2FsbGVkLCBzbyB3ZSBBTFNPIHB1dCBpdCBoZXJlIGFuZCB0aGVuIGlmIGl0J3Mgbm90IGNhbGxlZCwgd2UgZG8gc28gbGF0ZXIgbmVhciB0aGUgb25Db21wbGV0ZS5cblx0XHRcdFx0fVxuXHRcdFx0XHRpZiAoIXN1cHByZXNzRXZlbnRzKSBpZiAodGhpcy5fdGltZSAhPT0gcHJldlRpbWUgfHwgaXNDb21wbGV0ZSkge1xuXHRcdFx0XHRcdHRoaXMuX2NhbGxiYWNrKFwib25VcGRhdGVcIik7XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHRcdGlmIChjYWxsYmFjaykgaWYgKCF0aGlzLl9nYyB8fCBmb3JjZSkgeyAvL2NoZWNrIF9nYyBiZWNhdXNlIHRoZXJlJ3MgYSBjaGFuY2UgdGhhdCBraWxsKCkgY291bGQgYmUgY2FsbGVkIGluIGFuIG9uVXBkYXRlXG5cdFx0XHRcdGlmICh0aW1lIDwgMCAmJiB0aGlzLl9zdGFydEF0ICYmICF0aGlzLl9vblVwZGF0ZSAmJiB0aW1lICE9PSAtMC4wMDAxKSB7IC8vLTAuMDAwMSBpcyBhIHNwZWNpYWwgdmFsdWUgdGhhdCB3ZSB1c2Ugd2hlbiBsb29waW5nIGJhY2sgdG8gdGhlIGJlZ2lubmluZyBvZiBhIHJlcGVhdGVkIFRpbWVsaW5lTWF4LCBpbiB3aGljaCBjYXNlIHdlIHNob3VsZG4ndCByZW5kZXIgdGhlIF9zdGFydEF0IHZhbHVlcy5cblx0XHRcdFx0XHR0aGlzLl9zdGFydEF0LnJlbmRlcih0aW1lLCBzdXBwcmVzc0V2ZW50cywgZm9yY2UpO1xuXHRcdFx0XHR9XG5cdFx0XHRcdGlmIChpc0NvbXBsZXRlKSB7XG5cdFx0XHRcdFx0aWYgKHRoaXMuX3RpbWVsaW5lLmF1dG9SZW1vdmVDaGlsZHJlbikge1xuXHRcdFx0XHRcdFx0dGhpcy5fZW5hYmxlZChmYWxzZSwgZmFsc2UpO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHR0aGlzLl9hY3RpdmUgPSBmYWxzZTtcblx0XHRcdFx0fVxuXHRcdFx0XHRpZiAoIXN1cHByZXNzRXZlbnRzICYmIHRoaXMudmFyc1tjYWxsYmFja10pIHtcblx0XHRcdFx0XHR0aGlzLl9jYWxsYmFjayhjYWxsYmFjayk7XG5cdFx0XHRcdH1cblx0XHRcdFx0aWYgKGR1cmF0aW9uID09PSAwICYmIHRoaXMuX3Jhd1ByZXZUaW1lID09PSBfdGlueU51bSAmJiByYXdQcmV2VGltZSAhPT0gX3RpbnlOdW0pIHsgLy90aGUgb25Db21wbGV0ZSBvciBvblJldmVyc2VDb21wbGV0ZSBjb3VsZCB0cmlnZ2VyIG1vdmVtZW50IG9mIHRoZSBwbGF5aGVhZCBhbmQgZm9yIHplcm8tZHVyYXRpb24gdHdlZW5zICh3aGljaCBtdXN0IGRpc2Nlcm4gZGlyZWN0aW9uKSB0aGF0IGxhbmQgZGlyZWN0bHkgYmFjayBvbiB0aGVpciBzdGFydCB0aW1lLCB3ZSBkb24ndCB3YW50IHRvIGZpcmUgYWdhaW4gb24gdGhlIG5leHQgcmVuZGVyLiBUaGluayBvZiBzZXZlcmFsIGFkZFBhdXNlKCkncyBpbiBhIHRpbWVsaW5lIHRoYXQgZm9yY2VzIHRoZSBwbGF5aGVhZCB0byBhIGNlcnRhaW4gc3BvdCwgYnV0IHdoYXQgaWYgaXQncyBhbHJlYWR5IHBhdXNlZCBhbmQgYW5vdGhlciB0d2VlbiBpcyB0d2VlbmluZyB0aGUgXCJ0aW1lXCIgb2YgdGhlIHRpbWVsaW5lPyBFYWNoIHRpbWUgaXQgbW92ZXMgW2ZvcndhcmRdIHBhc3QgdGhhdCBzcG90LCBpdCB3b3VsZCBtb3ZlIGJhY2ssIGFuZCBzaW5jZSBzdXBwcmVzc0V2ZW50cyBpcyB0cnVlLCBpdCdkIHJlc2V0IF9yYXdQcmV2VGltZSB0byBfdGlueU51bSBzbyB0aGF0IHdoZW4gaXQgYmVnaW5zIGFnYWluLCB0aGUgY2FsbGJhY2sgd291bGQgZmlyZSAoc28gdWx0aW1hdGVseSBpdCBjb3VsZCBib3VuY2UgYmFjayBhbmQgZm9ydGggZHVyaW5nIHRoYXQgdHdlZW4pLiBBZ2FpbiwgdGhpcyBpcyBhIHZlcnkgdW5jb21tb24gc2NlbmFyaW8sIGJ1dCBwb3NzaWJsZSBub25ldGhlbGVzcy5cblx0XHRcdFx0XHR0aGlzLl9yYXdQcmV2VGltZSA9IDA7XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9O1xuXG5cdFx0cC5fa2lsbCA9IGZ1bmN0aW9uKHZhcnMsIHRhcmdldCwgb3ZlcndyaXRpbmdUd2Vlbikge1xuXHRcdFx0aWYgKHZhcnMgPT09IFwiYWxsXCIpIHtcblx0XHRcdFx0dmFycyA9IG51bGw7XG5cdFx0XHR9XG5cdFx0XHRpZiAodmFycyA9PSBudWxsKSBpZiAodGFyZ2V0ID09IG51bGwgfHwgdGFyZ2V0ID09PSB0aGlzLnRhcmdldCkge1xuXHRcdFx0XHR0aGlzLl9sYXp5ID0gZmFsc2U7XG5cdFx0XHRcdHJldHVybiB0aGlzLl9lbmFibGVkKGZhbHNlLCBmYWxzZSk7XG5cdFx0XHR9XG5cdFx0XHR0YXJnZXQgPSAodHlwZW9mKHRhcmdldCkgIT09IFwic3RyaW5nXCIpID8gKHRhcmdldCB8fCB0aGlzLl90YXJnZXRzIHx8IHRoaXMudGFyZ2V0KSA6IFR3ZWVuTGl0ZS5zZWxlY3Rvcih0YXJnZXQpIHx8IHRhcmdldDtcblx0XHRcdHZhciBzaW11bHRhbmVvdXNPdmVyd3JpdGUgPSAob3ZlcndyaXRpbmdUd2VlbiAmJiB0aGlzLl90aW1lICYmIG92ZXJ3cml0aW5nVHdlZW4uX3N0YXJ0VGltZSA9PT0gdGhpcy5fc3RhcnRUaW1lICYmIHRoaXMuX3RpbWVsaW5lID09PSBvdmVyd3JpdGluZ1R3ZWVuLl90aW1lbGluZSksXG5cdFx0XHRcdGksIG92ZXJ3cml0dGVuUHJvcHMsIHAsIHB0LCBwcm9wTG9va3VwLCBjaGFuZ2VkLCBraWxsUHJvcHMsIHJlY29yZCwga2lsbGVkO1xuXHRcdFx0aWYgKChfaXNBcnJheSh0YXJnZXQpIHx8IF9pc1NlbGVjdG9yKHRhcmdldCkpICYmIHR5cGVvZih0YXJnZXRbMF0pICE9PSBcIm51bWJlclwiKSB7XG5cdFx0XHRcdGkgPSB0YXJnZXQubGVuZ3RoO1xuXHRcdFx0XHR3aGlsZSAoLS1pID4gLTEpIHtcblx0XHRcdFx0XHRpZiAodGhpcy5fa2lsbCh2YXJzLCB0YXJnZXRbaV0sIG92ZXJ3cml0aW5nVHdlZW4pKSB7XG5cdFx0XHRcdFx0XHRjaGFuZ2VkID0gdHJ1ZTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdGlmICh0aGlzLl90YXJnZXRzKSB7XG5cdFx0XHRcdFx0aSA9IHRoaXMuX3RhcmdldHMubGVuZ3RoO1xuXHRcdFx0XHRcdHdoaWxlICgtLWkgPiAtMSkge1xuXHRcdFx0XHRcdFx0aWYgKHRhcmdldCA9PT0gdGhpcy5fdGFyZ2V0c1tpXSkge1xuXHRcdFx0XHRcdFx0XHRwcm9wTG9va3VwID0gdGhpcy5fcHJvcExvb2t1cFtpXSB8fCB7fTtcblx0XHRcdFx0XHRcdFx0dGhpcy5fb3ZlcndyaXR0ZW5Qcm9wcyA9IHRoaXMuX292ZXJ3cml0dGVuUHJvcHMgfHwgW107XG5cdFx0XHRcdFx0XHRcdG92ZXJ3cml0dGVuUHJvcHMgPSB0aGlzLl9vdmVyd3JpdHRlblByb3BzW2ldID0gdmFycyA/IHRoaXMuX292ZXJ3cml0dGVuUHJvcHNbaV0gfHwge30gOiBcImFsbFwiO1xuXHRcdFx0XHRcdFx0XHRicmVhaztcblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHR9XG5cdFx0XHRcdH0gZWxzZSBpZiAodGFyZ2V0ICE9PSB0aGlzLnRhcmdldCkge1xuXHRcdFx0XHRcdHJldHVybiBmYWxzZTtcblx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRwcm9wTG9va3VwID0gdGhpcy5fcHJvcExvb2t1cDtcblx0XHRcdFx0XHRvdmVyd3JpdHRlblByb3BzID0gdGhpcy5fb3ZlcndyaXR0ZW5Qcm9wcyA9IHZhcnMgPyB0aGlzLl9vdmVyd3JpdHRlblByb3BzIHx8IHt9IDogXCJhbGxcIjtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdGlmIChwcm9wTG9va3VwKSB7XG5cdFx0XHRcdFx0a2lsbFByb3BzID0gdmFycyB8fCBwcm9wTG9va3VwO1xuXHRcdFx0XHRcdHJlY29yZCA9ICh2YXJzICE9PSBvdmVyd3JpdHRlblByb3BzICYmIG92ZXJ3cml0dGVuUHJvcHMgIT09IFwiYWxsXCIgJiYgdmFycyAhPT0gcHJvcExvb2t1cCAmJiAodHlwZW9mKHZhcnMpICE9PSBcIm9iamVjdFwiIHx8ICF2YXJzLl90ZW1wS2lsbCkpOyAvL190ZW1wS2lsbCBpcyBhIHN1cGVyLXNlY3JldCB3YXkgdG8gZGVsZXRlIGEgcGFydGljdWxhciB0d2VlbmluZyBwcm9wZXJ0eSBidXQgTk9UIGhhdmUgaXQgcmVtZW1iZXJlZCBhcyBhbiBvZmZpY2lhbCBvdmVyd3JpdHRlbiBwcm9wZXJ0eSAobGlrZSBpbiBCZXppZXJQbHVnaW4pXG5cdFx0XHRcdFx0aWYgKG92ZXJ3cml0aW5nVHdlZW4gJiYgKFR3ZWVuTGl0ZS5vbk92ZXJ3cml0ZSB8fCB0aGlzLnZhcnMub25PdmVyd3JpdGUpKSB7XG5cdFx0XHRcdFx0XHRmb3IgKHAgaW4ga2lsbFByb3BzKSB7XG5cdFx0XHRcdFx0XHRcdGlmIChwcm9wTG9va3VwW3BdKSB7XG5cdFx0XHRcdFx0XHRcdFx0aWYgKCFraWxsZWQpIHtcblx0XHRcdFx0XHRcdFx0XHRcdGtpbGxlZCA9IFtdO1xuXHRcdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdFx0XHRraWxsZWQucHVzaChwKTtcblx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0aWYgKChraWxsZWQgfHwgIXZhcnMpICYmICFfb25PdmVyd3JpdGUodGhpcywgb3ZlcndyaXRpbmdUd2VlbiwgdGFyZ2V0LCBraWxsZWQpKSB7IC8vaWYgdGhlIG9uT3ZlcndyaXRlIHJldHVybmVkIGZhbHNlLCB0aGF0IG1lYW5zIHRoZSB1c2VyIHdhbnRzIHRvIG92ZXJyaWRlIHRoZSBvdmVyd3JpdGluZyAoY2FuY2VsIGl0KS5cblx0XHRcdFx0XHRcdFx0cmV0dXJuIGZhbHNlO1xuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdGZvciAocCBpbiBraWxsUHJvcHMpIHtcblx0XHRcdFx0XHRcdGlmICgocHQgPSBwcm9wTG9va3VwW3BdKSkge1xuXHRcdFx0XHRcdFx0XHRpZiAoc2ltdWx0YW5lb3VzT3ZlcndyaXRlKSB7IC8vaWYgYW5vdGhlciB0d2VlbiBvdmVyd3JpdGVzIHRoaXMgb25lIGFuZCB0aGV5IGJvdGggc3RhcnQgYXQgZXhhY3RseSB0aGUgc2FtZSB0aW1lLCB5ZXQgdGhpcyB0d2VlbiBoYXMgYWxyZWFkeSByZW5kZXJlZCBvbmNlIChmb3IgZXhhbXBsZSwgYXQgMC4wMDEpIGJlY2F1c2UgaXQncyBmaXJzdCBpbiB0aGUgcXVldWUsIHdlIHNob3VsZCByZXZlcnQgdGhlIHZhbHVlcyB0byB3aGVyZSB0aGV5IHdlcmUgYXQgMCBzbyB0aGF0IHRoZSBzdGFydGluZyB2YWx1ZXMgYXJlbid0IGNvbnRhbWluYXRlZCBvbiB0aGUgb3ZlcndyaXRpbmcgdHdlZW4uXG5cdFx0XHRcdFx0XHRcdFx0aWYgKHB0LmYpIHtcblx0XHRcdFx0XHRcdFx0XHRcdHB0LnRbcHQucF0ocHQucyk7XG5cdFx0XHRcdFx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRcdFx0XHRcdHB0LnRbcHQucF0gPSBwdC5zO1xuXHRcdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdFx0XHRjaGFuZ2VkID0gdHJ1ZTtcblx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0XHRpZiAocHQucGcgJiYgcHQudC5fa2lsbChraWxsUHJvcHMpKSB7XG5cdFx0XHRcdFx0XHRcdFx0Y2hhbmdlZCA9IHRydWU7IC8vc29tZSBwbHVnaW5zIG5lZWQgdG8gYmUgbm90aWZpZWQgc28gdGhleSBjYW4gcGVyZm9ybSBjbGVhbnVwIHRhc2tzIGZpcnN0XG5cdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdFx0aWYgKCFwdC5wZyB8fCBwdC50Ll9vdmVyd3JpdGVQcm9wcy5sZW5ndGggPT09IDApIHtcblx0XHRcdFx0XHRcdFx0XHRpZiAocHQuX3ByZXYpIHtcblx0XHRcdFx0XHRcdFx0XHRcdHB0Ll9wcmV2Ll9uZXh0ID0gcHQuX25leHQ7XG5cdFx0XHRcdFx0XHRcdFx0fSBlbHNlIGlmIChwdCA9PT0gdGhpcy5fZmlyc3RQVCkge1xuXHRcdFx0XHRcdFx0XHRcdFx0dGhpcy5fZmlyc3RQVCA9IHB0Ll9uZXh0O1xuXHRcdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdFx0XHRpZiAocHQuX25leHQpIHtcblx0XHRcdFx0XHRcdFx0XHRcdHB0Ll9uZXh0Ll9wcmV2ID0gcHQuX3ByZXY7XG5cdFx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0XHRcdHB0Ll9uZXh0ID0gcHQuX3ByZXYgPSBudWxsO1xuXHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRcdGRlbGV0ZSBwcm9wTG9va3VwW3BdO1xuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0aWYgKHJlY29yZCkge1xuXHRcdFx0XHRcdFx0XHRvdmVyd3JpdHRlblByb3BzW3BdID0gMTtcblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0aWYgKCF0aGlzLl9maXJzdFBUICYmIHRoaXMuX2luaXR0ZWQpIHsgLy9pZiBhbGwgdHdlZW5pbmcgcHJvcGVydGllcyBhcmUga2lsbGVkLCBraWxsIHRoZSB0d2Vlbi4gV2l0aG91dCB0aGlzIGxpbmUsIGlmIHRoZXJlJ3MgYSB0d2VlbiB3aXRoIG11bHRpcGxlIHRhcmdldHMgYW5kIHRoZW4geW91IGtpbGxUd2VlbnNPZigpIGVhY2ggdGFyZ2V0IGluZGl2aWR1YWxseSwgdGhlIHR3ZWVuIHdvdWxkIHRlY2huaWNhbGx5IHN0aWxsIHJlbWFpbiBhY3RpdmUgYW5kIGZpcmUgaXRzIG9uQ29tcGxldGUgZXZlbiB0aG91Z2ggdGhlcmUgYXJlbid0IGFueSBtb3JlIHByb3BlcnRpZXMgdHdlZW5pbmcuXG5cdFx0XHRcdFx0XHR0aGlzLl9lbmFibGVkKGZhbHNlLCBmYWxzZSk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0XHRyZXR1cm4gY2hhbmdlZDtcblx0XHR9O1xuXG5cdFx0cC5pbnZhbGlkYXRlID0gZnVuY3Rpb24oKSB7XG5cdFx0XHRpZiAodGhpcy5fbm90aWZ5UGx1Z2luc09mRW5hYmxlZCkge1xuXHRcdFx0XHRUd2VlbkxpdGUuX29uUGx1Z2luRXZlbnQoXCJfb25EaXNhYmxlXCIsIHRoaXMpO1xuXHRcdFx0fVxuXHRcdFx0dGhpcy5fZmlyc3RQVCA9IHRoaXMuX292ZXJ3cml0dGVuUHJvcHMgPSB0aGlzLl9zdGFydEF0ID0gdGhpcy5fb25VcGRhdGUgPSBudWxsO1xuXHRcdFx0dGhpcy5fbm90aWZ5UGx1Z2luc09mRW5hYmxlZCA9IHRoaXMuX2FjdGl2ZSA9IHRoaXMuX2xhenkgPSBmYWxzZTtcblx0XHRcdHRoaXMuX3Byb3BMb29rdXAgPSAodGhpcy5fdGFyZ2V0cykgPyB7fSA6IFtdO1xuXHRcdFx0QW5pbWF0aW9uLnByb3RvdHlwZS5pbnZhbGlkYXRlLmNhbGwodGhpcyk7XG5cdFx0XHRpZiAodGhpcy52YXJzLmltbWVkaWF0ZVJlbmRlcikge1xuXHRcdFx0XHR0aGlzLl90aW1lID0gLV90aW55TnVtOyAvL2ZvcmNlcyBhIHJlbmRlciB3aXRob3V0IGhhdmluZyB0byBzZXQgdGhlIHJlbmRlcigpIFwiZm9yY2VcIiBwYXJhbWV0ZXIgdG8gdHJ1ZSBiZWNhdXNlIHdlIHdhbnQgdG8gYWxsb3cgbGF6eWluZyBieSBkZWZhdWx0ICh1c2luZyB0aGUgXCJmb3JjZVwiIHBhcmFtZXRlciBhbHdheXMgZm9yY2VzIGFuIGltbWVkaWF0ZSBmdWxsIHJlbmRlcilcblx0XHRcdFx0dGhpcy5yZW5kZXIoLXRoaXMuX2RlbGF5KTtcblx0XHRcdH1cblx0XHRcdHJldHVybiB0aGlzO1xuXHRcdH07XG5cblx0XHRwLl9lbmFibGVkID0gZnVuY3Rpb24oZW5hYmxlZCwgaWdub3JlVGltZWxpbmUpIHtcblx0XHRcdGlmICghX3RpY2tlckFjdGl2ZSkge1xuXHRcdFx0XHRfdGlja2VyLndha2UoKTtcblx0XHRcdH1cblx0XHRcdGlmIChlbmFibGVkICYmIHRoaXMuX2djKSB7XG5cdFx0XHRcdHZhciB0YXJnZXRzID0gdGhpcy5fdGFyZ2V0cyxcblx0XHRcdFx0XHRpO1xuXHRcdFx0XHRpZiAodGFyZ2V0cykge1xuXHRcdFx0XHRcdGkgPSB0YXJnZXRzLmxlbmd0aDtcblx0XHRcdFx0XHR3aGlsZSAoLS1pID4gLTEpIHtcblx0XHRcdFx0XHRcdHRoaXMuX3NpYmxpbmdzW2ldID0gX3JlZ2lzdGVyKHRhcmdldHNbaV0sIHRoaXMsIHRydWUpO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHR0aGlzLl9zaWJsaW5ncyA9IF9yZWdpc3Rlcih0aGlzLnRhcmdldCwgdGhpcywgdHJ1ZSk7XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHRcdEFuaW1hdGlvbi5wcm90b3R5cGUuX2VuYWJsZWQuY2FsbCh0aGlzLCBlbmFibGVkLCBpZ25vcmVUaW1lbGluZSk7XG5cdFx0XHRpZiAodGhpcy5fbm90aWZ5UGx1Z2luc09mRW5hYmxlZCkgaWYgKHRoaXMuX2ZpcnN0UFQpIHtcblx0XHRcdFx0cmV0dXJuIFR3ZWVuTGl0ZS5fb25QbHVnaW5FdmVudCgoZW5hYmxlZCA/IFwiX29uRW5hYmxlXCIgOiBcIl9vbkRpc2FibGVcIiksIHRoaXMpO1xuXHRcdFx0fVxuXHRcdFx0cmV0dXJuIGZhbHNlO1xuXHRcdH07XG5cblxuLy8tLS0tVHdlZW5MaXRlIHN0YXRpYyBtZXRob2RzIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cblx0XHRUd2VlbkxpdGUudG8gPSBmdW5jdGlvbih0YXJnZXQsIGR1cmF0aW9uLCB2YXJzKSB7XG5cdFx0XHRyZXR1cm4gbmV3IFR3ZWVuTGl0ZSh0YXJnZXQsIGR1cmF0aW9uLCB2YXJzKTtcblx0XHR9O1xuXG5cdFx0VHdlZW5MaXRlLmZyb20gPSBmdW5jdGlvbih0YXJnZXQsIGR1cmF0aW9uLCB2YXJzKSB7XG5cdFx0XHR2YXJzLnJ1bkJhY2t3YXJkcyA9IHRydWU7XG5cdFx0XHR2YXJzLmltbWVkaWF0ZVJlbmRlciA9ICh2YXJzLmltbWVkaWF0ZVJlbmRlciAhPSBmYWxzZSk7XG5cdFx0XHRyZXR1cm4gbmV3IFR3ZWVuTGl0ZSh0YXJnZXQsIGR1cmF0aW9uLCB2YXJzKTtcblx0XHR9O1xuXG5cdFx0VHdlZW5MaXRlLmZyb21UbyA9IGZ1bmN0aW9uKHRhcmdldCwgZHVyYXRpb24sIGZyb21WYXJzLCB0b1ZhcnMpIHtcblx0XHRcdHRvVmFycy5zdGFydEF0ID0gZnJvbVZhcnM7XG5cdFx0XHR0b1ZhcnMuaW1tZWRpYXRlUmVuZGVyID0gKHRvVmFycy5pbW1lZGlhdGVSZW5kZXIgIT0gZmFsc2UgJiYgZnJvbVZhcnMuaW1tZWRpYXRlUmVuZGVyICE9IGZhbHNlKTtcblx0XHRcdHJldHVybiBuZXcgVHdlZW5MaXRlKHRhcmdldCwgZHVyYXRpb24sIHRvVmFycyk7XG5cdFx0fTtcblxuXHRcdFR3ZWVuTGl0ZS5kZWxheWVkQ2FsbCA9IGZ1bmN0aW9uKGRlbGF5LCBjYWxsYmFjaywgcGFyYW1zLCBzY29wZSwgdXNlRnJhbWVzKSB7XG5cdFx0XHRyZXR1cm4gbmV3IFR3ZWVuTGl0ZShjYWxsYmFjaywgMCwge2RlbGF5OmRlbGF5LCBvbkNvbXBsZXRlOmNhbGxiYWNrLCBvbkNvbXBsZXRlUGFyYW1zOnBhcmFtcywgY2FsbGJhY2tTY29wZTpzY29wZSwgb25SZXZlcnNlQ29tcGxldGU6Y2FsbGJhY2ssIG9uUmV2ZXJzZUNvbXBsZXRlUGFyYW1zOnBhcmFtcywgaW1tZWRpYXRlUmVuZGVyOmZhbHNlLCBsYXp5OmZhbHNlLCB1c2VGcmFtZXM6dXNlRnJhbWVzLCBvdmVyd3JpdGU6MH0pO1xuXHRcdH07XG5cblx0XHRUd2VlbkxpdGUuc2V0ID0gZnVuY3Rpb24odGFyZ2V0LCB2YXJzKSB7XG5cdFx0XHRyZXR1cm4gbmV3IFR3ZWVuTGl0ZSh0YXJnZXQsIDAsIHZhcnMpO1xuXHRcdH07XG5cblx0XHRUd2VlbkxpdGUuZ2V0VHdlZW5zT2YgPSBmdW5jdGlvbih0YXJnZXQsIG9ubHlBY3RpdmUpIHtcblx0XHRcdGlmICh0YXJnZXQgPT0gbnVsbCkgeyByZXR1cm4gW107IH1cblx0XHRcdHRhcmdldCA9ICh0eXBlb2YodGFyZ2V0KSAhPT0gXCJzdHJpbmdcIikgPyB0YXJnZXQgOiBUd2VlbkxpdGUuc2VsZWN0b3IodGFyZ2V0KSB8fCB0YXJnZXQ7XG5cdFx0XHR2YXIgaSwgYSwgaiwgdDtcblx0XHRcdGlmICgoX2lzQXJyYXkodGFyZ2V0KSB8fCBfaXNTZWxlY3Rvcih0YXJnZXQpKSAmJiB0eXBlb2YodGFyZ2V0WzBdKSAhPT0gXCJudW1iZXJcIikge1xuXHRcdFx0XHRpID0gdGFyZ2V0Lmxlbmd0aDtcblx0XHRcdFx0YSA9IFtdO1xuXHRcdFx0XHR3aGlsZSAoLS1pID4gLTEpIHtcblx0XHRcdFx0XHRhID0gYS5jb25jYXQoVHdlZW5MaXRlLmdldFR3ZWVuc09mKHRhcmdldFtpXSwgb25seUFjdGl2ZSkpO1xuXHRcdFx0XHR9XG5cdFx0XHRcdGkgPSBhLmxlbmd0aDtcblx0XHRcdFx0Ly9ub3cgZ2V0IHJpZCBvZiBhbnkgZHVwbGljYXRlcyAodHdlZW5zIG9mIGFycmF5cyBvZiBvYmplY3RzIGNvdWxkIGNhdXNlIGR1cGxpY2F0ZXMpXG5cdFx0XHRcdHdoaWxlICgtLWkgPiAtMSkge1xuXHRcdFx0XHRcdHQgPSBhW2ldO1xuXHRcdFx0XHRcdGogPSBpO1xuXHRcdFx0XHRcdHdoaWxlICgtLWogPiAtMSkge1xuXHRcdFx0XHRcdFx0aWYgKHQgPT09IGFbal0pIHtcblx0XHRcdFx0XHRcdFx0YS5zcGxpY2UoaSwgMSk7XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRhID0gX3JlZ2lzdGVyKHRhcmdldCkuY29uY2F0KCk7XG5cdFx0XHRcdGkgPSBhLmxlbmd0aDtcblx0XHRcdFx0d2hpbGUgKC0taSA+IC0xKSB7XG5cdFx0XHRcdFx0aWYgKGFbaV0uX2djIHx8IChvbmx5QWN0aXZlICYmICFhW2ldLmlzQWN0aXZlKCkpKSB7XG5cdFx0XHRcdFx0XHRhLnNwbGljZShpLCAxKTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHRcdHJldHVybiBhO1xuXHRcdH07XG5cblx0XHRUd2VlbkxpdGUua2lsbFR3ZWVuc09mID0gVHdlZW5MaXRlLmtpbGxEZWxheWVkQ2FsbHNUbyA9IGZ1bmN0aW9uKHRhcmdldCwgb25seUFjdGl2ZSwgdmFycykge1xuXHRcdFx0aWYgKHR5cGVvZihvbmx5QWN0aXZlKSA9PT0gXCJvYmplY3RcIikge1xuXHRcdFx0XHR2YXJzID0gb25seUFjdGl2ZTsgLy9mb3IgYmFja3dhcmRzIGNvbXBhdGliaWxpdHkgKGJlZm9yZSBcIm9ubHlBY3RpdmVcIiBwYXJhbWV0ZXIgd2FzIGluc2VydGVkKVxuXHRcdFx0XHRvbmx5QWN0aXZlID0gZmFsc2U7XG5cdFx0XHR9XG5cdFx0XHR2YXIgYSA9IFR3ZWVuTGl0ZS5nZXRUd2VlbnNPZih0YXJnZXQsIG9ubHlBY3RpdmUpLFxuXHRcdFx0XHRpID0gYS5sZW5ndGg7XG5cdFx0XHR3aGlsZSAoLS1pID4gLTEpIHtcblx0XHRcdFx0YVtpXS5fa2lsbCh2YXJzLCB0YXJnZXQpO1xuXHRcdFx0fVxuXHRcdH07XG5cblxuXG4vKlxuICogLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICogVHdlZW5QbHVnaW4gICAoY291bGQgZWFzaWx5IGJlIHNwbGl0IG91dCBhcyBhIHNlcGFyYXRlIGZpbGUvY2xhc3MsIGJ1dCBpbmNsdWRlZCBmb3IgZWFzZSBvZiB1c2UgKHNvIHRoYXQgcGVvcGxlIGRvbid0IG5lZWQgdG8gaW5jbHVkZSBhbm90aGVyIHNjcmlwdCBjYWxsIGJlZm9yZSBsb2FkaW5nIHBsdWdpbnMgd2hpY2ggaXMgZWFzeSB0byBmb3JnZXQpXG4gKiAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gKi9cblx0XHR2YXIgVHdlZW5QbHVnaW4gPSBfY2xhc3MoXCJwbHVnaW5zLlR3ZWVuUGx1Z2luXCIsIGZ1bmN0aW9uKHByb3BzLCBwcmlvcml0eSkge1xuXHRcdFx0XHRcdHRoaXMuX292ZXJ3cml0ZVByb3BzID0gKHByb3BzIHx8IFwiXCIpLnNwbGl0KFwiLFwiKTtcblx0XHRcdFx0XHR0aGlzLl9wcm9wTmFtZSA9IHRoaXMuX292ZXJ3cml0ZVByb3BzWzBdO1xuXHRcdFx0XHRcdHRoaXMuX3ByaW9yaXR5ID0gcHJpb3JpdHkgfHwgMDtcblx0XHRcdFx0XHR0aGlzLl9zdXBlciA9IFR3ZWVuUGx1Z2luLnByb3RvdHlwZTtcblx0XHRcdFx0fSwgdHJ1ZSk7XG5cblx0XHRwID0gVHdlZW5QbHVnaW4ucHJvdG90eXBlO1xuXHRcdFR3ZWVuUGx1Z2luLnZlcnNpb24gPSBcIjEuMTguMFwiO1xuXHRcdFR3ZWVuUGx1Z2luLkFQSSA9IDI7XG5cdFx0cC5fZmlyc3RQVCA9IG51bGw7XG5cdFx0cC5fYWRkVHdlZW4gPSBfYWRkUHJvcFR3ZWVuO1xuXHRcdHAuc2V0UmF0aW8gPSBfc2V0UmF0aW87XG5cblx0XHRwLl9raWxsID0gZnVuY3Rpb24obG9va3VwKSB7XG5cdFx0XHR2YXIgYSA9IHRoaXMuX292ZXJ3cml0ZVByb3BzLFxuXHRcdFx0XHRwdCA9IHRoaXMuX2ZpcnN0UFQsXG5cdFx0XHRcdGk7XG5cdFx0XHRpZiAobG9va3VwW3RoaXMuX3Byb3BOYW1lXSAhPSBudWxsKSB7XG5cdFx0XHRcdHRoaXMuX292ZXJ3cml0ZVByb3BzID0gW107XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRpID0gYS5sZW5ndGg7XG5cdFx0XHRcdHdoaWxlICgtLWkgPiAtMSkge1xuXHRcdFx0XHRcdGlmIChsb29rdXBbYVtpXV0gIT0gbnVsbCkge1xuXHRcdFx0XHRcdFx0YS5zcGxpY2UoaSwgMSk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0XHR3aGlsZSAocHQpIHtcblx0XHRcdFx0aWYgKGxvb2t1cFtwdC5uXSAhPSBudWxsKSB7XG5cdFx0XHRcdFx0aWYgKHB0Ll9uZXh0KSB7XG5cdFx0XHRcdFx0XHRwdC5fbmV4dC5fcHJldiA9IHB0Ll9wcmV2O1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHRpZiAocHQuX3ByZXYpIHtcblx0XHRcdFx0XHRcdHB0Ll9wcmV2Ll9uZXh0ID0gcHQuX25leHQ7XG5cdFx0XHRcdFx0XHRwdC5fcHJldiA9IG51bGw7XG5cdFx0XHRcdFx0fSBlbHNlIGlmICh0aGlzLl9maXJzdFBUID09PSBwdCkge1xuXHRcdFx0XHRcdFx0dGhpcy5fZmlyc3RQVCA9IHB0Ll9uZXh0O1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXHRcdFx0XHRwdCA9IHB0Ll9uZXh0O1xuXHRcdFx0fVxuXHRcdFx0cmV0dXJuIGZhbHNlO1xuXHRcdH07XG5cblx0XHRwLl9yb3VuZFByb3BzID0gZnVuY3Rpb24obG9va3VwLCB2YWx1ZSkge1xuXHRcdFx0dmFyIHB0ID0gdGhpcy5fZmlyc3RQVDtcblx0XHRcdHdoaWxlIChwdCkge1xuXHRcdFx0XHRpZiAobG9va3VwW3RoaXMuX3Byb3BOYW1lXSB8fCAocHQubiAhPSBudWxsICYmIGxvb2t1cFsgcHQubi5zcGxpdCh0aGlzLl9wcm9wTmFtZSArIFwiX1wiKS5qb2luKFwiXCIpIF0pKSB7IC8vc29tZSBwcm9wZXJ0aWVzIHRoYXQgYXJlIHZlcnkgcGx1Z2luLXNwZWNpZmljIGFkZCBhIHByZWZpeCBuYW1lZCBhZnRlciB0aGUgX3Byb3BOYW1lIHBsdXMgYW4gdW5kZXJzY29yZSwgc28gd2UgbmVlZCB0byBpZ25vcmUgdGhhdCBleHRyYSBzdHVmZiBoZXJlLlxuXHRcdFx0XHRcdHB0LnIgPSB2YWx1ZTtcblx0XHRcdFx0fVxuXHRcdFx0XHRwdCA9IHB0Ll9uZXh0O1xuXHRcdFx0fVxuXHRcdH07XG5cblx0XHRUd2VlbkxpdGUuX29uUGx1Z2luRXZlbnQgPSBmdW5jdGlvbih0eXBlLCB0d2Vlbikge1xuXHRcdFx0dmFyIHB0ID0gdHdlZW4uX2ZpcnN0UFQsXG5cdFx0XHRcdGNoYW5nZWQsIHB0MiwgZmlyc3QsIGxhc3QsIG5leHQ7XG5cdFx0XHRpZiAodHlwZSA9PT0gXCJfb25Jbml0QWxsUHJvcHNcIikge1xuXHRcdFx0XHQvL3NvcnRzIHRoZSBQcm9wVHdlZW4gbGlua2VkIGxpc3QgaW4gb3JkZXIgb2YgcHJpb3JpdHkgYmVjYXVzZSBzb21lIHBsdWdpbnMgbmVlZCB0byByZW5kZXIgZWFybGllci9sYXRlciB0aGFuIG90aGVycywgbGlrZSBNb3Rpb25CbHVyUGx1Z2luIGFwcGxpZXMgaXRzIGVmZmVjdHMgYWZ0ZXIgYWxsIHgveS9hbHBoYSB0d2VlbnMgaGF2ZSByZW5kZXJlZCBvbiBlYWNoIGZyYW1lLlxuXHRcdFx0XHR3aGlsZSAocHQpIHtcblx0XHRcdFx0XHRuZXh0ID0gcHQuX25leHQ7XG5cdFx0XHRcdFx0cHQyID0gZmlyc3Q7XG5cdFx0XHRcdFx0d2hpbGUgKHB0MiAmJiBwdDIucHIgPiBwdC5wcikge1xuXHRcdFx0XHRcdFx0cHQyID0gcHQyLl9uZXh0O1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHRpZiAoKHB0Ll9wcmV2ID0gcHQyID8gcHQyLl9wcmV2IDogbGFzdCkpIHtcblx0XHRcdFx0XHRcdHB0Ll9wcmV2Ll9uZXh0ID0gcHQ7XG5cdFx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRcdGZpcnN0ID0gcHQ7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdGlmICgocHQuX25leHQgPSBwdDIpKSB7XG5cdFx0XHRcdFx0XHRwdDIuX3ByZXYgPSBwdDtcblx0XHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdFx0bGFzdCA9IHB0O1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHRwdCA9IG5leHQ7XG5cdFx0XHRcdH1cblx0XHRcdFx0cHQgPSB0d2Vlbi5fZmlyc3RQVCA9IGZpcnN0O1xuXHRcdFx0fVxuXHRcdFx0d2hpbGUgKHB0KSB7XG5cdFx0XHRcdGlmIChwdC5wZykgaWYgKHR5cGVvZihwdC50W3R5cGVdKSA9PT0gXCJmdW5jdGlvblwiKSBpZiAocHQudFt0eXBlXSgpKSB7XG5cdFx0XHRcdFx0Y2hhbmdlZCA9IHRydWU7XG5cdFx0XHRcdH1cblx0XHRcdFx0cHQgPSBwdC5fbmV4dDtcblx0XHRcdH1cblx0XHRcdHJldHVybiBjaGFuZ2VkO1xuXHRcdH07XG5cblx0XHRUd2VlblBsdWdpbi5hY3RpdmF0ZSA9IGZ1bmN0aW9uKHBsdWdpbnMpIHtcblx0XHRcdHZhciBpID0gcGx1Z2lucy5sZW5ndGg7XG5cdFx0XHR3aGlsZSAoLS1pID4gLTEpIHtcblx0XHRcdFx0aWYgKHBsdWdpbnNbaV0uQVBJID09PSBUd2VlblBsdWdpbi5BUEkpIHtcblx0XHRcdFx0XHRfcGx1Z2luc1sobmV3IHBsdWdpbnNbaV0oKSkuX3Byb3BOYW1lXSA9IHBsdWdpbnNbaV07XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHRcdHJldHVybiB0cnVlO1xuXHRcdH07XG5cblx0XHQvL3Byb3ZpZGVzIGEgbW9yZSBjb25jaXNlIHdheSB0byBkZWZpbmUgcGx1Z2lucyB0aGF0IGhhdmUgbm8gZGVwZW5kZW5jaWVzIGJlc2lkZXMgVHdlZW5QbHVnaW4gYW5kIFR3ZWVuTGl0ZSwgd3JhcHBpbmcgY29tbW9uIGJvaWxlcnBsYXRlIHN0dWZmIGludG8gb25lIGZ1bmN0aW9uIChhZGRlZCBpbiAxLjkuMCkuIFlvdSBkb24ndCBORUVEIHRvIHVzZSB0aGlzIHRvIGRlZmluZSBhIHBsdWdpbiAtIHRoZSBvbGQgd2F5IHN0aWxsIHdvcmtzIGFuZCBjYW4gYmUgdXNlZnVsIGluIGNlcnRhaW4gKHJhcmUpIHNpdHVhdGlvbnMuXG5cdFx0X2dzRGVmaW5lLnBsdWdpbiA9IGZ1bmN0aW9uKGNvbmZpZykge1xuXHRcdFx0aWYgKCFjb25maWcgfHwgIWNvbmZpZy5wcm9wTmFtZSB8fCAhY29uZmlnLmluaXQgfHwgIWNvbmZpZy5BUEkpIHsgdGhyb3cgXCJpbGxlZ2FsIHBsdWdpbiBkZWZpbml0aW9uLlwiOyB9XG5cdFx0XHR2YXIgcHJvcE5hbWUgPSBjb25maWcucHJvcE5hbWUsXG5cdFx0XHRcdHByaW9yaXR5ID0gY29uZmlnLnByaW9yaXR5IHx8IDAsXG5cdFx0XHRcdG92ZXJ3cml0ZVByb3BzID0gY29uZmlnLm92ZXJ3cml0ZVByb3BzLFxuXHRcdFx0XHRtYXAgPSB7aW5pdDpcIl9vbkluaXRUd2VlblwiLCBzZXQ6XCJzZXRSYXRpb1wiLCBraWxsOlwiX2tpbGxcIiwgcm91bmQ6XCJfcm91bmRQcm9wc1wiLCBpbml0QWxsOlwiX29uSW5pdEFsbFByb3BzXCJ9LFxuXHRcdFx0XHRQbHVnaW4gPSBfY2xhc3MoXCJwbHVnaW5zLlwiICsgcHJvcE5hbWUuY2hhckF0KDApLnRvVXBwZXJDYXNlKCkgKyBwcm9wTmFtZS5zdWJzdHIoMSkgKyBcIlBsdWdpblwiLFxuXHRcdFx0XHRcdGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdFx0VHdlZW5QbHVnaW4uY2FsbCh0aGlzLCBwcm9wTmFtZSwgcHJpb3JpdHkpO1xuXHRcdFx0XHRcdFx0dGhpcy5fb3ZlcndyaXRlUHJvcHMgPSBvdmVyd3JpdGVQcm9wcyB8fCBbXTtcblx0XHRcdFx0XHR9LCAoY29uZmlnLmdsb2JhbCA9PT0gdHJ1ZSkpLFxuXHRcdFx0XHRwID0gUGx1Z2luLnByb3RvdHlwZSA9IG5ldyBUd2VlblBsdWdpbihwcm9wTmFtZSksXG5cdFx0XHRcdHByb3A7XG5cdFx0XHRwLmNvbnN0cnVjdG9yID0gUGx1Z2luO1xuXHRcdFx0UGx1Z2luLkFQSSA9IGNvbmZpZy5BUEk7XG5cdFx0XHRmb3IgKHByb3AgaW4gbWFwKSB7XG5cdFx0XHRcdGlmICh0eXBlb2YoY29uZmlnW3Byb3BdKSA9PT0gXCJmdW5jdGlvblwiKSB7XG5cdFx0XHRcdFx0cFttYXBbcHJvcF1dID0gY29uZmlnW3Byb3BdO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0XHRQbHVnaW4udmVyc2lvbiA9IGNvbmZpZy52ZXJzaW9uO1xuXHRcdFx0VHdlZW5QbHVnaW4uYWN0aXZhdGUoW1BsdWdpbl0pO1xuXHRcdFx0cmV0dXJuIFBsdWdpbjtcblx0XHR9O1xuXG5cblx0XHQvL25vdyBydW4gdGhyb3VnaCBhbGwgdGhlIGRlcGVuZGVuY2llcyBkaXNjb3ZlcmVkIGFuZCBpZiBhbnkgYXJlIG1pc3NpbmcsIGxvZyB0aGF0IHRvIHRoZSBjb25zb2xlIGFzIGEgd2FybmluZy4gVGhpcyBpcyB3aHkgaXQncyBiZXN0IHRvIGhhdmUgVHdlZW5MaXRlIGxvYWQgbGFzdCAtIGl0IGNhbiBjaGVjayBhbGwgdGhlIGRlcGVuZGVuY2llcyBmb3IgeW91LlxuXHRcdGEgPSB3aW5kb3cuX2dzUXVldWU7XG5cdFx0aWYgKGEpIHtcblx0XHRcdGZvciAoaSA9IDA7IGkgPCBhLmxlbmd0aDsgaSsrKSB7XG5cdFx0XHRcdGFbaV0oKTtcblx0XHRcdH1cblx0XHRcdGZvciAocCBpbiBfZGVmTG9va3VwKSB7XG5cdFx0XHRcdGlmICghX2RlZkxvb2t1cFtwXS5mdW5jKSB7XG5cdFx0XHRcdFx0d2luZG93LmNvbnNvbGUubG9nKFwiR1NBUCBlbmNvdW50ZXJlZCBtaXNzaW5nIGRlcGVuZGVuY3k6IGNvbS5ncmVlbnNvY2suXCIgKyBwKTtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH1cblxuXHRcdF90aWNrZXJBY3RpdmUgPSBmYWxzZTsgLy9lbnN1cmVzIHRoYXQgdGhlIGZpcnN0IG9mZmljaWFsIGFuaW1hdGlvbiBmb3JjZXMgYSB0aWNrZXIudGljaygpIHRvIHVwZGF0ZSB0aGUgdGltZSB3aGVuIGl0IGlzIGluc3RhbnRpYXRlZFxuXG59KSgodHlwZW9mKG1vZHVsZSkgIT09IFwidW5kZWZpbmVkXCIgJiYgbW9kdWxlLmV4cG9ydHMgJiYgdHlwZW9mKGdsb2JhbCkgIT09IFwidW5kZWZpbmVkXCIpID8gZ2xvYmFsIDogdGhpcyB8fCB3aW5kb3csIFwiVHdlZW5NYXhcIik7Il19
