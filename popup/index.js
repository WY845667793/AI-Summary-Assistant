chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "updateSummary") {
        document.getElementById('summaryText').value = message.data;
        console.log("Client ID:", message.clientId);
        console.log("Client Secret:", message.clientSecret);
    }
});

document.addEventListener('DOMContentLoaded', () => {
    const plugin_search_but = document.getElementById('plugin_search_but');
    const plugin_search_inp = document.getElementById('plugin_search_inp');
  
    plugin_search_but.onclick = function () {
      document.getElementById('summaryText').value = "正在分析...";
      
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const tab = tabs[0];
        const url = tab.url;
        const clientId = getCookie('client_id');
        const clientSecret = getCookie('client_secret');
   
        // 检查 URL 是否是受限制的
        if (url.startsWith('chrome://') || url.startsWith('about:') || url.startsWith('chrome-extension://')) {
          alert('Cannot run script on this page.');
          return;
        }
        console.log("没问题");
        // 向内容脚本发送消息，要求获取网页数据
        chrome.scripting.executeScript({
          target: { tabId: tab.id },
          func: fetchPageData,
          args: [clientId, clientSecret]
        });
      });
    };
  
    function fetchPageData(clientId, clientSecret) {
      // 获取网页的全部HTML
      const pageData = document.documentElement.outerHTML;
      // 向后台脚本发送消息
      chrome.runtime.sendMessage({
        action: "fetchPageData", 
        data: pageData,
        clientId: clientId,
        clientSecret: clientSecret
      }, response => {
        if (!response) {
            console.error('无法获取响应');
            return;
        }
        if (response.error) {
            console.error('处理错误:', response.error);
            document.getElementById('summaryText').value = "分析失败: " + response.error;
        } else {
            // 发送消息给内容脚本更新DOM
            chrome.runtime.sendMessage({ 
                action: "updateSummary",
                data: response.result,
                clientId: clientId,
                clientSecret: clientSecret
            });
        }
      });
    }
  });

  document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('summaryTabButton').addEventListener('click', (event) => openTab(event, 'summaryTab'));
    document.getElementById('configTabButton').addEventListener('click', (event) => openTab(event, 'configTab'));
    document.getElementById("summaryTabButton").click();
  });
  
  function openTab(evt, tabName) {
    var i, tabcontent, tablinks;
  
    tabcontent = document.getElementsByClassName("tabcontent");
    for (i = 0; i < tabcontent.length; i++) {
      tabcontent[i].style.display = "none";
    }
  
    tablinks = document.getElementsByClassName("tablinks");
    for (i = 0; i < tablinks.length; i++) {
      tablinks[i].className = tablinks[i].className.replace(" active", "");
    }
  
    document.getElementById(tabName).style.display = "block";
    evt.currentTarget.className += " active";
  }
  

  document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('plugin_save').addEventListener('click', () => {
        const clientId = document.getElementById('client_id').value;
        const clientSecret = document.getElementById('client_secret').value;

        setCookie('client_id', clientId, 365);
        setCookie('client_secret', clientSecret, 365);
        console.log(clientId);
        console.log(clientSecret);
        alert('保存成功！');
    });

    loadCredentials();
});

function setCookie(name, value, days) {
    const date = new Date();
    date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
    const expires = "; expires=" + date.toUTCString();
    document.cookie = name + "=" + (value || "") + expires + "; path=/";
}

function getCookie(name) {
    const nameEQ = name + "=";
    const ca = document.cookie.split(';');
    for(let i = 0; i < ca.length; i++) {
        let c = ca[i];
        while (c.charAt(0) === ' ') c = c.substring(1, c.length);
        if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
    }
    return null;
}

function loadCredentials() {
    const clientId = getCookie('client_id');
    const clientSecret = getCookie('client_secret');

    if (clientId) {
        document.getElementById('client_id').value = clientId;
    }
    if (clientSecret) {
        document.getElementById('client_secret').value = clientSecret;
    }
}
