const express=require('express'),multer=require('multer');
const app=express(),upload=multer({storage:multer.memoryStorage(),limits:{fileSize:15*1024*1024},fileFilter:(_r,f,cb)=>cb(null,/^image\/(jpeg|png|webp)$/.test(f.mimetype))});
app.use(express.static('public'));
app.get('/api/health',(_q,r)=>r.json({ok:true,configured:Boolean(process.env.DIFY_API_KEY)}));
app.post('/api/analyze',upload.single('image'),async(q,r)=>{
 if(!process.env.DIFY_API_KEY)return r.status(503).json({error:'Koneksi Dify belum dikonfigurasi.'});
 if(!q.file)return r.status(400).json({error:'Pilih foto terlebih dahulu.'});
 const base=(process.env.DIFY_BASE_URL||'https://api.dify.ai').replace(/\/+$/,''),headers={Authorization:'Bearer '+process.env.DIFY_API_KEY},user=process.env.DIFY_USER_ID||'partvision-web';
 try{const form=new FormData();form.append('file',new Blob([q.file.buffer],{type:q.file.mimetype}),q.file.originalname||'photo.jpg');form.append('user',user);
 const u=await fetch(base+'/v1/files/upload',{method:'POST',headers,body:form}),file=await u.json();if(!u.ok||!file.id)return r.status(502).json({error:'Dify menolak foto. Periksa koneksi API.'});
 const inputs={[process.env.DIFY_IMAGE_INPUT||'image']:{transfer_method:'local_file',upload_file_id:file.id,type:'image'}};if(q.body.notes)inputs[process.env.DIFY_NOTES_INPUT||'notes']=String(q.body.notes).slice(0,2000);
 const w=await fetch(base+'/v1/workflows/run',{method:'POST',headers:{...headers,'Content-Type':'application/json'},body:JSON.stringify({inputs,response_mode:'blocking',user})}),data=await w.json();if(!w.ok||data.data?.status==='failed')return r.status(502).json({error:'Workflow Dify gagal. Periksa nama input dan status workflow.'});r.json({outputs:data.data?.outputs||{}});
 }catch(e){console.error('Dify:',e.message);r.status(502).json({error:'Tidak dapat terhubung ke Dify.'})}
});
app.use((e,_q,r,_n)=>r.status(e.code==='LIMIT_FILE_SIZE'?413:400).json({error:e.code==='LIMIT_FILE_SIZE'?'Foto maksimal 15 MB.':'File foto tidak valid.'}));
app.listen(process.env.PORT||3000,'0.0.0.0');
