// -- Integration: slack
import './slack/syncs/users.js';
import './slack/actions/send-message.js';

// -- Integration: google-drive
import './google-drive/syncs/documents.js';
import './google-drive/actions/fetch-document.js';

// -- Integration: one-drive
import './one-drive/syncs/user-files-selection.js';
import './one-drive/actions/fetch-file.js';

// -- Integration: one-drive-personal
import './one-drive-personal/syncs/user-files-selection.js';