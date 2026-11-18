// Prueba y despliega únicamente el Worker autorizado wayup-studio-agent-preview (chats publicados de los agentes).
// Se niega a desplegar desde otra rama o con cambios sin confirmar, para que lo desplegado coincida con GitHub.
import {execSync} from 'node:child_process';

const run=(cmd,opts={})=>execSync(cmd,{stdio:'inherit',...opts});
const out=cmd=>execSync(cmd,{encoding:'utf8'}).trim();
const AUTHORIZED_BRANCH='feature/studio-final-motor-estructura-medios-20261115';

const branch=out('git rev-parse --abbrev-ref HEAD');
if(branch!==AUTHORIZED_BRANCH)throw Error('Despliegue bloqueado: rama '+branch+' (solo '+AUTHORIZED_BRANCH+').');
if(out('git status --porcelain --untracked-files=no'))throw Error('Despliegue bloqueado: hay cambios sin confirmar.');
const sha=out('git rev-parse --short=12 HEAD');

run('node --test tests/studio-agents-sso-integration.test.mjs tests/studio-ai-providers.test.mjs tests/studio-agent-brain.test.mjs tests/studio-agent-data.test.mjs tests/studio-agent-mail.test.mjs tests/studio-agent-sports.test.mjs');
run('npx --yes wrangler@4 deploy --config wrangler.agent-preview.jsonc --message "agents '+sha+'"');
console.log('Desplegado wayup-studio-agent-preview con build '+sha);
