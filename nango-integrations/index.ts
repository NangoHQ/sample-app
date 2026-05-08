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

// -- Integration: google-calendar
import './google-calendar/syncs/events.js';
import './google-calendar/syncs/calendar-events.js';
import './google-calendar/actions/create-event.js';
import './google-calendar/syncs/watch-renewal.js';
import './google-calendar/on-events/post-connection-creation.js';
import './google-calendar/on-events/pre-connection-deletion.js';