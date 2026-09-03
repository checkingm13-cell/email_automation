/**
 * Canonical Gmail Native Mail Merge Selectors & Locator Configuration
 * Grounded in verified Playwright runs against Gmail Workspace UI
 */

module.exports = {
    // Navigation & Readiness
    inboxUrl: 'https://mail.google.com/mail/u/0/#inbox',
    composeButton: 'button:has-text("Compose"), div[gh="cm"]',
    composeDialog: 'div[role="dialog"]',

    // Mail Merge Menu & Toggle
    mailMergeIcon: 'span.Sz.brj, [aria-label*="mail merge" i], [data-tooltip*="mail merge" i]',
    menuPopup: 'div[role="menu"]',
    mailMergeCheckbox: 'div[role="menu"] [role="checkbox"][aria-label*="mail merge" i]',
    addFromSpreadsheetItem: 'div[role="menu"] [role="menuitem"]:has-text("Add from a spreadsheet")',

    // Google Drive Picker Frame
    driveSearchInput: 'input[aria-label*="Search"], input[placeholder*="Search"], input[type="text"]',
    driveFileRow: 'div[role="row"], div[role="option"], div[role="gridcell"]',
    driveInsertButton: 'button:has-text("Insert"), button:has-text("Select"), div[role="button"]:has-text("Insert")',

    // "Finish linking spreadsheet" Column Mapping Modal
    finishLinkingHeading: 'text="Finish linking spreadsheet"',
    columnDropdownWrapper: 'div.rHGeGc-aPP78e',
    columnOption: (colName) => `li[role="option"][data-value="${colName.toLowerCase()}"], li[role="option"]:has-text("@${colName.toLowerCase()}")`,
    finishLinkingButton: 'button:has-text("Finish"), div[role="button"]:has-text("Finish")',

    // Compose Editor Fields
    subjectInput: 'input[name="subjectbox"], input[aria-label="Subject"]',
    bodyEditor: 'div[aria-label="Message Body"], div[role="textbox"][aria-label*="Body"]',

    // Send & Confirmation Modals
    continueButton: 'button:has-text("Continue"), div[role="button"]:has-text("Continue")',
    missingUnsubscribePrompt: {
        addLinkButton: 'button:has-text("Add link"), div[role="button"]:has-text("Add link")',
        ignoreButton: 'button:has-text("Ignore"), div[role="button"]:has-text("Ignore")'
    },
    readyToSendModal: {
        heading: 'text="Ready to send"',
        sendAllButton: 'button:has-text("Send all"), div[role="button"]:has-text("Send all")'
    }
};
