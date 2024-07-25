chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "fetchPageData") {
        console.log("页面数据:", message.data);
        console.log("Client ID:", message.clientId);
        console.log("Client Secret:", message.clientSecret);
        processContent(message.data, message.clientId, message.clientSecret)
            .then(response => {
                sendResponse({ result: response });
                // 发送消息给内容脚本更新DOM
                if (sender.tab) {
                    chrome.tabs.sendMessage(sender.tab.id, { 
                        action: "updateSummary", 
                        data: response,
                        clientId: message.clientId,
                        clientSecret: message.clientSecret
                    });
                } else {
                    console.error("sender.tab未定义，无法发送消息给内容脚本更新DOM");
                }
            })
            .catch(error => {
                console.error('错误:', error);
                sendResponse({ error: error.message });
                chrome.tabs.sendMessage(sender.tab.id, { 
                    action: "updateSummary",
                    data: "分析失败: " + error.message,
                    clientId: message.clientId,
                    clientSecret: message.clientSecret
                });
            });
        return true;  // 表示希望异步发送响应
    }
});

async function processContent(content, clientId, clientSecret) {
    const getAction = "1：提取html有用的信息，只返回html中出现的内容，不包含标签，去除无关的信息。 2：请根据第一步上面内容进行总结，请分段总结,言简意赅 3、只显示总结内容 ";
    try {
        let result = await agent(content, getAction, clientId, clientSecret);
        console.log("总结:", result); 
        return result;
    } catch (error) {
        console.error('处理错误:', error);
        throw error;
    }
}

async function agent(content, action, clientId, clientSecret) {
    const url = `https://aip.baidubce.com/rpc/2.0/ai_custom/v1/wenxinworkshop/chat/ernie-speed-128k?access_token=${await getAccessToken(clientId, clientSecret)}`;
    const payload = {
        messages: [
            {
                role: "user",
                content: `${content}/n${action}`
            },
        ]
    };
    const headers = {
        'Content-Type': 'application/json'
    };

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(payload)
        });
        const data = await response.json();
        return getResult(data);
    } catch (error) {
        console.error('请求错误:', error);
        throw error;
    }
}

async function getAccessToken(clientId, clientSecret) {
    const url = "https://aip.baidubce.com/oauth/2.0/token";
    const params = new URLSearchParams({
        grant_type: "client_credentials",
        client_id: clientId,
        client_secret: clientSecret
    });

    try {
        const response = await fetch(`${url}?${params.toString()}`, {
            method: 'POST'
        });
        const data = await response.json();
        return data.access_token;
    } catch (error) {
        console.error('获取访问令牌错误:', error);
        throw error;
    }
}

function getResult(responseJson) {
    if ('result' in responseJson) {
        return responseJson['result'];
    } else {
        return "无需处理，Result 键不存在于响应中";
    }
}
