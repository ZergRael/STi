modules.forums = {
	name: "forums",
	dText: "Forums",
	pages: [
		{ path_name: "/forums.php", params: { action: 'viewtopic' }, options: { buttons: '.linkbox:first' } }
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

		var addSignatureToggler = function() {
			if(!opt.get(module_name, "hidable_sigs")) {
				return;
			}

			dbg("[signatureToggler] Added");
			$(document).on("click", "p.sig_separator", function() {
				dbg("[signatureToggler] Clicked");
				$(this).next(".usersignature").toggle();
			});
		};

		var hideSignatures = function() {
			if(!opt.get(module_name, "hide_signatures")) {
				return;
			}

			$(".usersignature").hide();
		}

		dbg("[Init] Starting");
		// Execute functions

		addSignatureToggler();
		hideSignatures();

		$(document).on("endless_scrolling_insertion_done", function() {
			dbg("[endless_scrolling] Module specific functions");
			$(document).trigger("recolor_twits");
			hideSignatures();
			$(document).trigger("es_dom_process_done");
		});

		dbg("[Init] Ready");
	}
};