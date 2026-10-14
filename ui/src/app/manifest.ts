import type {MetadataRoute} from 'next';
export default function manifest():MetadataRoute.Manifest {
 return {id:'/',name:'INTERACTIVEOTEL',short_name:'Otel',description:'Otel, apart ve hostel yönetimi',lang:'tr',start_url:'/?tab=board',scope:'/',display:'standalone',background_color:'#ffffff',theme_color:'#ffffff',icons:[{src:'/pwa/icon-192.png',sizes:'192x192',type:'image/png',purpose:'any'},{src:'/pwa/icon-512.png',sizes:'512x512',type:'image/png',purpose:'any'},{src:'/pwa/icon-maskable.png',sizes:'512x512',type:'image/png',purpose:'maskable'}]};
}
