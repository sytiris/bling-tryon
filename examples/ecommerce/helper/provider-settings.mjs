import { mkdir, readFile, writeFile, rename, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
export function validateProviderSettings(value) {
  if (!['decart','vidu'].includes(value?.provider) || !['cn','global'].includes(value?.viduRegion)) {
    throw Object.assign(new Error('请选择支持的模型服务和地区'), { status: 400, safe: true });
  }
  return { provider: value.provider, viduRegion: value.viduRegion };
}
export async function createProviderSettings(directory) {
  const path=join(directory,'providers.json');
  let current={provider:'decart',viduRegion:'cn'};
  try { current=validateProviderSettings(JSON.parse(await readFile(path,'utf8'))); }
  catch(error) { if(error.code!=='ENOENT')throw new Error('本地模型配置无法读取，请检查 providers.json'); }
  return {
    get:()=>({...current}),
    async save(value) {
      const next=validateProviderSettings(value);
      await mkdir(directory,{recursive:true,mode:0o700});
      const temporary=join(directory,'.provider-'+randomUUID());
      try { await writeFile(temporary,JSON.stringify(next)+'\n',{mode:0o600,flag:'wx'});await rename(temporary,path);current=next; }
      finally {await rm(temporary,{force:true});}
    },
  };
}
