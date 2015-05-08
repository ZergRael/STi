modules.m_account = {
	name: "m_account",
	dText: "Account",
	pages: [
		{ path_name: "/my.php", params: false, options: { signature_input: "textarea[name=signature]", customMenu_input: "textarea[name=bloc_left]", previewDelay: 600 } }
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

		var lastSignatureInput;
		var onSignatureUpdate = function() {
			var input = $(this).val();
			var outputArea = $("#signature_preview");
			if(!outputArea.length) {
				$(this).after('<div id="signature_preview"></div>');
				outputArea = $("#signature_preview");
			}

			var lastInput;
			if(lastSignatureInput != input) {
				utils.delay(function() {
					utils.post({ host: "https://api.thetabx.net", path: "/sot/1/bbtohtml" }, { bbcode: input }, function(data) {
						outputArea.html(data.html);
					});
				}, mOptions.previewDelay);
				lastSignatureInput = input;
			}
		};

		var lastCustomMenuInput;
		var onCustomMenuUpdate = function() {
			var input = $(this).val();
			if(lastCustomMenuInput != input) {
				utils.delay(function() {
					utils.post({ host: "https://api.thetabx.net", path: "/sot/1/bbtohtml"}, { bbcode: input }, function(data) {
						$("#custom_menu").html(data.html);
					});
				}, mOptions.previewDelay);
				lastCustomMenuInput = input;
			}
		};

		dbg("[Init] Starting");
		// Execute functions

		if(!pageUrl.params) {
			$(mOptions.signature_input).keyup(onSignatureUpdate);
			$(mOptions.customMenu_input).keyup(onCustomMenuUpdate);
			$(mOptions.signature_input).trigger("keyup");
			lastCustomMenuInput = $(mOptions.customMenu_input).val();
		}

		dbg("[Init] Ready");
	}
};