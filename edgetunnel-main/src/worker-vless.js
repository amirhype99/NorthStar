// <!--GAMFC-->version base on commit 58686d5d125194d34a1137913b3a64ddcf55872f, time is 2024-11-27 09:26:01 UTC<!--GAMFC-END-->.
// @ts-ignore
import { connect } from 'cloudflare:sockets';

// How to generate your own UUID:
// [Windows] Press "Win + R", input cmd and run:  Powershell -NoExit -Command "[guid]::NewGuid()"
let userID = 'd342d11e-d424-4583-b36e-524ab1f0afa4';

let proxyIP = '';


if (!isValidUUID(userID)) {
	throw new Error('uuid is not valid');
}

export default {
	/**
	 * @param {import("@cloudflare/workers-types").Request} request
	 * @param {{UUID: string, PROXYIP: string}} env
	 * @param {import("@cloudflare/workers-types").ExecutionContext} ctx
	 * @returns {Promise<Response>}
	 */
	async fetch(request, env, ctx) {
		try {
			userID = env.UUID || userID;
			proxyIP = env.PROXYIP || proxyIP;
			const url = new URL(request.url);
			const upgradeHeader = request.headers.get('Upgrade');
			if (upgradeHeader && upgradeHeader.toLowerCase() === 'websocket') return await vlessOverWSHandler(request);
			if (url.pathname === '/' || url.pathname === '/admin') return new Response(ADMIN_HTML, { headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' } });
			if (url.pathname.startsWith('/api/')) return await handleAdminAPI(request, env);
			if (url.pathname === `/${userID}`) return new Response(getVLESSConfig(userID, request.headers.get('Host')), { headers: { 'Content-Type': 'text/plain;charset=utf-8', 'Cache-Control': 'no-store' } });
			return new Response('Not found', { status: 404 });
		} catch (err) {
			const e = /** @type {Error} */ (err);
			return new Response(e.toString(), { status: 500 });
		}
	},
};




/**
 * 
 * @param {import("@cloudflare/workers-types").Request} request
 */

// KV authentication keys: auth:username and auth:password.
// Password format: pbkdf2$iterations$salt-base64url$hash-base64url.
const SESSION_TTL = 86400;
const ADMIN_HTML = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="dark"><title>EdgeTunnel Admin</title><style>
:root{color-scheme:dark;--bg:#090e1a;--panel:#111a2b;--line:#26344b;--text:#edf3ff;--muted:#9aa9c1;--accent:#68a6ff;--danger:#ff7777}*{box-sizing:border-box}body{margin:0;min-height:100vh;background:radial-gradient(ellipse at top,#182947 0,#090e1a 58%);color:var(--text);font:15px/1.6 system-ui,sans-serif;display:grid;place-items:center;padding:24px}main{width:min(100%,520px)}.top{display:flex;align-items:center;justify-content:space-between;margin-bottom:22px}.brand{font-size:20px;font-weight:750}.brand span{color:var(--accent)}button{cursor:pointer}.lang,.secondary{background:#17243a;color:var(--text);border:1px solid var(--line);border-radius:10px;padding:10px 13px}.card{background:rgba(17,26,43,.95);border:1px solid var(--line);border-radius:20px;padding:28px;box-shadow:0 24px 80px #0007}.eyebrow{color:var(--accent);font-size:12px;font-weight:700;letter-spacing:1.3px}h1{font-size:25px;margin:7px 0 4px}p{color:var(--muted);margin:0 0 22px}label{display:block;font-size:13px;color:#c6d2e5;margin:14px 0 7px}input{width:100%;background:#0b1322;border:1px solid var(--line);border-radius:11px;padding:13px;color:var(--text);font:inherit;outline:none}input:focus{border-color:var(--accent)}.primary{width:100%;margin-top:20px;background:var(--accent);border:0;border-radius:11px;padding:13px;color:#071326;font:inherit;font-weight:750}.notice{min-height:24px;color:var(--danger);font-size:13px;margin-top:12px}.hidden{display:none!important}.stat{border:1px solid var(--line);background:#0b1322;border-radius:13px;padding:15px;margin:14px 0}.stat small{color:var(--muted);display:block}.mono{font:12px/1.6 ui-monospace,monospace;overflow-wrap:anywhere;color:#cfe0ff}.actions{display:flex;gap:10px}.actions button{flex:1}.footer{color:#71819b;font-size:12px;text-align:center;margin-top:18px}[dir=rtl] body{text-align:right}[dir=rtl] input{direction:rtl}</style></head><body><main>
<div class="top"><div class="brand">Edge<span>Tunnel</span></div><button class="lang" id="lang">فارسی</button></div>
<section class="card" id="login"><div class="eyebrow" data-t="secure">SECURE ACCESS</div><h1 data-t="welcome">Welcome back</h1><p data-t="desc">Sign in to your EdgeTunnel dashboard.</p><form id="form"><label for="username" data-t="user">Username</label><input id="username" autocomplete="username" required maxlength="64"><label for="password" data-t="pass">Password</label><input id="password" type="password" autocomplete="current-password" required><button class="primary" id="submit" data-t="signin">Sign in</button></form><div class="notice" id="error" role="alert"></div></section>
<section class="card hidden" id="dash"><div class="eyebrow" data-t="overview">OVERVIEW</div><h1 data-t="dashboard">Dashboard</h1><p data-t="signed">You are securely signed in.</p><div class="stat"><small data-t="host">Worker host</small><div class="mono" id="hostname"></div></div><div class="stat"><small data-t="endpoint">VLESS configuration endpoint</small><div class="mono" id="endpoint"></div></div><div class="actions"><button class="secondary" id="copy" data-t="copy">Copy endpoint</button><button class="secondary" id="logout" data-t="logout">Sign out</button></div><div class="notice" id="notice" role="status"></div></section><div class="footer">EdgeTunnel · Cloudflare Workers</div></main>
<script>
const T={en:{secure:'SECURE ACCESS',welcome:'Welcome back',desc:'Sign in to your EdgeTunnel dashboard.',user:'Username',pass:'Password',signin:'Sign in',overview:'OVERVIEW',dashboard:'Dashboard',signed:'You are securely signed in.',host:'Worker host',endpoint:'VLESS configuration endpoint',copy:'Copy endpoint',logout:'Sign out',bad:'Invalid username or password.',copied:'Endpoint copied.',copyfail:'Could not copy endpoint.'},fa:{secure:'ورود امن',welcome:'خوش آمدید',desc:'برای ورود به پنل مدیریت EdgeTunnel وارد شوید.',user:'نام کاربری',pass:'گذرواژه',signin:'ورود',overview:'نمای کلی',dashboard:'داشبورد',signed:'با موفقیت و به‌صورت امن وارد شده‌اید.',host:'میزبان ورکر',endpoint:'آدرس دریافت تنظیمات VLESS',copy:'کپی آدرس',logout:'خروج',bad:'نام کاربری یا گذرواژه اشتباه است.',copied:'آدرس کپی شد.',copyfail:'کپی آدرس انجام نشد.'}};
let lang=localStorage.getItem('et-lang')||'en',endpoint='';const tr=k=>T[lang][k]||k;
function paint(){document.documentElement.lang=lang;document.documentElement.dir=lang==='fa'?'rtl':'ltr';document.querySelectorAll('[data-t]').forEach(x=>x.textContent=tr(x.dataset.t));document.getElementById('lang').textContent=lang==='en'?'فارسی':'English'}
function show(ok){document.getElementById('login').classList.toggle('hidden',ok);document.getElementById('dash').classList.toggle('hidden',!ok)}
async function refresh(){try{let r=await fetch('/api/session');if(!r.ok){show(false);return}let d=await r.json();endpoint=d.endpoint;document.getElementById('hostname').textContent=location.host;document.getElementById('endpoint').textContent=location.origin+endpoint;show(true)}catch{show(false)}}
document.getElementById('lang').onclick=()=>{lang=lang==='en'?'fa':'en';localStorage.setItem('et-lang',lang);paint()};
document.getElementById('form').onsubmit=async e=>{e.preventDefault();let b=document.getElementById('submit');b.disabled=true;try{let r=await fetch('/api/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username:document.getElementById('username').value,password:document.getElementById('password').value})});if(!r.ok)throw Error();await refresh()}catch{document.getElementById('error').textContent=tr('bad')}finally{b.disabled=false}};
document.getElementById('logout').onclick=async()=>{await fetch('/api/logout',{method:'POST'});show(false)};
document.getElementById('copy').onclick=async()=>{try{await navigator.clipboard.writeText(location.origin+endpoint);document.getElementById('notice').textContent=tr('copied')}catch{document.getElementById('notice').textContent=tr('copyfail')}};
paint();refresh();
</script></body></html>`;

function apiJSON(data, status = 200, headers = {}) {
	return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...headers } });
}
function getCookie(request, name) {
	for (const item of (request.headers.get('Cookie') || '').split(';')) {
		const [key, ...rest] = item.trim().split('=');
		if (key === name) return rest.join('=');
	}
	return '';
}
function toB64Url(bytes) {
	let raw = ''; for (const b of bytes) raw += String.fromCharCode(b);
	return btoa(raw).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}
function fromB64Url(value) {
	const raw = atob(value.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - value.length % 4) % 4));
	return Uint8Array.from(raw, c => c.charCodeAt(0));
}
async function checkPassword(password, encoded) {
	const p = encoded.split('$');
	if (p.length !== 4 || p[0] !== 'pbkdf2') return false;
	const rounds = Number(p[1]);
	if (!Number.isInteger(rounds) || rounds < 100000 || rounds > 1000000) return false;
	try {
		const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
		const actual = new Uint8Array(await crypto.subtle.deriveBits({ name: 'PBKDF2', salt: fromB64Url(p[2]), iterations: rounds, hash: 'SHA-256' }, key, 256));
		const expected = fromB64Url(p[3]); if (actual.length !== expected.length) return false;
		let diff = 0; for (let i = 0; i < actual.length; i++) diff |= actual[i] ^ expected[i];
		return diff === 0;
	} catch { return false; }
}
async function handleAdminAPI(request, env) {
	if (!env.ADMIN_KV) return apiJSON({ error: 'ADMIN_KV binding is not configured' }, 503);
	const path = new URL(request.url).pathname;
	if (path === '/api/login' && request.method === 'POST') {
		let body; try { body = await request.json(); } catch { return apiJSON({ error: 'Invalid request' }, 400); }
		const username = String(body.username || ''), password = String(body.password || '');
		if (username.length > 64 || password.length > 1024) return apiJSON({ error: 'Invalid credentials' }, 400);
		const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
		const attemptsKey = 'login-attempts:' + ip;
		const attempts = Number(await env.ADMIN_KV.get(attemptsKey) || '0');
		if (attempts >= 10) return apiJSON({ error: 'Too many attempts. Try again in 15 minutes.' }, 429);
		const [savedUser, savedHash] = await Promise.all([env.ADMIN_KV.get('auth:username'), env.ADMIN_KV.get('auth:password')]);
		if (!savedUser || !savedHash || username !== savedUser || !(await checkPassword(password, savedHash))) {
			await env.ADMIN_KV.put(attemptsKey, String(attempts + 1), { expirationTtl: 900 });
			return apiJSON({ error: 'Invalid username or password' }, 401);
		}
		await env.ADMIN_KV.delete(attemptsKey);
		const token = toB64Url(crypto.getRandomValues(new Uint8Array(32)));
		await env.ADMIN_KV.put('session:' + token, JSON.stringify({ username: savedUser }), { expirationTtl: SESSION_TTL });
		return apiJSON({ ok: true }, 200, { 'Set-Cookie': `et_session=${token}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${SESSION_TTL}` });
	}
	if (path === '/api/logout' && request.method === 'POST') {
		const token = getCookie(request, 'et_session'); if (token) await env.ADMIN_KV.delete('session:' + token);
		return apiJSON({ ok: true }, 200, { 'Set-Cookie': 'et_session=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0' });
	}
	if (path === '/api/session' && request.method === 'GET') {
		const token = getCookie(request, 'et_session');
		if (!/^[A-Za-z0-9_-]{40,60}$/.test(token)) return apiJSON({ authenticated: false }, 401);
		const session = await env.ADMIN_KV.get('session:' + token, 'json');
		if (!session) return apiJSON({ authenticated: false }, 401);
		return apiJSON({ authenticated: true, username: session.username, endpoint: `/${env.UUID || userID}` });
	}
	return apiJSON({ error: 'Not found' }, 404);
}

async function vlessOverWSHandler(request) {

	/** @type {import("@cloudflare/workers-types").WebSocket[]} */
	// @ts-ignore
	const webSocketPair = new WebSocketPair();
	const [client, webSocket] = Object.values(webSocketPair);

	webSocket.accept();

	let address = '';
	let portWithRandomLog = '';
	const log = (/** @type {string} */ info, /** @type {string | undefined} */ event) => {
		console.log(`[${address}:${portWithRandomLog}] ${info}`, event || '');
	};
	const earlyDataHeader = request.headers.get('sec-websocket-protocol') || '';

	const readableWebSocketStream = makeReadableWebSocketStream(webSocket, earlyDataHeader, log);

	/** @type {{ value: import("@cloudflare/workers-types").Socket | null}}*/
	let remoteSocketWapper = {
		value: null,
	};
	let udpStreamWrite = null;
	let isDns = false;

	// ws --> remote
	readableWebSocketStream.pipeTo(new WritableStream({
		async write(chunk, controller) {
			if (isDns && udpStreamWrite) {
				return udpStreamWrite(chunk);
			}
			if (remoteSocketWapper.value) {
				const writer = remoteSocketWapper.value.writable.getWriter()
				await writer.write(chunk);
				writer.releaseLock();
				return;
			}

			const {
				hasError,
				message,
				portRemote = 443,
				addressRemote = '',
				rawDataIndex,
				vlessVersion = new Uint8Array([0, 0]),
				isUDP,
			} = processVlessHeader(chunk, userID);
			address = addressRemote;
			portWithRandomLog = `${portRemote}--${Math.random()} ${isUDP ? 'udp ' : 'tcp '
				} `;
			if (hasError) {
				// controller.error(message);
				throw new Error(message); // cf seems has bug, controller.error will not end stream
				// webSocket.close(1000, message);
				return;
			}
			// if UDP but port not DNS port, close it
			if (isUDP) {
				if (portRemote === 53) {
					isDns = true;
				} else {
					// controller.error('UDP proxy only enable for DNS which is port 53');
					throw new Error('UDP proxy only enable for DNS which is port 53'); // cf seems has bug, controller.error will not end stream
					return;
				}
			}
			// ["version", "附加信息长度 N"]
			const vlessResponseHeader = new Uint8Array([vlessVersion[0], 0]);
			const rawClientData = chunk.slice(rawDataIndex);

			// TODO: support udp here when cf runtime has udp support
			if (isDns) {
				const { write } = await handleUDPOutBound(webSocket, vlessResponseHeader, log);
				udpStreamWrite = write;
				udpStreamWrite(rawClientData);
				return;
			}
			handleTCPOutBound(remoteSocketWapper, addressRemote, portRemote, rawClientData, webSocket, vlessResponseHeader, log);
		},
		close() {
			log(`readableWebSocketStream is close`);
		},
		abort(reason) {
			log(`readableWebSocketStream is abort`, JSON.stringify(reason));
		},
	})).catch((err) => {
		log('readableWebSocketStream pipeTo error', err);
	});

	return new Response(null, {
		status: 101,
		// @ts-ignore
		webSocket: client,
	});
}

/**
 * Handles outbound TCP connections.
 *
 * @param {any} remoteSocket 
 * @param {string} addressRemote The remote address to connect to.
 * @param {number} portRemote The remote port to connect to.
 * @param {Uint8Array} rawClientData The raw client data to write.
 * @param {import("@cloudflare/workers-types").WebSocket} webSocket The WebSocket to pass the remote socket to.
 * @param {Uint8Array} vlessResponseHeader The VLESS response header.
 * @param {function} log The logging function.
 * @returns {Promise<void>} The remote socket.
 */
async function handleTCPOutBound(remoteSocket, addressRemote, portRemote, rawClientData, webSocket, vlessResponseHeader, log,) {
	async function connectAndWrite(address, port) {
		/** @type {import("@cloudflare/workers-types").Socket} */
		const tcpSocket = connect({
			hostname: address,
			port: port,
		});
		remoteSocket.value = tcpSocket;
		log(`connected to ${address}:${port}`);
		const writer = tcpSocket.writable.getWriter();
		await writer.write(rawClientData); // first write, nomal is tls client hello
		writer.releaseLock();
		return tcpSocket;
	}

	// if the cf connect tcp socket have no incoming data, we retry to redirect ip
	async function retry() {
		const tcpSocket = await connectAndWrite(proxyIP || addressRemote, portRemote)
		// no matter retry success or not, close websocket
		tcpSocket.closed.catch(error => {
			console.log('retry tcpSocket closed error', error);
		}).finally(() => {
			safeCloseWebSocket(webSocket);
		})
		remoteSocketToWS(tcpSocket, webSocket, vlessResponseHeader, null, log);
	}

	const tcpSocket = await connectAndWrite(addressRemote, portRemote);

	// when remoteSocket is ready, pass to websocket
	// remote--> ws
	remoteSocketToWS(tcpSocket, webSocket, vlessResponseHeader, retry, log);
}

/**
 * 
 * @param {import("@cloudflare/workers-types").WebSocket} webSocketServer
 * @param {string} earlyDataHeader for ws 0rtt
 * @param {(info: string)=> void} log for ws 0rtt
 */
function makeReadableWebSocketStream(webSocketServer, earlyDataHeader, log) {
	let readableStreamCancel = false;
	const stream = new ReadableStream({
		start(controller) {
			webSocketServer.addEventListener('message', (event) => {
				if (readableStreamCancel) {
					return;
				}
				const message = event.data;
				controller.enqueue(message);
			});

			// The event means that the client closed the client -> server stream.
			// However, the server -> client stream is still open until you call close() on the server side.
			// The WebSocket protocol says that a separate close message must be sent in each direction to fully close the socket.
			webSocketServer.addEventListener('close', () => {
				// client send close, need close server
				// if stream is cancel, skip controller.close
				safeCloseWebSocket(webSocketServer);
				if (readableStreamCancel) {
					return;
				}
				controller.close();
			}
			);
			webSocketServer.addEventListener('error', (err) => {
				log('webSocketServer has error');
				controller.error(err);
			}
			);
			// for ws 0rtt
			const { earlyData, error } = base64ToArrayBuffer(earlyDataHeader);
			if (error) {
				controller.error(error);
			} else if (earlyData) {
				controller.enqueue(earlyData);
			}
		},

		pull(controller) {
			// if ws can stop read if stream is full, we can implement backpressure
			// https://streams.spec.whatwg.org/#example-rs-push-backpressure
		},
		cancel(reason) {
			// 1. pipe WritableStream has error, this cancel will called, so ws handle server close into here
			// 2. if readableStream is cancel, all controller.close/enqueue need skip,
			// 3. but from testing controller.error still work even if readableStream is cancel
			if (readableStreamCancel) {
				return;
			}
			log(`ReadableStream was canceled, due to ${reason}`)
			readableStreamCancel = true;
			safeCloseWebSocket(webSocketServer);
		}
	});

	return stream;

}

// https://xtls.github.io/development/protocols/vless.html
// https://github.com/zizifn/excalidraw-backup/blob/main/v2ray-protocol.excalidraw

/**
 * 
 * @param { ArrayBuffer} vlessBuffer 
 * @param {string} userID 
 * @returns 
 */
function processVlessHeader(
	vlessBuffer,
	userID
) {
	if (vlessBuffer.byteLength < 24) {
		return {
			hasError: true,
			message: 'invalid data',
		};
	}
	const version = new Uint8Array(vlessBuffer.slice(0, 1));
	let isValidUser = false;
	let isUDP = false;
	if (stringify(new Uint8Array(vlessBuffer.slice(1, 17))) === userID) {
		isValidUser = true;
	}
	if (!isValidUser) {
		return {
			hasError: true,
			message: 'invalid user',
		};
	}

	const optLength = new Uint8Array(vlessBuffer.slice(17, 18))[0];
	//skip opt for now

	const command = new Uint8Array(
		vlessBuffer.slice(18 + optLength, 18 + optLength + 1)
	)[0];

	// 0x01 TCP
	// 0x02 UDP
	// 0x03 MUX
	if (command === 1) {
	} else if (command === 2) {
		isUDP = true;
	} else {
		return {
			hasError: true,
			message: `command ${command} is not support, command 01-tcp,02-udp,03-mux`,
		};
	}
	const portIndex = 18 + optLength + 1;
	const portBuffer = vlessBuffer.slice(portIndex, portIndex + 2);
	// port is big-Endian in raw data etc 80 == 0x005d
	const portRemote = new DataView(portBuffer).getUint16(0);

	let addressIndex = portIndex + 2;
	const addressBuffer = new Uint8Array(
		vlessBuffer.slice(addressIndex, addressIndex + 1)
	);

	// 1--> ipv4  addressLength =4
	// 2--> domain name addressLength=addressBuffer[1]
	// 3--> ipv6  addressLength =16
	const addressType = addressBuffer[0];
	let addressLength = 0;
	let addressValueIndex = addressIndex + 1;
	let addressValue = '';
	switch (addressType) {
		case 1:
			addressLength = 4;
			addressValue = new Uint8Array(
				vlessBuffer.slice(addressValueIndex, addressValueIndex + addressLength)
			).join('.');
			break;
		case 2:
			addressLength = new Uint8Array(
				vlessBuffer.slice(addressValueIndex, addressValueIndex + 1)
			)[0];
			addressValueIndex += 1;
			addressValue = new TextDecoder().decode(
				vlessBuffer.slice(addressValueIndex, addressValueIndex + addressLength)
			);
			break;
		case 3:
			addressLength = 16;
			const dataView = new DataView(
				vlessBuffer.slice(addressValueIndex, addressValueIndex + addressLength)
			);
			// 2001:0db8:85a3:0000:0000:8a2e:0370:7334
			const ipv6 = [];
			for (let i = 0; i < 8; i++) {
				ipv6.push(dataView.getUint16(i * 2).toString(16));
			}
			addressValue = ipv6.join(':');
			// seems no need add [] for ipv6
			break;
		default:
			return {
				hasError: true,
				message: `invild  addressType is ${addressType}`,
			};
	}
	if (!addressValue) {
		return {
			hasError: true,
			message: `addressValue is empty, addressType is ${addressType}`,
		};
	}

	return {
		hasError: false,
		addressRemote: addressValue,
		addressType,
		portRemote,
		rawDataIndex: addressValueIndex + addressLength,
		vlessVersion: version,
		isUDP,
	};
}


/**
 * 
 * @param {import("@cloudflare/workers-types").Socket} remoteSocket 
 * @param {import("@cloudflare/workers-types").WebSocket} webSocket 
 * @param {ArrayBuffer} vlessResponseHeader 
 * @param {(() => Promise<void>) | null} retry
 * @param {*} log 
 */
async function remoteSocketToWS(remoteSocket, webSocket, vlessResponseHeader, retry, log) {
	// remote--> ws
	let remoteChunkCount = 0;
	let chunks = [];
	/** @type {ArrayBuffer | null} */
	let vlessHeader = vlessResponseHeader;
	let hasIncomingData = false; // check if remoteSocket has incoming data
	await remoteSocket.readable
		.pipeTo(
			new WritableStream({
				start() {
				},
				/**
				 * 
				 * @param {Uint8Array} chunk 
				 * @param {*} controller 
				 */
				async write(chunk, controller) {
					hasIncomingData = true;
					// remoteChunkCount++;
					if (webSocket.readyState !== WS_READY_STATE_OPEN) {
						controller.error(
							'webSocket.readyState is not open, maybe close'
						);
					}
					if (vlessHeader) {
						webSocket.send(await new Blob([vlessHeader, chunk]).arrayBuffer());
						vlessHeader = null;
					} else {
						// seems no need rate limit this, CF seems fix this??..
						// if (remoteChunkCount > 20000) {
						// 	// cf one package is 4096 byte(4kb),  4096 * 20000 = 80M
						// 	await delay(1);
						// }
						webSocket.send(chunk);
					}
				},
				close() {
					log(`remoteConnection!.readable is close with hasIncomingData is ${hasIncomingData}`);
					// safeCloseWebSocket(webSocket); // no need server close websocket frist for some case will casue HTTP ERR_CONTENT_LENGTH_MISMATCH issue, client will send close event anyway.
				},
				abort(reason) {
					console.error(`remoteConnection!.readable abort`, reason);
				},
			})
		)
		.catch((error) => {
			console.error(
				`remoteSocketToWS has exception `,
				error.stack || error
			);
			safeCloseWebSocket(webSocket);
		});

	// seems is cf connect socket have error,
	// 1. Socket.closed will have error
	// 2. Socket.readable will be close without any data coming
	if (hasIncomingData === false && retry) {
		log(`retry`)
		retry();
	}
}

/**
 * 
 * @param {string} base64Str 
 * @returns 
 */
function base64ToArrayBuffer(base64Str) {
	if (!base64Str) {
		return { error: null };
	}
	try {
		// go use modified Base64 for URL rfc4648 which js atob not support
		base64Str = base64Str.replace(/-/g, '+').replace(/_/g, '/');
		const decode = atob(base64Str);
		const arryBuffer = Uint8Array.from(decode, (c) => c.charCodeAt(0));
		return { earlyData: arryBuffer.buffer, error: null };
	} catch (error) {
		return { error };
	}
}

/**
 * This is not real UUID validation
 * @param {string} uuid 
 */
function isValidUUID(uuid) {
	const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[4][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
	return uuidRegex.test(uuid);
}

const WS_READY_STATE_OPEN = 1;
const WS_READY_STATE_CLOSING = 2;
/**
 * Normally, WebSocket will not has exceptions when close.
 * @param {import("@cloudflare/workers-types").WebSocket} socket
 */
function safeCloseWebSocket(socket) {
	try {
		if (socket.readyState === WS_READY_STATE_OPEN || socket.readyState === WS_READY_STATE_CLOSING) {
			socket.close();
		}
	} catch (error) {
		console.error('safeCloseWebSocket error', error);
	}
}

const byteToHex = [];
for (let i = 0; i < 256; ++i) {
	byteToHex.push((i + 256).toString(16).slice(1));
}
function unsafeStringify(arr, offset = 0) {
	return (byteToHex[arr[offset + 0]] + byteToHex[arr[offset + 1]] + byteToHex[arr[offset + 2]] + byteToHex[arr[offset + 3]] + "-" + byteToHex[arr[offset + 4]] + byteToHex[arr[offset + 5]] + "-" + byteToHex[arr[offset + 6]] + byteToHex[arr[offset + 7]] + "-" + byteToHex[arr[offset + 8]] + byteToHex[arr[offset + 9]] + "-" + byteToHex[arr[offset + 10]] + byteToHex[arr[offset + 11]] + byteToHex[arr[offset + 12]] + byteToHex[arr[offset + 13]] + byteToHex[arr[offset + 14]] + byteToHex[arr[offset + 15]]).toLowerCase();
}
function stringify(arr, offset = 0) {
	const uuid = unsafeStringify(arr, offset);
	if (!isValidUUID(uuid)) {
		throw TypeError("Stringified UUID is invalid");
	}
	return uuid;
}


/**
 * 
 * @param {import("@cloudflare/workers-types").WebSocket} webSocket 
 * @param {ArrayBuffer} vlessResponseHeader 
 * @param {(string)=> void} log 
 */
async function handleUDPOutBound(webSocket, vlessResponseHeader, log) {

	let isVlessHeaderSent = false;
	const transformStream = new TransformStream({
		start(controller) {

		},
		transform(chunk, controller) {
			// udp message 2 byte is the the length of udp data
			// TODO: this should have bug, beacsue maybe udp chunk can be in two websocket message
			for (let index = 0; index < chunk.byteLength;) {
				const lengthBuffer = chunk.slice(index, index + 2);
				const udpPakcetLength = new DataView(lengthBuffer).getUint16(0);
				const udpData = new Uint8Array(
					chunk.slice(index + 2, index + 2 + udpPakcetLength)
				);
				index = index + 2 + udpPakcetLength;
				controller.enqueue(udpData);
			}
		},
		flush(controller) {
		}
	});

	// only handle dns udp for now
	transformStream.readable.pipeTo(new WritableStream({
		async write(chunk) {
			const resp = await fetch('https://1.1.1.1/dns-query',
				{
					method: 'POST',
					headers: {
						'content-type': 'application/dns-message',
					},
					body: chunk,
				})
			const dnsQueryResult = await resp.arrayBuffer();
			const udpSize = dnsQueryResult.byteLength;
			// console.log([...new Uint8Array(dnsQueryResult)].map((x) => x.toString(16)));
			const udpSizeBuffer = new Uint8Array([(udpSize >> 8) & 0xff, udpSize & 0xff]);
			if (webSocket.readyState === WS_READY_STATE_OPEN) {
				log(`doh success and dns message length is ${udpSize}`);
				if (isVlessHeaderSent) {
					webSocket.send(await new Blob([udpSizeBuffer, dnsQueryResult]).arrayBuffer());
				} else {
					webSocket.send(await new Blob([vlessResponseHeader, udpSizeBuffer, dnsQueryResult]).arrayBuffer());
					isVlessHeaderSent = true;
				}
			}
		}
	})).catch((error) => {
		log('dns udp has error' + error)
	});

	const writer = transformStream.writable.getWriter();

	return {
		/**
		 * 
		 * @param {Uint8Array} chunk 
		 */
		write(chunk) {
			writer.write(chunk);
		}
	};
}

/**
 * 
 * @param {string} userID 
 * @param {string | null} hostName
 * @returns {string}
 */
function getVLESSConfig(userID, hostName) {
	const protocol = "vless";
	const vlessMain = 
	`${protocol}` + 
	`://${userID}@${hostName}:443`+
	`?encryption=none&security=tls&sni=${hostName}&fp=randomized&type=ws&host=${hostName}&path=%2F%3Fed%3D2048#${hostName}`;
	
	return `
################################################################
v2ray
---------------------------------------------------------------
${vlessMain}
---------------------------------------------------------------
################################################################
clash-meta
---------------------------------------------------------------
- type: vless
  name: ${hostName}
  server: ${hostName}
  port: 443
  uuid: ${userID}
  network: ws
  tls: true
  udp: false
  sni: ${hostName}
  client-fingerprint: chrome
  ws-opts:
    path: "/?ed=2048"
    headers:
      host: ${hostName}
---------------------------------------------------------------
################################################################
`;
}

