module.exports = function defineLogLine(Janeway, Blast, Bound) {

	var stripEsc = Janeway.stripEsc,
	    esc = Janeway.esc,
	    F = Bound.Function,
	    N = Bound.Number,
	    S = Bound.String;

	/**
	 * A generic line of text in the log list output
	 *
	 * @author   Jelle De Loecker   <jelle@develry.be>
	 * @since    0.1.0
	 * @version  0.1.0
	 *
	 * @param    {LogList}   logList   The parent LogList instance
	 */
	var ArgsLogLine = Janeway.LogLine.extend(function ArgsLogLine(logList) {

		ArgsLogLine.super.call(this, logList);

		// The arguments to print out
		this.args = null;

		// A map of the (simple) line to their argument number
		this.simpleMap = [];

		// A map of the args to their string values, set at init
		this.argStringMap = [];

		// The individual object representation of this line
		this.structure = [];

		// The pagination object
		this.pagination = {};
	});

	/**
	 * Set the fileinfo
	 *
	 * @author   Jelle De Loecker   <jelle@develry.be>
	 * @since    0.1.4
	 * @version  0.1.4
	 *
	 * @param    {Object}   info
	 */
	ArgsLogLine.setMethod(function setFileinfo(info) {

		if (typeof info == 'string') {
			this.colouredFileinfo = ' ' + info;
			this.fileinfo = stripEsc(this.colouredFileinfo);
		} else {
			this.fileObject = info;
		}
	});

	/**
	 * Set the arguments for this line
	 *
	 * @author   Jelle De Loecker   <jelle@develry.be>
	 * @since    0.1.0
	 * @version  0.1.4
	 *
	 * @param    {Array}   args   An array of variables
	 */
	ArgsLogLine.setMethod(function set(args) {

		if (this.fileObject) {
			Array.prototype.unshift.call(args, this.fileObject);
		}

		this.args = args;
		this.dissect();
	});

	/**
	 * Compare new arguments to this line
	 *
	 * @author   Jelle De Loecker   <jelle@develry.be>
	 * @since    0.2.0
	 * @version  0.2.0
	 */
	ArgsLogLine.setMethod(function compare(args, type, options) {

		var i,
		    j;

		if (this.fileObject) {
			i = 1;
			j = 0;
		} else {
			i = 0;
			j = -1;
		}

		// Args can only be the same if the have the same length
		// A file object is added to the args line afterwards, so subtract that
		if (this.args.length != (args.length + i)) {
			return 0;
		}

		// Ignore the first argument, it's the error object
		for (i = 0; i < args.length; i++) {
			j++;

			if (typeof args[i] != typeof this.args[j]) {
				return false;
			}

			// For primitive values we can just do a simple compare
			if (typeof args[i] != 'object') {
				if (args[i] != this.args[j]) {
					return false;
				}
			}

			// For object types we need to do a more expensive compare
			if (!Blast.Bound.Object.alike(args[i], this.args[j])) {
				return false;
			}
		}

		// If we got this far the 2 lines were the same
		return true;
	});

	/**
	 * Dissect the given args,
	 * called after #set()
	 *
	 * @author   Jelle De Loecker   <jelle@develry.be>
	 * @since    0.1.0
	 * @version  0.2.5
	 */
	ArgsLogLine.setMethod(function dissect() {

		var name_to_show,
		    has_progress,
		    index,
		    plain,
		    start,
		    temp,
		    hlen,
		    len,
		    end,
		    str,
		    arg,
		    i;

		index = 0;

		for (i = 0; i < this.args.length; i++) {
			arg = this.args[i];

			if (typeof arg == 'string') {
				// Strip all escape sequences for the plain string
				plain = stripEsc(arg);
				str = esc(39, arg);
			} else if (typeof arg == 'number') {
				plain = String(arg);
				str = esc(36, plain);
			} else if (typeof arg == 'boolean') {
				plain = String(arg);
				str = esc(35, plain);
			} else if (arg && typeof arg === 'object') {

				if (arg.type == 'callerInfo') {

					if (this.logList.janeway.args_name_map != null) {
						name_to_show = this.logList.janeway.args_name_map[arg.path] || this.logList.janeway.args_name_map[arg.file];
					}

					if (!name_to_show) {
						name_to_show = arg.file.replace(/\.js$/, '').trim();
					}

					str = esc(1, N.toPaddedString(arg.time.getHours(), 2) + ':' + N.toPaddedString(arg.time.getMinutes(), 2) + ':' + N.toPaddedString(arg.time.getSeconds(), 2));
					str += ' ' + esc('1;90', '[', 21) + esc('1;30;97', name_to_show + ':' + arg.line, '39') + esc('1;90', ']', 21);

					if (arg.seen > 1) {
						str += ' (' + esc('1;30;226', arg.seen, '39') + esc('1;90', ')', 21);
					}

					plain = stripEsc(str);
				} else {

					has_progress = false;
					hlen = Object.getOwnPropertyNames(arg).length;
					len = Object.keys(arg).length;

					if (hlen !== len) {
						len = hlen + '/' + len;
					}

					if (arg.constructor && arg.constructor.name) {
						temp = arg.constructor.name;

						// Add the namespace property, too
						if (arg.constructor.namespace) {
							temp = arg.constructor.namespace + '.' + temp;
						}

						if (typeof arg.reportProgress == 'function') {
							has_progress = true;
						}
					} else {
						temp = 'Object';
					}

					if (has_progress) {
						let that = this,
						    instance = arg,
						    index = i,
						    name  = temp;

						instance.reportProgress = function reportProgress(value) {

							var plain,
							    s_val,
							    str;

							s_val = ~~value;

							plain = '{' + name + ' ' + s_val + '%}';
							str = esc(1, '{', 21) + esc('1;93', name, '39') + ' ' + s_val + '%}';

							that.argStringMap[index].plain = plain;
							that.argStringMap[index].colour = str;

							value = instance.constructor.prototype.reportProgress.call(instance, value);

							that.render();

							return value;
						};

						plain = '{' + temp + ' ' + instance.progress + '%}';
						str = esc(1, '{', 21) + esc('1;93', temp, '39') + ' ' + instance.progress + '%}';

					} else {
						plain = '{' + temp + ' ' + len + '}';
						str = esc(1, '{', 21) + esc('1;93', temp, '39') + ' ' + len + '}';
					}
				}
			} else {
				plain = String(arg);
				str = esc(31, plain);
			}

			// Get the startingpoint of this string in the line
			start = this.simpleMap.length;

			// Calculate the new end
			end = start + plain.length;

			// Make the simpleMap longer
			this.simpleMap.length = end;

			// Set the arg pointer value
			Bound.Array.fill(this.simpleMap, i, start, end);

			// Set the arg string value
			this.argStringMap[i] = {
				arg: arg,
				plain: plain,
				colour: str,
			};

			// Add a space to the map
			this.simpleMap.push(' ');
		}
	});

	/**
	 * Return the (coloured) representation of this line's contents
	 *
	 * @author   Jelle De Loecker   <jelle@develry.be>
	 * @since    0.1.0
	 * @version  0.1.2
	 *
	 * @param    {Number}   absX   On what (plain) char position was clicked
	 */
	ArgsLogLine.setMethod(function getContentString(absX) {

		var clickedArgNr,
		    highlighted,
		    str,
		    val,
		    xg,
		    i;

		if (typeof absX !== 'undefined') {

			// Calculate the X plus the gutter
			gx = this.getRelativeX(absX);

			clickedArgNr = this.simpleMap[gx];
		}

		str = '';

		for (i = 0; i < this.argStringMap.length; i++) {

			// Highlight the argument if it was clicked on
			if (i === clickedArgNr) {
				str += esc(7);
				highlighted = true;
			}

			val = this.argStringMap[i];
			str += val.colour;

			// Disable the highlight
			highlighted = false;
			str += esc(27);

			// Always add an empty space after an argument
			str += ' ';
		}

		return str;
	});

	/**
	 * Get the clicked on argument
	 *
	 * @author   Jelle De Loecker   <jelle@develry.be>
	 * @since    0.1.0
	 * @version  0.1.0
	 *
	 * @param    {Number}   x   On what (plain) char position was clicked
	 */
	ArgsLogLine.setMethod(function getArgByX(absX) {

		var argNr,
		    gx;

		// Calculate the x minus the gutter
		gx = this.getRelativeX(absX);

		argNr = this.simpleMap[gx];

		if (typeof argNr === 'number') {
			return this.argStringMap[argNr].arg;
		}
	});

	/**
	 * Get all getters of an object
	 *
	 * @author   Jelle De Loecker   <jelle@develry.be>
	 * @since    0.3.0
	 * @version  0.3.0
	 *
	 * @param    {Object}   arg
	 *
	 * @return   {Object}
	 */
	ArgsLogLine.setMethod(function getObjectGetters(arg) {

		var result = Object.create(null),
		    current = arg,
		    descriptors,
		    entry,
		    key;

		while (current && typeof current == 'object') {
			descriptors = Object.getOwnPropertyDescriptors(current);

			for (key in descriptors) {

				if (key == '__proto__') {
					continue;
				}

				entry = descriptors[key];

				if (entry.get) {
					result[key] = entry;
				}
			}

			if (current.__proto__) {
				current = current.__proto__;
			} else {
				break;
			}
		}

		return result;
	});

	/**
	 * Get the length of the longest string
	 *
	 * @author   Jelle De Loecker   <jelle@develry.be>
	 * @since    0.3.0
	 * @version  0.3.0
	 *
	 * @param    {Array}   strings
	 *
	 * @return   {Number}
	 */
	ArgsLogLine.setMethod(function getLongestLength(strings) {

		var result = 0,
		    len,
		    i = strings.length;

		if (i) while (i--) {
			len = strings[i].length;

			if (len > result) {
				result = len;
			}
		}

		return result;
	});

	/**
	 * Select this line
	 *
	 * @author   Jelle De Loecker   <jelle@develry.be>
	 * @since    0.1.0
	 * @version  0.3.0
	 *
	 * @param    {Number}   x   On what (plain) char position was clicked
	 */
	ArgsLogLine.setMethod(function select(absX, level) {

		var line_count,
		    propLine,
		    is_array,
		    max_page,
		    all_keys,
		    getters,
		    getter,
		    hprops,
		    length,
		    lines,
		    keys,
		    prev,
		    arg,
		    key,
		    i;

		if (typeof level !== 'number') {
			level = 0;
		}

		// Call the parent
		Janeway.LogLine.prototype.select.call(this, absX);

		// Get the clicked on argument
		arg = this.getArgByX(absX);

		if (this.pagination.arg != arg) {
			this.pagination = {
				page : 0,
				arg  : arg
			};
		}

		// Remember where we pressed when selecting this
		this.selected_abs_x = absX;

		line_count = 0;

		if (Buffer.isBuffer(arg)) {
			// Show a nice hexadecimal view of the buffer

			// The previous line is this parent one at the beginning
			prev = this;

			// See where the current page should start
			i = this.pagination.page * 25 * 16;

			// Calculate the max amount of pages
			max_page = (arg.length / (16 * 25)) - 1;

			this.pagination.max_page = max_page;

			if (max_page > 1) {
				propLine = new Janeway.PagingLogLine(this.logList);
				propLine.parent = this;
				this.children.push(propLine);
				this.logList.insertAfter(propLine, prev.index);
				prev = propLine;
			}

			// Iterate over the contents, show 16 bytes on every line
			for (; i < arg.length; i += 16) {
				line_count++;

				// Create a new line
				propLine = new Janeway.HexLogLine(this.logList);

				if (line_count == 1) {
					this.first_hex_line = propLine;
					propLine.first_line = true;
				}

				// Give it the buffer object
				propLine.set(arg, i, false, level);

				// Set this line as its parent
				propLine.parent = this;

				this.children.push(propLine);

				this.logList.insertAfter(propLine, prev.index);

				// Make a link to the this line in the previous one
				if (prev !== this) {
					prev.next = propLine;
				}

				prev = propLine;

				if (line_count >= 25) {
					break;
				}
			}

			if (propLine) {
				propLine.last_line = true;
			}

			if (max_page > 1 || this.pagination.page) {
				propLine = new Janeway.PagingLogLine(this.logList);
				propLine.parent = this;
				this.children.push(propLine);
				this.logList.insertAfter(propLine, prev.index);
				prev = propLine;
			}

		} else if ((typeof arg == 'object' || typeof arg == 'function') && arg) {
			// Read out the contents of this argument if it's an object!

			// First: get its own keys
			keys = Object.keys(arg);

			// We'll store all keys in here, too
			all_keys = keys.slice(0);

			// Is this an array?
			is_array = Array.isArray(arg);

			// Get all the getters
			getters = this.getObjectGetters(arg);

			// Add all getter keys
			all_keys = all_keys.concat(Object.keys(getters));

			// Now get all the hidden ones
			hprops = Bound.Array.subtract(Object.getOwnPropertyNames(arg), all_keys);

			// Add all the hidden keys
			all_keys = all_keys.concat(hprops);

			// Get the length of the longest key
			length = this.getLongestLength(all_keys);

			// How many lines do we have already?
			lines = 0;

			// Add 'prototype' to the hidden properties if it exists
			if (arg.__proto__) {
				hprops.push('__proto__');
			}

			// Set the current (parent) as the prev item
			prev = this;

			// First do the visible keys
			for (i = 0; i < keys.length; i++) {
				lines++;
				key = keys[i];

				// Create a new Property Log Line
				propLine = new Janeway.PropertyLogLine(this.logList);

				propLine.longest_key = length;

				if (lines == 1) {
					propLine.first_line = true;
					propLine.opens_array = is_array;
				}

				// Is this the last line?
				if (!hprops.length && keys.length == i+1 && Object.isEmpty(getters)) {
					propLine.last_line = true;
					propLine.closes_array = is_array;
				}

				// Give it the complete arg object, and the key it needs to use
				// inside of it
				propLine.set(arg, key, true, level);

				// Set this line as its parent
				propLine.parent = this;

				this.children.push(propLine);

				// This will become insertLine later
				this.logList.insertAfter(propLine, prev.index);

				prev = propLine;
			}

			// Now do the getters
			i = -1;

			for (key in getters) {
				lines++;
				i++;
				getter = getters[key];

				// Create a new Property Log Line
				propLine = new Janeway.PropertyLogLine(this.logList);

				propLine.longest_key = length;

				if (lines == 1) {
					propLine.first_line = true;
					propLine.opens_array = is_array;
				}

				// Is this the last line?
				if (!hprops.length && keys.length == i+1) {
					propLine.last_line = true;
					propLine.closes_array = is_array;
				}

				// Give it the complete arg object, and the key it needs to use
				// inside of it
				propLine.set(arg, key, getter, level);

				// Set this line as its parent
				propLine.parent = this;

				this.children.push(propLine);

				// This will become insertLine later
				this.logList.insertAfter(propLine, prev.index);

				prev = propLine;
			}

			// Now do the hidden ones
			for (i = 0; i < hprops.length; i++) {
				lines++;
				key = hprops[i];

				// Create a new Property Log Line
				propLine = new Janeway.PropertyLogLine(this.logList);

				propLine.longest_key = length;

				if (lines == 1) {
					propLine.first_line = true;
					propLine.opens_array = is_array;
				}

				if (hprops.length == i+1) {
					propLine.last_line = true;
					propLine.closes_array = is_array;
				}

				// Give it the complete arg object, and the key it needs to use
				// inside of it
				propLine.set(arg, key, false, level);

				// Set this line as its parent
				propLine.parent = this;

				this.children.push(propLine);

				// This will become insertLine later
				this.logList.insertAfter(propLine, prev.index);

				prev = propLine;
			}

		} else if (typeof arg == 'string' && (~arg.indexOf('\n') || ~arg.indexOf('\r'))) {

			// Split by newlines
			lines = arg.split(/\n|\r\n|\r/);

			prev = this;

			for (i = 0; i < lines.length; i++) {

				// Create a new line
				propLine = new Janeway.StringLogLine(this.logList);

				if (i == 0) {
					propLine.first_line = true;
				}

				// Give it the lines object
				propLine.set(lines, i, false, level);

				// Set this line as its parent
				propLine.parent = this;

				this.children.push(propLine);

				this.logList.insertAfter(propLine, prev.index);

				prev = propLine;
			}

			propLine.last_line = true;
		}

		return arg;
	});

	Janeway.ArgsLogLine = ArgsLogLine;
};