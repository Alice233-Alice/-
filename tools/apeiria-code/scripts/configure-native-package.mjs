import fs from 'node:fs';
const file='package.json',pkg=JSON.parse(fs.readFileSync(file,'utf8'));
const retained=JSON.parse(fs.readFileSync('native/package.json','utf8'));
const contributes=JSON.parse(fs.readFileSync('native/contributions.json','utf8'));
const aliases=[
 {command:'apeiriaCode.open',title:'Apeiria Code：打开原生聊天'},
 {command:'apeiriaCode.settings',title:'Apeiria Code：模型提供商',icon:'$(settings-gear)'},
 {command:'apeiriaCode.newThread',title:'Apeiria Code：新建聊天',icon:'$(add)'},
 {command:'apeiriaCode.attachSelection',title:'Apeiria Code：引用当前选区'},
];
contributes.commands=[...(contributes.commands||[]),...aliases];
contributes.menus||={};contributes.menus['view/title']=[...(contributes.menus['view/title']||[]),{command:'apeiriaCode.settings',when:'view == apeiriaCode.native.sidebarView || view == apeiriaCode.native.sidebarSecondaryView',group:'navigation'}];
// Keep global official shortcuts owned by the official extension; native scoped bindings are retained.
contributes.keybindings=(contributes.keybindings||[]).filter(binding=>binding.when&&/apeiriaCode\.native\.|apeiria-code-native/.test(binding.when));
Object.assign(pkg,{version:'0.2.0',displayName:'Apeiria Code',description:'同一 VS Code 中的独立 Codex 原生客户端，使用第三方模型与独立数据。',main:'./dist/extension.cjs',activationEvents:['onStartupFinished','onUri'],engines:{...pkg.engines,vscode:retained.engines.vscode},categories:retained.categories,enabledApiProposals:retained.enabledApiProposals,contributes});
pkg.scripts['prepare-native']='node scripts/prepare-native.mjs';
pkg.scripts['prepare-native-models']='node scripts/prepare-native-models.mjs';
pkg.scripts['configure-native']='node scripts/configure-native-package.mjs';
fs.writeFileSync(file,JSON.stringify(pkg,null,2)+'\n');
console.log('Configured Apeiria Code 0.2.0 with retained native contributions and independent registrations.');
