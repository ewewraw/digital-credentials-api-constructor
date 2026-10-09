// Tests whether navigator.credentials.create() consumes the user activation
// that the click on Run Request provides. Call testUserActivationAfterCreate()
// right after create(), in the same task as the click, before awaiting the
// promise. By default, browsers block windows that window.open() tries to open
// without a user activation, so the new window opens only if create() didn't
// consume the activation.

export type UserActivationTestResult =
  // The browser blocked the window, so create() consumed the activation.
  | 'consumed'
  // The window opened, so create() didn't consume the activation.
  | 'not-consumed'
  // The window opened even though navigator.userActivation shows that create()
  // consumed the activation, because pop-ups are allowed for this site.
  | 'popups-allowed';

// A small window, so that it doesn't cover the browser's wallet UI.
const WINDOW_FEATURES = 'popup,width=480,height=360';

// Shown in the window. Text in backticks is shown as code.
const WINDOW_MESSAGES: Record<
  Exclude<UserActivationTestResult, 'consumed'>,
  { heading: string; text: string }
> = {
  'not-consumed': {
    heading: 'User activation is not consumed!',
    text: 'The issuance constructor called `window.open()` right after `navigator.credentials.create()`. The browser opened this window, so `create()` didn\'t consume the user activation.',
  },
  'popups-allowed': {
    heading: 'Pop-ups are allowed for this site',
    text: 'This window opened without a user activation, because pop-ups are allowed for this site. `navigator.userActivation.isActive` shows that `create()` consumed the user activation.',
  },
};

/** The toast that reports each result. */
export const USER_ACTIVATION_TEST_TOASTS: Record<
  UserActivationTestResult,
  { title: string; description: string }
> = {
  consumed: {
    title: 'User activation consumed',
    description: 'The browser blocked window.open() right after create(), so create() consumed the user activation. Check your wallet to accept the credential.',
  },
  'not-consumed': {
    title: 'User activation not consumed',
    description: 'window.open() opened a window right after create(), so create() didn\'t consume the user activation. Check your wallet to accept the credential.',
  },
  'popups-allowed': {
    title: 'User activation consumed',
    description: 'navigator.userActivation.isActive shows that create() consumed the user activation. The window opened anyway, because pop-ups are allowed for this site. Check your wallet to accept the credential.',
  },
};

/**
 * Calls window.open() and returns what that shows about the user activation.
 * Call it right after navigator.credentials.create(), without awaiting first.
 */
export function testUserActivationAfterCreate(): UserActivationTestResult {
  // Read the activation before window.open(), which consumes it if it opens a
  // window. Some browsers don't support navigator.userActivation.
  const isActive = navigator.userActivation?.isActive;
  // Without noopener, so that window.open() returns null only if the browser
  // blocked the window, and so that this page can write the window's content.
  const popup = window.open('', '_blank', WINDOW_FEATURES);
  if (!popup) {
    return 'consumed';
  }
  const result = isActive === false ? 'popups-allowed' : 'not-consumed';
  try {
    showMessage(popup, WINDOW_MESSAGES[result]);
  } catch (error) {
    // The result doesn't depend on the message, so report it anyway.
    console.error('Could not write the message into the new window.', error);
  }
  return result;
}

// Writes the message into the new window's empty document with DOM methods,
// so no string is parsed as HTML.
function showMessage(popup: Window, { heading, text }: { heading: string; text: string }) {
  const doc = popup.document;
  doc.documentElement.lang = 'en';
  doc.title = heading;
  const colorScheme = doc.createElement('meta');
  colorScheme.name = 'color-scheme';
  colorScheme.content = 'light dark';
  doc.head.append(colorScheme);

  const main = doc.createElement('main');
  main.style.cssText = 'max-width: 32rem; margin: 2rem auto; padding: 0 1rem; font: 16px/1.5 system-ui, sans-serif;';
  const h1 = doc.createElement('h1');
  h1.style.fontSize = '1.5rem';
  h1.textContent = heading;
  const paragraph = doc.createElement('p');
  // Odd segments are the text between backticks.
  text.split('`').forEach((segment, index) => {
    if (index % 2 === 1) {
      const code = doc.createElement('code');
      code.textContent = segment;
      paragraph.append(code);
    } else {
      paragraph.append(segment);
    }
  });
  main.append(h1, paragraph);
  doc.body.replaceChildren(main);
}
