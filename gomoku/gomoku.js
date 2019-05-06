(function() {
	'use strict';

	var doc = window.document;
	var body = doc.body;

	var canvas = byId('gomoku-board');
	var ctx = canvas.getContext('2d');

	var form = byId('gomoku-settings');

	var rowsElement = byId('gomoku-rows');
	var colsElement = byId('gomoku-cols');

	var backButton = byId('back');
	var logElement = byId('log');
	var alertElement = byId('alert');
	var messageElement = byId('message');

	var HUMAN = 1;
	var CPU = 2;

	var PLAYER = 1;
	var OPPONENT = 2;

	var CROSS = 1;
	var CIRCLE = 2;
	var TRIANGLE = 3;

	var GOAL = 5;

	var priors = {
		rules: []
	};

	priors.add = function(hits, open, count, type) {
		this.rules.push([type, hits, open]);
	};

	priors.get = function(item) {
		var i, il, r, open;

		for (i = 0, il = this.rules.length; i < il; i++) {
			r = this.rules[i];
			open = 0;

			if (item.blankPrev > 0) ++open;
			if (item.blankNext > 0) ++open;

			if (item.hits >= r[1] && open >= r[2] && item.hits + item.blankPrev + item.blankNext >= GOAL) {
				return il - i;
			}
		}

		return 0;
	};

	priors.add(5, 0, 1, PLAYER);

	priors.add(5, 0, 1, OPPONENT);
	priors.add(4, 2, 1, PLAYER);
	priors.add(4, 1, 1, PLAYER);
	priors.add(4, 2, 1, OPPONENT);
	priors.add(3, 2, 1, PLAYER);

	priors.add(3, 2, 1, OPPONENT);
	priors.add(4, 1, 1, OPPONENT);
	priors.add(3, 1, 1, PLAYER);
	priors.add(2, 2, 1, PLAYER);
	priors.add(2, 1, 1, PLAYER);

	priors.add(3, 1, 1, OPPONENT);
	priors.add(2, 2, 1, OPPONENT);
	priors.add(2, 1, 1, OPPONENT);
	priors.add(2, 0, 1, PLAYER);
	priors.add(2, 0, 1, OPPONENT);

	priors.add(1, 0, 1, PLAYER);

	var game = {
		running: false,
		started: false,
		blocks: [],
		players: [],
		round: 1,
		current: 0,
		size: 25
	};

	game.start = function(rows, cols, players) {
		this.rows = rows;
		this.cols = cols;

		this.players = players;

		this.init();

		if (this.players[this.current] === CPU) {
			this.ai();
		}
	};

	game.init = function() {
		this.reset();
		this.clear();

		this.round = 1;
		this.current = 0;
		this.winner = null;
		this.running = true;
		this.started = true;

		this.resize();
	};

	game.end = function() {
		this.started = false;

		hide(byId('gomoku-game'));
		hide(alertElement);
		hide(backButton);
		show(form);
	};

	game.over = function(player) {
		var winner = player === null ? 'Draw!' : 'Player ' + player + ' won!';

		this.running = false;

		html(messageElement, 'Game over! ' + winner + ' Press space to restart!');
		show(alertElement);
	};

	game.reset = function() {
		this.blocks = [];
	};

	game.clear = function() {
		ctx.clearRect(0, 0, canvas.width, canvas.height);
	};

	game.resize = function() {
		var availWidth, availHeight;

		if (!this.started) return false;

		availWidth = doc.documentElement.offsetWidth * 0.9 | 0;
		availHeight = doc.documentElement.offsetHeight * 0.9 | 0;

		this.size = Math.max(25, Math.min(availWidth / this.cols | 0, availHeight / this.rows | 0));

		this.render();
	};

	game.render = function() {
		var i, il, b;

		if (!this.started) {
			return false;
		}

		this.setSize();
		this.grid();

		for (i = 0, il = this.blocks.length; i < il; i++) {
			if (b = this.blocks[i]) {
				this.draw(b, i % this.cols, i / this.cols | 0);
			}
		}

		if (this.winner) {
			this.strike(this.winner);
		}
	};

	game.setSize = function() {
		this.width = canvas.width = this.cols * this.size;
		this.height = canvas.height = this.rows * this.size;
	};

	game.grid = function() {
		var x = this.cols;
		var y = this.rows;
		var s = this.size;

		for (;--x;) {
			ctx.moveTo(x * s, 0);
			ctx.lineTo(x * s, this.height);
		}

		for (;--y;) {
			ctx.moveTo(0, y * s);
			ctx.lineTo(this.width, y * s);
		}

		ctx.stroke();
	};

	game.check = (function() {
		var directions = [[0, 1], [1, 1], [1, 0], [1, -1]];

		function sort(a, b) {
			return b.hits - a.hits;
		}

		return function(x, y, type, getItems) {
			var i = directions.length;
			var all = [], actual;
			var dir, r, dirX, dirY;
			var hits, items;
			var blankPrev, blankNext;

			for(;i--;) {
				actual = {};

				dir = directions[i];
				dirX = dir[0];
				dirY = dir[1];
				
				hits = 1;
				blankPrev = 0;
				blankNext = 0;

				if (getItems === true) {
					items = [[x, y], [x, y]];
				}

				r = 1;
				// count hits, dir = next
				while (this.blocks[this.index(x + dirX * r, y + dirY * r)] === type && this.isCell(x + dirX * r, y + dirY * r)) {
					if (getItems === true) {
						items[0] = [x + dirX * r, y + dirY * r];
					}

					++r;
					++hits;
				}
				// count blank, dir = next
				while (!this.blocks[this.index(x + dirX * r, y + dirY * r)] && this.isCell(x + dirX * r, y + dirY * r)) {
					++r;
					++blankNext;
				}

				r = 1;
				// count hits, dir = previous
				while (this.blocks[this.index(x - dirX * r, y - dirY * r)] === type && this.isCell(x - dirX * r, y - dirY * r)) {
					if (getItems === true) {
						items[1] = [x - dirX * r, y - dirY * r];
					}

					++r;
					++hits;
				}
				// count blank, dir = previous
				while (!this.blocks[this.index(x - dirX * r, y - dirY * r)] && this.isCell(x - dirX * r, y - dirY * r)) {
					++r;
					++blankPrev;
				}

				actual.hits = hits;
				actual.x = x;
				actual.y = y;
				actual.dirX = dirX;
				actual.dirY = dirY;
				actual.blankPrev = blankPrev;
				actual.blankNext = blankNext;
				actual.items = items;

				all.push(actual);
			}

			return all.sort(sort);
		}
	}());

	game.ai = function() {
		var x, y;
		var i, il, p, j, jl;
		var priority = priors.rules.length;
		var myType = this.symbol();
		var opponent1Type = this.symbol(1);
		var opponent2Type = this.symbol(2);
		var mine, opponent1, opponent2;
		var checkList, checkItems, checkItem;
		var hits, open, free;
		var picks = [], pick;
		var bestPoints, points;
		var filteredPicks = [];
		var moveX, moveY;
		
		if (!this.empty()) {
			for (x = this.cols; x--;) {
				for (y = this.rows; y--;) {
					if (!this.valid(x, y)) continue;

					mine = this.check(x, y, myType);
					opponent1 = this.check(x, y, opponent1Type);

					if (this.players.length === 3) {
						opponent2 = this.check(x, y, opponent2Type);
					}

					for (i = 0, il = priors.rules.length; i < il; i++) {
						if (priority < i) break;

						p = priors.rules[i];

						if (p[0] === PLAYER) {
							checkList = [mine];
						} else {
							checkList = [opponent1];

							if (this.players.length === 3) {
								checkList.push(opponent2);
							}
						}

						for (j = 0, jl = checkList.length; j < jl; j++) {
							checkItems = checkList[j];
							checkItem = checkItems[0];

							hits = checkItem.hits;
							free = checkItem.blankPrev + checkItem.blankNext;
							open = 0;

							if (checkItem.blankPrev > 0) ++open;
							if (checkItem.blankNext > 0) ++open;

							if (hits >= p[1] && open >= p[2] && hits + free >= GOAL) {
								if (priority !== i) {
									picks = [];
								}

								priority = i;
								picks.push(checkItems);
							}
						}
					}
				}
			}
		}

		if (picks.length > 0) {
			bestPoints = 0;

			for (i = 0, il = picks.length; i < il; i++) {
				checkItem = picks[i];
				points = 0;

				for (j = 0, jl = checkItem.length; j < jl; j++) {
					points += priors.get(checkItem[j]);
				}

				if (points >= bestPoints) {
					if (points > bestPoints) {
						filteredPicks = [];
						bestPoints = points;
					}

					filteredPicks.push(checkItem[0]);
				}
			}

			pick = filteredPicks[Math.random() * filteredPicks.length | 0];
			
			moveX = pick.x;
			moveY = pick.y;
		} else if (this.full()) {
			this.over(null);

			return false;
		} else {
			moveX = this.cols / 2 | 0;
			moveY = this.rows / 2 | 0;
		}

		if (!this.valid(moveX, moveY)) {
			console.error('Invalid coordinates by the AI: %d %d', moveX, moveY);

			this.over(null);

			return false;
		}

		this.move(moveX, moveY);
	};

	game.next = function() {
		if (!this.running) return false;

		++this.round;

		if (++this.current >= this.players.length) {
			this.current = 0;
		}

		if (this.players[this.current] === CPU) {
			this.ai();
		}
	};

	game.full = (function() {
		function filter(el) {
			return !!el;
		}

		return function() {
			return this.blocks.filter(filter).length === this.rows * this.cols;
		};
	}());

	game.empty = (function() {
		function filter(el) {
			return !!el;
		}

		return function() {
			return this.blocks.filter(filter).length === 0;
		};
	}());

	game.symbol = function(n) {
		n = n || 0;

		return (this.round + n) % this.players.length || this.players.length;
	};

	game.move = function(x, y) {
		var type = this.symbol();

		this.draw(type, x, y);
		this.add(type, x, y);
		this.next();
	};

	game.add = function(type, x, y) {
		var checkItem = this.check(x, y, type, true)[0];

		this.blocks[this.index(x, y)] = type;

		if (checkItem.hits >= GOAL) {
			this.winner = checkItem.items;
			this.strike(this.winner);
			this.over(type);
		}
	};

	game.handleClick = function(posX, posY) {
		var x, y;

		if (!this.running) return false;

		x = posX / this.size | 0;
		y = posY / this.size | 0;

		if (this.players[this.current] === HUMAN && this.valid(x, y)) {
			this.move(x, y);
		}
	};

	game.log = function(posX, posY) {
		var x = posX / this.size | 0;
		var y = posY / this.size | 0;

		html(logElement, x + ', ' + y);
	};

	game.index = function(x, y) {
		return this.cols * y + x;
	};

	game.valid = function(x, y) {
		return !this.blocks[this.index(x, y)] && this.isCell(x, y);
	};

	game.isCell = function(x, y) {
		return (
			x >= 0 &&
			y >= 0 &&
			x < this.cols &&
			y < this.rows
		);
	};

	game.draw = function(item, x, y) {
		ctx.beginPath();
		
		switch(item) {
			case CROSS:
				ctx.strokeStyle = 'red';
				ctx.lineWidth = 2;
				ctx.moveTo((x + 0.8) * this.size, (y + 0.2) * this.size);
				ctx.lineTo((x + 0.2) * this.size, (y + 0.8) * this.size);
				ctx.moveTo((x + 0.2) * this.size, (y + 0.2) * this.size);
				ctx.lineTo((x + 0.8) * this.size, (y + 0.8) * this.size);
				ctx.stroke();

				break;

			case CIRCLE:
				ctx.strokeStyle = 'blue';
				ctx.lineWidth = 2;
				ctx.arc((x + 0.5) * this.size, (y + 0.5) * this.size, this.size * 0.35 | 0, 0, Math.PI * 2);
				ctx.stroke();

				break;

			case TRIANGLE:
				ctx.strokeStyle = 'green';
				ctx.lineWidth = 2;
				ctx.lineJoin = 'round';
				ctx.moveTo((x + 0.2) * this.size, (y + 0.8) * this.size);
				ctx.lineTo((x + 0.5) * this.size, (y + 0.2) * this.size);
				ctx.lineTo((x + 0.8) * this.size, (y + 0.8) * this.size);
				ctx.closePath();
				ctx.stroke();

				break;
		}
	};

	game.strike = function(coords) {
		var s = this.size;
		var a = 0.5;

		var x1 = coords[0][0] + a;
		var y1 = coords[0][1] + a;
		var x2 = coords[1][0] + a;
		var y2 = coords[1][1] + a;

		ctx.beginPath();

		ctx.strokeStyle = 'rgba(0, 0, 0, 0.75)';
		ctx.lineWidth = 3;
		
		ctx.moveTo(x1 * s, y1 * s);
		ctx.lineTo(x2 * s, y2 * s);
		
		ctx.stroke();
	};

	window.addEventListener('resize', function() {
		game.resize();
	});

	body.addEventListener('keypress', function(e) {
		var key = e.keyCode || e.which;

		if (key === 32) { // space
			game.end();
		}
	});

	backButton.addEventListener('click', function() {
		game.end();
	});

	byId('gomoku-board').addEventListener('click', function(e) {
		game.handleClick(e.offsetX, e.offsetY);
	});

	byId('gomoku-board').addEventListener('mousemove', function(e) {
		game.log(e.offsetX, e.offsetY);
	});

	byId('gomoku-start').addEventListener('click', function() {
		var rows = +rowsElement.value;
		var cols = +colsElement.value;

		var players = [];

		var player1 = +byId('player-1').value;
		var player2 = +byId('player-2').value;
		var player3 = +byId('player-3').value;

		var rowsError = !isBetween(rows, GOAL, 99);
		var colsError = !isBetween(cols, GOAL, 99);

		setError(rowsElement, rowsError);
		setError(colsElement, colsError);

		if (!rowsError && !colsError) {
			players.push(player1, player2);

			if (player3) players.push(player3);

			hide(form);

			game.start(rows, cols, players);
			
			show(backButton);
			show(byId('gomoku-game'));
		}
	});

	byId('close').addEventListener('click', function() {
		hide(alertElement);
	});

	function byId(id) {
		return doc.getElementById(id);
	}

	function show(el) {
		el.style.display = 'block';
	}

	function hide(el) {
		el.style.display = 'none';
	}

	function html(el, html) {
		el.innerHTML = html;
	}

	function setError(el, hasError) {
		var formGroup = el.parentElement.parentElement;
		var helpBlock = el.nextElementSibling;

		if (hasError) {
			formGroup.classList.add('has-error');
			show(helpBlock);
		} else {
			formGroup.classList.remove('has-error');
			hide(helpBlock);
		}
	}

	function isBetween(n, min, max) {
		return n <= max && n >= min;
	}
}());
