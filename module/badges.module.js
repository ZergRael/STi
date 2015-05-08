modules.badges = {
	name: "badges",
	dText: "Badges",
	pages: [
		{ path_name: "/stats.php", params: { badges: true }, options: {} }
	],
	loaded: false,
	loadModule: function(mOptions) {
		this.loaded = true;
		var module_name = this.name;
		var dbg = function() {
			utils.dbg(module_name, arguments);
		};

		var userId = utils.getUserId();

		dbg("[Init] Loading module");
		// Loading all functions used

		var badgesData = [
			{
				name: "birthday", // 0
				badges: [12, 24, 36, 48, 60],
				pLabelName: "Date d'inscription",
				regex: /((\d+)\/(\d+)\/(\d+) a (\d+):(\d+))/,
				postFunc: function(val) {
					return utils.dateToDuration(val).monthTot;
				}
			},
			{
				name: "invites", // 1
				badges: [1, 5, 10, 15, 30],
				countFunc: function($html) {
					if($html.find("#contenu tbody").length == 0) return 0;
					return $html.find("#contenu tbody tr").length - 1;
				}
			},
			{
				name: "requests", // 2
				badges: [1, 5, 10, 25, 50],
				countFunc: function($html) {
					if($html.find("#requests_list").length == 0) return 0;
					return $html.find("#requests_list tbody tr").length - 1;
				}
			},
			{
				name: "posts", // 3
				badges: [1, 25, 50, 250, 500],
				pLabelName: "Posts : Forums / Commentaires",
				regex: /([\d,]+) \//
			},
			{
				name: "topics", // 4
				badges: [1, 10, 25, 50, 75]
				// no idea where to get that
			},
			{
				name: "misc" // 5
				// don't really care of onetime action badges
			},
			{
				name: "uploads", // 6
				badges: [1, 10, 100, 500, 1000],
				pLabelName: "Nombre de Torrent postés",
				regex: /(\d+)/
			},
			{
				name: "downloads", // 7
				badges: [1, 10, 100, 500, 1000],
				// count based on snatched ?
			}
		];

		var badgesReqParse = [
			{ url: "/sotorrent.php?id=" + userId, sections: [0, 3, 6] },
			{ url: "/invite.php?mine", sections: [1] },
			{ url: "/req.php?mine&filled&ak=" + utils.getAuthkey(), sections: [2] }
		];

		var parse_progress = function() {
			if(!opt.get(module_name, "progress")) {
				return;
			}

			dbg("[progress] Showing progress");
			
			var lastGrab = false;
			var completedAjaxCalls = 0;
			$.each(badgesReqParse, function(i_url, url_section) {
				utils.grabPage({ host: pageUrl.host, path: url_section.url }, function(data) {
					var jData = $(data);
					$.each(url_section.sections, function(_, i_section) {
						var badgeBlock = badgesData[i_section];

						// Find directly by dom
						if(badgeBlock.dom) {
							badgeBlock.strVal = jData.find(badgeBlock.dom).text().match(badgeBlock.regex)[1];
							dbg("[progress] %s >> Got value [%s]", badgeBlock.name, badgeBlock.strVal);
						}

						// Find by label name
						if(badgeBlock.pLabelName) {
							jData.find("#contenu p").each(function() {
								if($(this).text().indexOf(badgeBlock.pLabelName) >= 0) {
									badgeBlock.strVal = $(this).text().match(badgeBlock.regex)[1];
									dbg("[progress] %s >> Got value [%s]", badgeBlock.name, badgeBlock.strVal);
								}
							});
						}

						if(badgeBlock.countFunc) {
							badgeBlock.strVal = badgeBlock.countFunc(jData);
							dbg("[progress] %s >> Got value [%s]", badgeBlock.name, badgeBlock.strVal);
						}
					});
				},
				function() {
					completedAjaxCalls++;
					if(completedAjaxCalls >= badgesReqParse.length) {
						show_progress();
					}
				});
			});

			dbg("[progress] Ended requests");
		};

		var show_progress = function() {
			dbg("[progress] Ajax ended - Process & DOM insert");
			// Parsing string to int
			$.each(badgesData, function(row, badgeBlock) {
				if(badgeBlock.strVal !== undefined) {
					badgeBlock.val = badgeBlock.postFunc ? badgeBlock.postFunc(badgeBlock.strVal) : utils.strToInt(badgeBlock.strVal);
				}
				else if(badgeBlock.func) {
					badgeBlock.val = badgeBlock.func();
				}
			});
			// Inserting into DOM
			$.each(badgesData, function(row, badgeBlock) {
				set_badge_row(row);
			});
			dbg("[progress] Ended");
		};

		var set_badge_row = function(row) {
			badgeBlock = badgesData[row];
			if(badgeBlock.val !== undefined) {
				$("tbody tr").eq(row).find("td:not(:first)").each(function(i) {
					var badgeTrigger = badgeBlock.badges[i];
					if(!badgeTrigger) {
						return;
					}
					$(this).find(".sti_progress").remove();
					$(this).append('<div class="sti_progress"><div class="sti_progress_area"><div class="sti_progress_bar' + (badgeBlock.val >= badgeTrigger ? ' sti_valid' : '') + '" style="width: ' + (badgeBlock.val >= badgeTrigger ? badgeTrigger : badgeBlock.val) / badgeTrigger * 100 + '%"></div><div class="sti_progress_numbers">' + (badgeBlock.val >= badgeTrigger ? badgeTrigger : Math.floor(badgeBlock.val)) + '/' + badgeTrigger + '</div></div></div>');
				});
			}
		};

		dbg("[Init] Starting");
		// Execute functions

		parse_progress();
		opt.setCallback(module_name, "progress", function(state) {
			if(state) {
				parse_progress();
			}
			else {
				$(".sti_progress").remove();
			}
		});

		dbg("[Init] Ready");
	}
};