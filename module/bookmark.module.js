modules.bookmark = {
	name: "bookmark",
	pages: [
		{ path_name: "/bookmark.php", options: { buttons: '#head_notice_left > a:last'}}
	],
	loaded: false,
	loadModule: function(mOptions) {
		this.loaded = true;
		var module_name = this.name;
		var dbg = function() {
			utils.dbg(module_name, arguments);
		};

		dbg("[Init] Loading module");
		// Loading all functions used

		var setHighlight = function() {
			$("#torrent tbody tr").removeClass('bookmark_highlight');
			$(this).parents("tr").addClass("bookmark_highlight");
		};

		var sortColumnClick = function() {
			if(sort == $(this).attr("id")) {
				order = (order == "desc" ? "asc" : "desc");
			}
			else {
				sort = $(this).attr("id");
				order = "asc";
			}
			sortData();
			return false;
		};

		var order = "desc", sort = "sortDate";
		var sortData = function() {
			if(!sort) {
				return;
			}

			var sortFunc = false;
			switch(sort) {
				case "sortName":
					sortFunc = function(a, b) {
						var aN = $(a).find("td:nth-child(1)").text();
						var bN = $(b).find("td:nth-child(1)").text();
						return order == "desc" ? (aN > bN ? -1 : 1) : (aN > bN ? 1 : -1);
					};
					break;
				case "sortDate":
					sortFunc = function(a, b) {
						var aN = $(a).find("td:nth-child(2)").text();
						var bN = $(b).find("td:nth-child(2)").text();
						return order == "desc" ? (utils.dateToDuration(aN).minTot > utils.dateToDuration(bN).minTot ? -1 : 1) : (utils.dateToDuration(aN).minTot > utils.dateToDuration(bN).minTot ? 1 : -1);
					};
					break;
				case "sortSize":
					sortFunc = function(a, b) {
						var aN = $(a).find("td:nth-child(3)").text();
						var bN = $(b).find("td:nth-child(3)").text();
						return order == "desc" ? (utils.strToSize(aN).koTot > utils.strToSize(bN).koTot ? -1 : 1) : (utils.strToSize(aN).koTot > utils.strToSize(bN).koTot ? 1 : -1);
					};
					break;
				case "sortS":
					sortFunc = function(a, b) {
						var aN = Number($(a).find("td:nth-child(4)").text());
						var bN = Number($(b).find("td:nth-child(4)").text());
						return order == "desc" ? (aN > bN ? -1 : 1) : (aN > bN ? 1 : -1);
					};
					break;
				case "sortL":
					sortFunc = function(a, b) {
						var aN = Number($(a).find("td:nth-child(5)").text());
						var bN = Number($(b).find("td:nth-child(5)").text());
						return order == "desc" ? (aN > bN ? -1 : 1) : (aN > bN ? 1 : -1);
					};
					break;
			}
			$("#bookmark_list tr:not(:first)").detach().sort(sortFunc).appendTo($("#bookmark_list"))
			$(".dl a").click(setHighlight);
		};

		dbg("[Init] Starting");
		// Execute functions
		var colSortButtons = [ "sortName", "sortDate", "sortSize", "sortS", "sortL" ];
		var i = 0;
		$("#bookmark_list tr:first td").each(function() {
			if(colSortButtons[i]) {
				$(this).wrapInner('<a id="' + colSortButtons[i] + '" class="sortCol" href="#">');
			}
			i++;
		});

		$(".dl a").click(setHighlight);
		$(".sortCol").click(sortColumnClick);

		modules.global.parseBookmarks($("#bookmark_list tr:not(:first)"));

		dbg("[Init] Ready");
	}
};
