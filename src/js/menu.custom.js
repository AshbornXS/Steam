let targetWindow = window.opener;

function waitForElement(selector, callback, intervalTime = 69, timeout = 4444, waitForOpener = 0) {
  const searchContext = waitForOpener === 1 ? 'Parent Window' : 'Current Context';

  const elementCheck = () => {
    let element;
    if (waitForOpener === 1) {
      if (!window.opener) {
        return;
      }
      element = window.opener.document.querySelector(selector);
    } else {
      element = document.querySelector(selector);
    }

    if (element) {
      clearInterval(interval);
      observer.disconnect();
      clearTimeout(failureTimeout);
      callback(element);
    }
  };

  const observer = new MutationObserver(elementCheck);

  let interval = setInterval(elementCheck, intervalTime);

  let failureTimeout = setTimeout(function () {
    clearInterval(interval);
    observer.disconnect();
  }, timeout);

  if (waitForOpener === 1 && window.opener) {
    observer.observe(window.opener.document, { childList: true, subtree: true });
  } else {
    observer.observe(document, { childList: true, subtree: true });
  }
};

function addMenuItem(elementText, nextToElement, insertionPosition, onClickAction, additionalClasses = []) {
  const newElement = document.createElement('div');
  // applies default classes to the new menu element:
  newElement.classList.add('_2jXHP0742MyApMUVUM8IFn', '_2uiDecKkKjAq7nimy3uLhG', '_1n7Wloe5jZ6fSuvV18NNWI', 'contextMenuItem');

  // applies additional classes if provided
  if (Array.isArray(additionalClasses)) {
    additionalClasses.forEach(cls => newElement.classList.add(cls));
  }

  newElement.textContent = elementText;

  newElement.onclick = function () {
    if (targetWindow && typeof targetWindow.eval === 'function') {
      targetWindow.eval(onClickAction);
    }
  };

  const referenceElement = document.querySelector(nextToElement);
  if (referenceElement) {
    if (insertionPosition === 'before') {
      referenceElement.parentNode.insertBefore(newElement, referenceElement);
    } else if (insertionPosition === 'after') {
      referenceElement.parentNode.insertBefore(newElement, referenceElement.nextSibling);
    }
  }

  return newElement;
}

export default async function modifySteamRootMenu() {
  try {
    waitForElement('._2EstNjFIIZm_WUSKm5Wt7n._3pofGqV0buiKAfMPEs3_82', function (menuContainer) {
      console.log('Menu container found:', menuContainer);

      const items = menuContainer.querySelectorAll('._2jXHP0742MyApMUVUM8IFn._21GPYlKBCLsHQpTsHw_RL_');
      const lastItem = items[items.length - 1];

      if (lastItem) {
        // Insert separator after the last menu item.
        addMenuItem("", '._2EstNjFIIZm_WUSKm5Wt7n._3pofGqV0buiKAfMPEs3_82 > ._2jXHP0742MyApMUVUM8IFn._21GPYlKBCLsHQpTsHw_RL_:last-of-type', 'after', "", ['_2jXHP0742MyApMUVUM8IFn', '_21GPYlKBCLsHQpTsHw_RL_']);

        // Insert "Restart Steam" menu item after "Reload Steam".
        addMenuItem("Reiniciar", '._2EstNjFIIZm_WUSKm5Wt7n._3pofGqV0buiKAfMPEs3_82 > ._2jXHP0742MyApMUVUM8IFn._21GPYlKBCLsHQpTsHw_RL_:last-of-type', 'after', "SteamClient.User.StartRestart(false)");

        // Insert "Reload Steam" menu item after separator.
        addMenuItem("Recarregar", '._2EstNjFIIZm_WUSKm5Wt7n._3pofGqV0buiKAfMPEs3_82 > ._2jXHP0742MyApMUVUM8IFn._21GPYlKBCLsHQpTsHw_RL_:last-of-type', 'after', "location.reload()");
      } else {
        console.warn('Could not find the last menu item to insert after.');
      }
    });

  } catch (error) {
    console.error('Error modifying Steam root menu:', error.message);
  }
}



if (document.title == "Steam Root Menu") {
  waitForElement('#popup_target', function (element) {
    waitForElement('._2jXHP0742MyApMUVUM8IFn._21GPYlKBCLsHQpTsHw_RL_', modifySteamRootMenu);
  });
}
