// Compila studio-next y despliega únicamente el Worker autorizado wayup-studio-motor-preview.
// Se niega a desplegar desde main o con cambios sin confirmar, para que el SHA servido sea verificable.
import {execSync} from 'node:child_process';

const run=(cmd,opts={})=>execSync(cmd,{stdio:'inherit',...opts});
const out=cmd=>execSync(cmd,{encoding:'utf8'}).trim();
const AUTHORIZED_BRANCH='feature/studio-final-motor-estructura-medios-20261115';

const branch=out('git rev-parse --abbrev-ref HEAD');
if(branch!==AUTHORIZED_BRANCH)throw Error('Despliegue bloqueado: rama '+branch+' (solo '+AUTHORIZED_BRANCH+').');
if(out('git status --porcelain --untracked-files=no'))throw Error('Despliegue bloqueado: hay cambios sin confirmar.');
const sha=out('git rev-parse --short=12 HEAD');

run('npm test',{cwd:'studio-next'});
run('npm run typecheck',{cwd:'studio-next'});
run('node --test tests/studio-next-projects-bridge.test.mjs tests/studio-agents-sso-integration.test.mjs tests/studio-webcreator-ai.test.mjs tests/studio-access.test.mjs tests/studio-creator-research.test.mjs tests/studio-ai-providers.test.mjs tests/studio-agent-brain.test.mjs tests/studio-agent-data.test.mjs');
run('npm run build',{cwd:'studio-next'});
run('npx --yes wrangler@4 deploy --config wrangler.motor-preview.jsonc --define __STUDIO_BUILD__:\'"'+sha+'"\' --message "studio '+sha+'"');
console.log('Desplegado wayup-studio-motor-preview con build '+sha);
