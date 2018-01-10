/**
 * Gridzy v1.1
 *
 * Copyright 2015, Helmut Wandl
 */

var Gridzy = (function() {
	'use strict';

	var helper = {
		expectArray: function(i) {
			return helper.isArraylike(i) ? i : [i];
		},
		isArraylike: function(i) {
			return i.length === +i.length && typeof i !== 'string';
		},
		forceArrayObject: function(i) {
			if (!i) return [];
			if ('toArray' in Object(i)) return i.toArray();
			var length = i.length || 0, results = new Array(length);
			while (length--) results[length] = i[length];
			return results;
		},
		eachOfArray: function(arr, func, bind) {
			var a;
			for (a = 0; a < arr.length; a++) {
				bind ? func.apply(bind, [arr[a], a]) : func(arr[a], a);
			}
		},
		domWalk: function(node, func) {
			func(node);
			node = node.firstChild;
			while (node) {
				helper.domWalk(node, func);
				node = node.nextSibling;
			}
		},
		prependChild: function(parent, child) {
			if (parent.firstChild) {
				parent.insertBefore(child, parent.firstChild);
			} else {
				parent.appendChild(child);
			}
		},
		indexOfArray: !Array.prototype.indexOf ? // IE8-support
			function(arr, elt) {
				var a = 0,
					len = arr.length;

				for (; a < len; a++) {
					if (a in arr && arr[a] === elt) {
						return a;
					}
				}

				return -1;
			} :
			function(arr, elt) {
				return arr.indexOf(elt);
			},
		inArray: function(arr, elt) {
			return helper.indexOfArray(arr, elt) !== -1;
		},
		addEventListener: !document.addEventListener ? // IE8-support
			function(element, name, func) {
				element.attachEvent('on' + name, function(event) { func.apply(element, [event]); });
			} :
			function(element, name, func) {
				element.addEventListener(name, func, false);
			},
		addClass: !document.createElement('div').classList ? // IE8- & IE9-support
			function(element, className) {
				if (!(element.className && -1 < element.className.search(new RegExp('(^|\\s+)' + className + '($|\\s+)')))) {
					element.className = (element.className + ' ' + className).replace(/\s+/, ' ').replace(/(^\s+|\s+$)/, '');
				}
			} :
			function(element, className) {
				element.classList.add(className);
			},
		removeClass: !document.createElement('div').classList ? // IE8- & IE9-support
			function(element, className) {
				element.className = element.className.replace(new RegExp('(^|\\s+)' + className + '($|\\s+)'), ' ').replace(/\s+/, ' ').replace(/(^\s+|\s+$)/, '');
			} :
			function(element, className) {
				element.classList.remove(className);
			},
		expectNaturalImageSize: (function() {
			var interval, images = [], update;

			update = function() {
				var a;
				for (a = 0; a < images.length; a++) {
					if (images[a].imgB.width && images[a].imgB.height) {
						if (images[a].img.naturalWidth === undefined) images[a].img.naturalWidth = images[a].imgB.width;
						if (images[a].img.naturalHeight === undefined) images[a].img.naturalHeight = images[a].imgB.height;
					}

					if (images[a].img.naturalWidth && images[a].img.naturalHeight || images[a].ready) {
						images[a].callback(images[a].img, !images[a].error);
						images.splice(a, 1);
						a--;
					}
				}

				if (!images.length) {
					clearInterval(interval);
					interval = null;
				}
			};

			return function(img, onReadyCallback) {
				var obj = {
					img: img,
					callback: onReadyCallback || function() {},
					imgB: document.createElement('img'),
					ready: false,
					error: false
				};

				helper.addEventListener(obj.imgB, 'load', function() { obj.ready = true; });
				helper.addEventListener(obj.imgB, 'error', function() { obj.ready = true; obj.error = true; });
				obj.imgB.src = obj.img.src;

				images.push(obj);
				if (!interval) interval = setInterval(update, 0);
			};
		})()
	};

	function gridzy(element, options) {
		var isNewInstance = typeof element.gridzy === 'undefined',
			self = isNewInstance ? this : element.gridzy,
			prevContainerWidth = 0;

		// bind instance to container element
		element.gridzy = self;

		// initialize default options
		self._resetOptionParameters();

		if (isNewInstance) {
			// initialize user specific options
			self._updateOptionParameters(options);

			// set default parameters
			self._allItems = [];
			self._validItems = [];
			self._validItemsOptWidthAll = 0;
			self._validItemsOptionDesiredElementHeight = null;
			self._validItemsOptionHideBoxOnMissingImage = null;

			// create and insert the container box where the items will be positioned in.
			self._container = document.createElement('div');
			self._container.className = 'gridzyContainer';
			self._container.style.position = 'relative';
			self._container.style.padding = '0';
			self._container.style.border = '0';
			self._container.style.margin = '0';
			self._container.style.display = 'block';
			helper.prependChild(element, self._container);

			// append child elements to the container box
			self.append(element.children);

			// force rendering on window resize
			prevContainerWidth = self._container.clientWidth;
			helper.addEventListener(window, 'resize', function() {
				if (self._container.clientWidth !== prevContainerWidth) {
					prevContainerWidth = self._container.clientWidth;
					self.render();
				}
			});
		} else {
			self.setOptions(options);
		}

		return self;
	}

	gridzy.prototype = {
		setOptions: function(options) {
			var self = this;

			self._updateOptionParameters(options);

			self.render();
		},
		getOption: function(optionName) {
			var self = this,
				result = null;

			switch(typeof self._options[optionName]) {

				// if the option value is a function get the return value of the function
				case 'function':
					result = self._options[optionName](self);
					break;

				// otherwise get the option value itself
				default:
					result = self._options[optionName];
			}

			return result;
		},
		render: function() {
			var self = this,
				renderObject = self._calculateGrid(), // get the new calculated values
				row,
				col,
				rowPos = renderObject.rows.length,
				colPos,
				autoFontSize = self.getOption('autoFontSize');

			self._options.onBeforeRender(self);

			// set all new values to the style attribute of elements
			while(rowPos--) {
				row = renderObject.rows[rowPos];
				colPos = row.items.length;
				while(colPos--) {
					col = row.items[colPos];
					col.element.style.cssText = ''
						+ 'position: absolute; '
						+ 'width: ' + col.displaySizeX + 'px; '
						+ 'height: ' + row.displaySizeY + 'px; '
						+ 'left: ' + col.displayPosX + 'px; '
						+ 'top: ' + row.displayPosY + 'px; '
						+ 'font-size: ' + (autoFontSize ? (col.displaySizeX * 100 / col.size[0]) + '%' : '100%') + '; ';
				}
			}

			self._container.style.height = renderObject.size[1] + 'px';

			self._options.onRender(self);
		},
		append: function(elements) {
			var self = this,
				containerPos,
				IMG_FAILURE = 0,
				IMG_LOADING = 1,
				IMG_READY = 2,
				IMG_FINISHED = 3,
				insertQueue;

			insertQueue = {
				maxQueueTime: 1000,
				maxQuietTime: 400,
				queue: [],
				count: 0,
				lastAdd: (new Date()).getTime(),
				lastProcess: (new Date()).getTime(),
				timer: null,
				add: function(contentElement, item) {
					insertQueue.queue.push({contentElement: contentElement, item: item});
					insertQueue.process(false);
					insertQueue.lastAdd = (new Date()).getTime();
				},
				process: function(maxQuietTimeReached) {
					var queueItem;
					var maxQueueTimeReached = insertQueue.lastProcess < (new Date()).getTime() - insertQueue.maxQueueTime;
					var finished = elements.length === insertQueue.count + insertQueue.queue.length;

					if (insertQueue.timer !== null) {
						clearTimeout(insertQueue.timer);
						insertQueue.timer = null;
					}

					if (maxQuietTimeReached || maxQueueTimeReached || finished) {
						while (queueItem = insertQueue.queue.shift()) {
							helper.prependChild(queueItem.item.element, queueItem.contentElement);
							queueItem.item.size = [queueItem.contentElement.offsetWidth, queueItem.contentElement.offsetHeight];
							queueItem.item.ratio = queueItem.item.size[0] / queueItem.item.size[1];

							helper.addClass(queueItem.contentElement, 'gridzyItemContent');
							queueItem.contentElement.style.width = '100%';
							queueItem.contentElement.style.height = '100%';
							queueItem.item.element.style.visibility = '';
							queueItem.item.contentElement.style.visibility = '';

							insertQueue.count++;
						}

						self._precalculateValues();
						self.render();

						insertQueue.lastProcess = (new Date()).getTime();
					} else {
						insertQueue.timer = setTimeout(function() {
							insertQueue.process(true);
						}, insertQueue.maxQuietTime);
					}
				}
			};

			elements = helper.forceArrayObject(helper.expectArray(elements));

			containerPos = helper.indexOfArray(elements, self._container);
			if (containerPos > -1) {
				elements.splice(containerPos, 1);
			}

			helper.eachOfArray(elements, function(contentElement) {
				var item,
					images = [],
					imagesStatus = [],
					onReady,
					onFinished;

				contentElement.style.display = 'block';
				contentElement.style.visibility = 'hidden';

				onFinished = function() {
					if (!helper.inArray(imagesStatus, IMG_LOADING) && !helper.inArray(imagesStatus, IMG_READY)) {
						if (helper.inArray(imagesStatus, IMG_FAILURE)) {
							item.failures = true;
						}
						helper.removeClass(item.element, 'gridzyItemLoading');
						if (item.progressIndicator && item.progressIndicator.parentNode) {
							item.element.removeChild(item.progressIndicator);
							delete item.progressIndicator;
						}
					}
				};

				onReady = function() {
					// insert the element if the sizes of all contained images are known (because the size is important to calculate the grid)
					if (helper.inArray(imagesStatus, IMG_FAILURE)) {
						item.failures = true;
					}
					if (!helper.inArray(imagesStatus, IMG_LOADING)) {
						insertQueue.add(contentElement, item);
					}
				};

				// generate and insert the item object
				item = {
					progressIndicator: document.createElement('span'),
					element: document.createElement('span'),
					contentElement: contentElement,
					size: [0, 0],
					ratio: 0,
					failures: false
				};

				helper.addClass(item.progressIndicator, 'gridzyItemProgressIndicator');
				helper.addClass(item.element, 'gridzyItem');
				helper.addClass(item.element, 'gridzyItemLoading');
				item.element.appendChild(item.progressIndicator);
				item.element.style.position = 'absolute';
				item.element.style.visibility = 'hidden';

				// search for images to get natural image sizes (they are needed to get the element size)
				helper.domWalk(contentElement, function(e) {
					if (e.nodeName === 'IMG') {
						images.push(e);
						imagesStatus.push(IMG_LOADING);
					}
				});
				helper.eachOfArray(images, function(image, index) {
					helper.expectNaturalImageSize(image, function(img, success) {
						var onload = function() {
							imagesStatus[index] = success && imagesStatus[index] && img.naturalWidth ? IMG_FINISHED : IMG_FAILURE;
							onFinished();
						};

						imagesStatus[index] = success && img.naturalWidth ? IMG_READY : IMG_FAILURE;
						onReady();

						helper.addEventListener(image, 'load', onload);
						helper.addEventListener(image, 'error', function() {
							imagesStatus[index] = IMG_FAILURE;
							onFinished();
						});

						if (image.complete) {
							onload();
						}
					});
				});


				self._allItems.push(item);
				self._container.appendChild(item.element);

				onReady();
				onFinished();
			});

			self.render();
		},
		_resetOptionParameters: function() {
			this._options = {
				spaceBetweenElements: 1,
				desiredElementHeight: 200,
				autoFontSize: false,
				hideBoxOnMissingImage: true,
				onBeforeOptionsChanged: function() {},
				onOptionsChanged: function() {},
				onBeforeRender: function() {},
				onRender: function() {}
			};
		},
		_updateOptionParameters: function(options) {
			var self = this;

			options = options || {};

			self._options.onBeforeOptionsChanged(self);

			// set options
			if (typeof options.spaceBetweenElements !== 'undefined') self._options.spaceBetweenElements = typeof options.spaceBetweenElements === 'function' ? options.spaceBetweenElements : +options.spaceBetweenElements;
			if (typeof options.desiredElementHeight !== 'undefined') self._options.desiredElementHeight = typeof options.desiredElementHeight === 'function' ? options.desiredElementHeight : +options.desiredElementHeight;
			if (typeof options.autoFontSize !== 'undefined') self._options.autoFontSize = typeof options.autoFontSize === 'function' ? options.autoFontSize : !!options.autoFontSize;
			if (typeof options.hideBoxOnMissingImage !== 'undefined') self._options.hideBoxOnMissingImage = typeof options.hideBoxOnMissingImage === 'function' ? options.hideBoxOnMissingImage : !!options.hideBoxOnMissingImage;
			if (typeof options.onBeforeOptionsChanged === 'function') self._options.onBeforeOptionsChanged = options.onBeforeOptionsChanged;
			if (typeof options.onOptionsChanged === 'function') self._options.onOptionsChanged = options.onOptionsChanged;
			if (typeof options.onBeforeRender === 'function') self._options.onBeforeRender = options.onBeforeRender;
			if (typeof options.onRender === 'function') self._options.onRender = options.onRender;

			self._options.onOptionsChanged(self);
		},
		_precalculateValues: function(onlyIfOptionsChanged) {
			var self = this,
				allItems = self._allItems,
				item,
				validItems = [],
				optWidthAll = 0,
				loopPos = allItems.length,
				desiredElementHeight = self.getOption('desiredElementHeight'),
				hideBoxOnMissingImage = self.getOption('hideBoxOnMissingImage');

			if (onlyIfOptionsChanged && self._validItemsOptionDesiredElementHeight === desiredElementHeight && self._validItemsOptionHideBoxOnMissingImage === hideBoxOnMissingImage) {
				return;
			}

			while(loopPos--) {
				item = allItems[loopPos];
				if (hideBoxOnMissingImage && item.failures) {
					item.element.style.display = 'none';
				}
				else if (item.size[0] && item.size[1]) {
					item.element.style.display = '';
					validItems.unshift(item);
					item.optWidth = desiredElementHeight * item.size[0] / item.size[1];
					optWidthAll += item.optWidth;
				}
			}

			self._validItemsOptionDesiredElementHeight = desiredElementHeight;
			self._validItemsOptionHideBoxOnMissingImage = hideBoxOnMissingImage;
			self._validItems = validItems;
			self._validItemsOptWidthAll = optWidthAll;
		},
		_calculateGrid: function() {
			var self = this,
				loopPos,
				loopPos2,
				items,
				itemsLength,
				item,
				spaceBetweenElements = self.getOption('spaceBetweenElements'),
				containerWidth = self._container.clientWidth,
				optWidthAll,
				optWidthRow,
				curWidthRow = 0,
				renderObject = {
					rows: [],
					size: [containerWidth, 0]
				},
				rows = renderObject.rows,
				rowsLength,
				row,
				rowLength,
				prevRow,
				displaySizeAllX = 0,
				displaySizeAllY = 0,
				containerWidthWithoutSpaces;

			// get valid items and optimal width of all items
			this._precalculateValues(true);
			items = self._validItems;
			itemsLength = items.length;
			optWidthAll = self._validItemsOptWidthAll;

			// find the optimal length (pixels) of a row
			optWidthRow = optWidthAll / (Math.round((optWidthAll + (spaceBetweenElements * itemsLength)) / (containerWidth + spaceBetweenElements)) || 1);

			// attach items to rows
			loopPos = itemsLength;
			while(loopPos--) {
				item = items[loopPos];
				if (curWidthRow + (item.optWidth / 2) > optWidthRow * rows.length) {
					rows.unshift({
						displaySizeY: 0,
						displayPosY: 0,
						ratioAll: 0,
						items: []
					});
				}
				curWidthRow += item.optWidth;
				rows[0].ratioAll += item.ratio;
				rows[0].items.unshift(item);
			}

			// calculate sizes and positions of elements
			rowsLength = rows.length;
			prevRow = null;
			for (loopPos = 0; loopPos < rowsLength; loopPos++) {
				row = rows[loopPos];
				displaySizeAllX = 0;
				displaySizeAllY = 0;
				rowLength = row.items.length;
				containerWidthWithoutSpaces = containerWidth - ((rowLength - 1) * spaceBetweenElements);

				for (loopPos2 = 0; loopPos2 < rowLength; loopPos2++) {
					item = row.items[loopPos2];
					item.displaySizeX = Math.round((item.ratio / row.ratioAll) * containerWidthWithoutSpaces);
					item.displayPosX = displaySizeAllX + (loopPos2 * spaceBetweenElements);
					displaySizeAllX += item.displaySizeX;

					if (loopPos2 === rowLength - 1 && displaySizeAllX !== containerWidthWithoutSpaces) {
						item.displaySizeX += containerWidthWithoutSpaces - displaySizeAllX;
					}
					displaySizeAllY += item.displaySizeX / item.ratio;
				}

				row.displaySizeY = Math.round(displaySizeAllY / rowLength);
				row.displayPosY = prevRow ? prevRow.displayPosY + prevRow.displaySizeY + spaceBetweenElements : 0;

				renderObject.size[1] += row.displaySizeY + (loopPos ? spaceBetweenElements : 0);

				prevRow = row;
			}

			return renderObject;
		}
	};

	// if jQuery is available register Gridzy as a plugin
	if (typeof jQuery !== 'undefined' && typeof jQuery.fn !== 'undefined') {
		jQuery.fn.gridzy = function(options) {
			return this.each(function() {
				jQuery(this).data('gridzy', new gridzy(this, options));
			});
		};
	}

	return gridzy;
})();
