// "Grund der Kontaktaufnahme" selector.
// One visible dropdown: main reasons render as bold, non-selectable group
// headings and their sub-issues as the selectable entries beneath them.
// CONTACT_REASONS is the single source of truth for the dropdown and for the
// submitted payload.
(function () {
	'use strict';

	// showInDropdown:false means the category can never be picked on its own.
	// Its label still appears as a group heading so the sub-issues underneath
	// stay reachable, and its reasonId still rides along on submission.
	var CONTACT_REASONS = [
		{
			id: 'wholesaler_retailer',
			label: 'Groß-/Einzelhändler werden',
			showInDropdown: true,
			subOptions: [
				{ id: 'wholesaler_opportunities', label: 'Möglichkeiten für Großhändler' },
				{ id: 'retailer_opportunities', label: 'Möglichkeiten für Einzelhändler' }
			]
		},
		{
			id: 'general_support',
			label: 'Allgemeiner Support',
			showInDropdown: true,
			subOptions: [
				{ id: 'where_to_buy', label: 'Wo kann ich Crown Switch kaufen?' },
				{ id: 'device_warranty', label: 'Gerätegarantie' },
				{ id: 'other_general_inquiry', label: 'Sonstige allgemeine Anfragen' }
			]
		},
		{
			id: 'device_support',
			label: 'Geräte-Support',
			showInDropdown: false,
			subOptions: [
				{ id: 'led_blinking_green', label: 'LED Anzeige: Grün blinkend' },
				{ id: 'led_blinking_red', label: 'LED Anzeige: Rot blinkend' },
				{ id: 'led_3_red_flashes', label: 'LED Anzeige: 3x rotes Blinken' },
				{ id: 'led_5_orange_flashes', label: 'LED Anzeige: 5x orangenes Blinken' },
				{ id: 'led_3_orange_flashes', label: 'LED Anzeige: 3x orangenes Blinken' },
				{ id: 'led_5_white_flashes', label: 'LED Anzeige: 5x weißes Blinken' },
				{ id: 'other_device_inquiry', label: 'Other device inquiry' }
			]
		},
		{ id: 'pod_support', label: 'Pod Support', showInDropdown: true, subOptions: [] },
		{ id: 'partnerships', label: 'Kooperationen', showInDropdown: true, subOptions: [] },
		{ id: 'website_feedback', label: 'Website Feedback', showInDropdown: true, subOptions: [] }
	];

	var HIDDEN_REASON_ID = 'device_support';
	var PLACEHOLDER = '-Select-';
	var KEY_SEPARATOR = '::';

	var els = {};
	var state = { reason: null, subIssue: null };

	function byId(id) { return document.getElementById(id); }

	function reasonById(id) {
		for (var i = 0; i < CONTACT_REASONS.length; i++) {
			if (CONTACT_REASONS[i].id === id) { return CONTACT_REASONS[i]; }
		}
		return null;
	}

	function subIssueById(reason, id) {
		if (!reason) { return null; }
		for (var i = 0; i < reason.subOptions.length; i++) {
			if (reason.subOptions[i].id === id) { return reason.subOptions[i]; }
		}
		return null;
	}

	function showError(show) {
		if (els.error) { els.error.style.display = show ? 'block' : 'none'; }
	}

	/* ---------------------------------------------------------------- render */

	function buildOption(value, text, reasonId, subIssueId) {
		var option = document.createElement('option');
		option.value = value;
		option.textContent = text;
		option.setAttribute('data-reason-id', reasonId);
		if (subIssueId) { option.setAttribute('data-sub-issue-id', subIssueId); }
		return option;
	}

	function renderDropdown() {
		var select = els.select;
		select.innerHTML = '';

		var placeholder = document.createElement('option');
		placeholder.value = PLACEHOLDER;
		placeholder.textContent = '';
		select.add(placeholder);

		CONTACT_REASONS.forEach(function (reason) {
			if (reason.subOptions.length === 0) {
				// Nothing to nest, so the reason itself is the selectable entry.
				if (!reason.showInDropdown) { return; }
				select.add(buildOption(reason.id, reason.label, reason.id));
				return;
			}

			// <optgroup> renders the reason bold and unselectable for free.
			var group = document.createElement('optgroup');
			group.label = reason.label;
			group.setAttribute('data-reason-id', reason.id);
			reason.subOptions.forEach(function (sub) {
				group.appendChild(buildOption(
					reason.id + KEY_SEPARATOR + sub.id, sub.label, reason.id, sub.id
				));
			});
			select.appendChild(group);
		});

		select.value = PLACEHOLDER;
	}

	/* ----------------------------------------------------------------- state */

	function parseSelection(value) {
		if (!value || value === PLACEHOLDER) { return { reason: null, subIssue: null }; }

		var parts = value.split(KEY_SEPARATOR);
		var reason = reasonById(parts[0]);
		return { reason: reason, subIssue: parts.length > 1 ? subIssueById(reason, parts[1]) : null };
	}

	// The visible <select> is unnamed and never posted. These hidden inputs are
	// what Zoho and the backend actually receive, so both halves of the choice
	// persist as one record even when only a sub-issue was clicked.
	function syncHiddenFields() {
		els.zohoReason.value = state.reason ? state.reason.label : '';
		els.zohoSubIssue.value = state.subIssue ? state.subIssue.label : '';
		els.reasonId.value = state.reason ? state.reason.id : '';
		els.reasonLabel.value = state.reason ? state.reason.label : '';
		els.subIssueId.value = state.subIssue ? state.subIssue.id : '';
		els.subIssueLabel.value = state.subIssue ? state.subIssue.label : '';
	}

	function onChange() {
		var selection = parseSelection(els.select.value);
		state.reason = selection.reason;
		state.subIssue = selection.subIssue;

		syncHiddenFields();
		showError(false);
		els.submit.disabled = !state.reason;
	}

	/* ------------------------------------------------------------ validation */

	function getPayload() {
		return {
			reasonId: state.reason ? state.reason.id : null,
			reasonLabel: state.reason ? state.reason.label : null,
			subIssueId: state.subIssue ? state.subIssue.id : null,
			subIssueLabel: state.subIssue ? state.subIssue.label : null
		};
	}

	function validate() {
		var hasSubOptions = !!state.reason && state.reason.subOptions.length > 0;
		var missingSubIssue = hasSubOptions && !state.subIssue;
		// Geräte-Support is never selectable on its own, so a blank sub-issue
		// would leave the record unattributable.
		var blankHiddenBranch = !!state.reason && state.reason.id === HIDDEN_REASON_ID && !state.subIssue;

		if (!state.reason || missingSubIssue || blankHiddenBranch) {
			showError(true);
			els.select.focus();
			return false;
		}

		syncHiddenFields();
		return true;
	}

	/* ------------------------------------------------------------------ init */

	function init() {
		els = {
			select: byId('cs-reasonSelect'),
			error: byId('Dropdown_error'),
			zohoReason: byId('Dropdown'),
			zohoSubIssue: byId('Dropdown1'),
			reasonId: byId('reasonId'),
			reasonLabel: byId('reasonLabel'),
			subIssueId: byId('subIssueId'),
			subIssueLabel: byId('subIssueLabel'),
			submit: byId('cs-submit')
		};

		if (!els.select) { return; }

		renderDropdown();
		els.select.addEventListener('change', onChange);
		// Browsers restore a select's state on reload/back without firing
		// change, which would leave the posted fields out of sync with the
		// visible choice.
		window.addEventListener('pageshow', onChange);
		onChange();
	}

	window.CrownSwitchContactReason = {
		reasons: CONTACT_REASONS,
		getPayload: getPayload,
		validate: validate
	};

	// Runs Zoho's own field validation first, then the reason rules.
	window.cs_ValidateAndSubmit = function () {
		return zf_ValidateAndSubmit() && validate();
	};

	if (document.readyState === 'loading') {
		document.addEventListener('DOMContentLoaded', init);
	} else {
		init();
	}
})();
