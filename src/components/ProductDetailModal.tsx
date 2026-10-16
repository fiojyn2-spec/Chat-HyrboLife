import React from 'react';
import { X, CheckCircle2, Flame, FileText, Film, MessageCircle, ExternalLink, Sparkles, Play, Coins, Ban, ShieldAlert } from 'lucide-react';
import { Product, ProductVideo } from '../types';
import { getVideoThumbnail } from '../utils/videoUtils';

interface ProductDetailModalProps {
  product: Product | null;
  onClose: () => void;
  onSelectVideo: (video: ProductVideo) => void;
  onAskAboutProduct: (productName: string) => void;
}

export const ProductDetailModal: React.FC<ProductDetailModalProps> = ({
  product,
  onClose,
  onSelectVideo,
  onAskAboutProduct,
}) => {
  const [selectedImgIndex, setSelectedImgIndex] = React.useState<number>(0);

  React.useEffect(() => {
    setSelectedImgIndex(0);
  }, [product?.id]);

  if (!product) return null;

  const imagesList =
    product.images && product.images.length > 0
      ? product.images
      : [
          {
            id: 'main',
            title: product.name,
            imageUrl: product.imageUrl,
            aiDescription: '',
            displayTrigger: '',
          },
        ];

  const currentDisplayImage = imagesList[selectedImgIndex] || imagesList[0];

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/75 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl max-h-[90vh] bg-white rounded-3xl overflow-hidden shadow-2xl flex flex-col border border-emerald-900/10"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with image */}
        <div className="relative h-52 sm:h-64 w-full bg-emerald-50 overflow-hidden shrink-0 flex items-center justify-center p-8">
          <img
            src={currentDisplayImage.imageUrl}
            alt={currentDisplayImage.title || product.name}
            className="max-h-full max-w-full object-contain transition-all duration-300 drop-shadow-xl"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-emerald-50/50 via-transparent to-transparent pointer-events-none" />

          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 left-4 w-9 h-9 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center backdrop-blur-md transition-colors"
            aria-label="إغلاق"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Price badge */}
          <div className="absolute top-4 right-4 bg-gradient-to-r from-[#D4AF37] to-[#E6C657] text-emerald-950 font-black px-3.5 py-1.5 rounded-full text-xs sm:text-sm shadow-md flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-emerald-950" />
            {product.price}
          </div>

          {/* Product Title on Image */}
          <div className="absolute bottom-4 right-4 left-4">
            <span className="text-xs font-bold text-white mb-1 inline-block bg-[#00873D]/80 backdrop-blur-md px-2.5 py-0.5 rounded-lg shadow-sm">
              {product.category}
            </span>
            <h2 className="text-lg sm:text-2xl font-black text-slate-900 leading-tight drop-shadow-sm">
              {product.name}
            </h2>
            {currentDisplayImage.title && currentDisplayImage.title !== product.name && (
              <span className="text-xs font-bold text-emerald-700 block mt-1">
                📸 {currentDisplayImage.title}
              </span>
            )}
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
          {/* Thumbnails switcher when product has multiple images */}
          {imagesList.length > 1 && (
            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
              <span className="text-xs font-bold text-slate-800 block">
                معرض صور المنتج الذكي ({imagesList.length} صور متوفرة):
              </span>
              <div className="flex items-center gap-2 overflow-x-auto pb-1">
                {imagesList.map((img, idx) => (
                  <button
                    key={img.id || idx}
                    type="button"
                    onClick={() => setSelectedImgIndex(idx)}
                    className={`flex items-center gap-2 p-1.5 rounded-xl border-2 transition-all shrink-0 text-right ${
                      selectedImgIndex === idx
                        ? 'border-[#00873D] bg-emerald-50 shadow-xs'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <img
                      src={img.imageUrl}
                      alt={img.title}
                      className="w-10 h-10 rounded-lg object-cover"
                    />
                    <div className="max-w-[140px]">
                      <span className="text-xs font-bold text-slate-900 block truncate">
                        {img.title}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* تسعير المنتج بالعملات الثلاث المعتمدة */}
          <div className="p-3.5 bg-gradient-to-r from-emerald-50 via-slate-50 to-emerald-50 rounded-2xl border-2 border-emerald-300 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                <Coins className="w-4 h-4 text-[#00873D]" />
                <span>الأسعار المعتمدة بالعملات الثلاث:</span>
              </span>
              <span className="text-[11px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full">
                3 عملات معتمدة
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {/* ريال سعودي */}
              <div className="bg-white p-2.5 rounded-xl border border-slate-200 text-center shadow-2xs">
                <span className="text-[11px] font-bold text-slate-500 block mb-0.5">🇸🇦 الريال السعودي</span>
                <span className="text-sm sm:text-base font-black text-emerald-700">
                  {product.priceSAR || (product.price.includes('ر.س') ? product.price.split('|').find(p => p.includes('ر.س'))?.trim() : 'متوفر عند الطلب')}
                </span>
              </div>
              {/* دولار أمريكي */}
              <div className="bg-white p-2.5 rounded-xl border border-slate-200 text-center shadow-2xs">
                <span className="text-[11px] font-bold text-slate-500 block mb-0.5">💵 الدولار الأمريكي</span>
                <span className="text-sm sm:text-base font-black text-emerald-700">
                  {product.priceUSD || (product.price.includes('$') ? product.price.split('|').find(p => p.includes('$'))?.trim() : 'متوفر عند الطلب')}
                </span>
              </div>
              {/* ريال يمني (عملة جديدة) */}
              <div className="bg-white p-2.5 rounded-xl border border-slate-200 text-center shadow-2xs">
                <span className="text-[11px] font-bold text-slate-500 block mb-0.5">🇾🇪 الريال اليمني (عملة جديدة)</span>
                <span className="text-sm sm:text-base font-black text-amber-700">
                  {product.priceYER || (product.price.includes('ر.ي') ? product.price.split('|').find(p => p.includes('ر.ي'))?.trim() : (product.priceIQD ? product.priceIQD.replace('د.ع', 'ر.ي') : 'متوفر عند الطلب'))}
                </span>
              </div>
            </div>
          </div>

          {/* Short description */}
          <p className="text-sm sm:text-base text-slate-700 leading-relaxed font-medium bg-emerald-50/50 p-3.5 rounded-2xl border border-emerald-100/70">
            {product.fullDesc}
          </p>

          {/* Benefits */}
          <div>
            <h3 className="text-sm font-bold text-[#00873D] mb-2.5 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#D4AF37]" />
              أبرز الفوائد العصبية والصحية للمنتج:
            </h3>
            <div className="grid grid-cols-1 gap-2">
              {product.benefits.map((b, idx) => (
                <div key={idx} className="flex items-start gap-2.5 text-xs sm:text-sm text-slate-700 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                  <span className="w-2 h-2 rounded-full bg-[#00873D] mt-1.5 shrink-0" />
                  <span>{b}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Usage and Ingredients */}
          <div className="space-y-3">
            <div className="p-3.5 bg-[#FAFDFB] rounded-2xl border border-emerald-100 space-y-2.5">
              <span className="text-xs sm:text-sm font-bold text-[#00873D] flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-[#D4AF37]" />
                طريقة الاستخدام:
              </span>
              {product.usageInstructions && (
                <p className="text-xs sm:text-sm text-slate-700 leading-relaxed font-medium">
                  {product.usageInstructions}
                </p>
              )}
              {/* Optional Usage Video with Visual Preview */}
              {product.usageVideoUrl && (
                <div
                  onClick={() =>
                    onSelectVideo({
                      id: `usage-vid-${product.id}`,
                      title: `فيديو طريقة الاستخدام: ${product.name}`,
                      description: product.usageInstructions || 'فيديو عملي لشرح طريقة الاستخدام الصحيح خطوة بخطوة.',
                      contextAndTrigger: '',
                      videoUrl: product.usageVideoUrl || '',
                    })
                  }
                  className="mt-2 p-2 bg-white rounded-xl border border-emerald-200/80 shadow-2xs hover:border-[#00873D] hover:shadow-xs transition-all cursor-pointer flex items-center gap-3 group"
                >
                  <div className="relative w-20 h-14 rounded-lg overflow-hidden bg-slate-900 shrink-0">
                    <img
                      src={getVideoThumbnail(product.usageVideoUrl)}
                      alt="فيديو طريقة الاستخدام"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                    <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                      <div className="w-6 h-6 rounded-full bg-[#00873D] text-white flex items-center justify-center shadow-xs">
                        <Play className="w-3 h-3 fill-white mr-0.5" />
                      </div>
                    </div>
                  </div>
                  <div className="flex-1 overflow-hidden">
                    <span className="text-xs font-bold text-slate-900 group-hover:text-[#00873D] transition-colors block truncate">
                      شاهد فيديو توضيحي لطريقة الاستخدام 🎬
                    </span>
                    <span className="text-[11px] text-slate-500 block truncate">
                      اضغط لمشاهدة شرح عملي بالفيديو
                    </span>
                  </div>
                  <button
                    type="button"
                    className="shrink-0 px-3 py-1.5 bg-[#00873D] text-white text-xs font-bold rounded-lg group-hover:bg-[#007033] transition-colors"
                  >
                    تشغيل
                  </button>
                </div>
              )}
            </div>

            <div className="p-3.5 bg-[#FAFDFB] rounded-2xl border border-emerald-100">
              <span className="text-xs font-bold text-[#00873D] block mb-1">
                المكونات الأساسية:
              </span>
              <p className="text-xs text-slate-600 leading-relaxed">
                {product.keyIngredients}
              </p>
            </div>
          </div>

          {/* Target Audience */}
          <div className="p-3 bg-amber-50/70 rounded-2xl border border-amber-200/60">
            <span className="text-xs font-bold text-amber-900 flex items-center gap-1.5 mb-1">
              <Flame className="w-3.5 h-3.5 text-[#D4AF37]" />
              الفئة المستهدفة والمشكلة التي يعالجها:
            </span>
            <p className="text-xs sm:text-sm text-amber-950 font-medium leading-relaxed">
              {product.targetAudience}
            </p>
          </div>

          {/* Forbidden Items & Alternatives Section */}
          {((product.forbiddenItems && product.forbiddenItems.length > 0) || 
            (product.alternativeItems && product.alternativeItems.length > 0)) && (
            <div className="space-y-4 pt-2">
              <h3 className="text-sm font-bold text-rose-800 flex items-center gap-2">
                <Ban className="w-4 h-4 text-rose-600" />
                تنبيهات الممنوعات والبدائل الصحية المقترحة:
              </h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Forbidden Items */}
                <div className="space-y-2">
                  <span className="text-[11px] font-black text-rose-900 flex items-center gap-1.5 px-1">
                    <ShieldAlert className="w-3 h-3" />
                    يُمنع مع هذا المنتج:
                  </span>
                  <div className="space-y-2">
                    {product.forbiddenItems?.map((f, i) => (
                      <div key={f.id || i} className="bg-rose-50/50 border border-rose-100 p-2.5 rounded-2xl flex items-center gap-3">
                        {f.imageUrl && (
                          <img 
                            src={f.imageUrl} 
                            className="w-12 h-12 rounded-xl object-cover border border-rose-200 shadow-2xs cursor-pointer hover:scale-105 transition-transform" 
                            alt={f.name}
                            onClick={() => setSelectedImgIndex(-1)} // Logic to handle showing this in a full viewer could be added
                          />
                        )}
                        <div className="overflow-hidden">
                          <span className="text-xs font-black text-rose-950 block truncate">{f.name}</span>
                          {f.description && <p className="text-[10px] text-slate-600 line-clamp-1">{f.description}</p>}
                        </div>
                      </div>
                    ))}
                    {(!product.forbiddenItems || product.forbiddenItems.length === 0) && (
                      <div className="text-[10px] text-slate-400 italic px-2">لا توجد قيود إضافية مسجلة.</div>
                    )}
                  </div>
                </div>

                {/* Alternative Items */}
                <div className="space-y-2">
                  <span className="text-[11px] font-black text-emerald-900 flex items-center gap-1.5 px-1">
                    <CheckCircle2 className="w-3 h-3" />
                    البدائل الصحية الموصى بها:
                  </span>
                  <div className="space-y-2">
                    {product.alternativeItems?.map((a, i) => (
                      <div key={a.id || i} className="bg-emerald-50/50 border border-emerald-100 p-2.5 rounded-2xl flex items-center gap-3">
                        {a.imageUrl && (
                          <img 
                            src={a.imageUrl} 
                            className="w-12 h-12 rounded-xl object-cover border border-emerald-200 shadow-2xs cursor-pointer hover:scale-105 transition-transform" 
                            alt={a.name}
                          />
                        )}
                        <div className="overflow-hidden">
                          <span className="text-xs font-black text-emerald-950 block truncate">{a.name}</span>
                          {a.description && <p className="text-[10px] text-slate-600 line-clamp-1">{a.description}</p>}
                        </div>
                      </div>
                    ))}
                    {(!product.alternativeItems || product.alternativeItems.length === 0) && (
                      <div className="text-[10px] text-slate-400 italic px-2">استمر في نمط حياتك الصحي المتوازن.</div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Product Videos */}
          {product.videos && product.videos.length > 0 && (
            <div>
              <h3 className="text-sm font-bold text-[#00873D] mb-2.5 flex items-center gap-2">
                <Film className="w-4 h-4 text-[#D4AF37]" />
                فيديوهات الشرح والتوضيح ({product.videos.length}):
              </h3>
              <div className="space-y-2">
                {product.videos.map((vid) => (
                  <div
                    key={vid.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between p-3 bg-gradient-to-r from-emerald-50/70 to-white rounded-2xl border border-emerald-200/80 gap-3"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-[#D4AF37]" />
                        <h4 className="text-xs sm:text-sm font-bold text-slate-900">{vid.title}</h4>
                      </div>
                      <p className="text-xs text-slate-600 line-clamp-2 pr-4">
                        <span className="font-semibold text-emerald-800">تفاصيل: </span>
                        {vid.description || 'مقطع فيديو توضيحي عن المنتج وطريقة الاستخدام.'}
                      </p>
                    </div>
                    <button
                      onClick={() => onSelectVideo(vid)}
                      className="self-end sm:self-center shrink-0 px-3.5 py-1.5 bg-[#00873D] hover:bg-[#007033] text-white text-xs font-bold rounded-xl shadow-sm flex items-center gap-1.5 transition-colors"
                    >
                      <Film className="w-3.5 h-3.5" />
                      مشاهدة الفيديو
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Attached Documents */}
          {product.docs && product.docs.length > 0 && (
            <div>
              <h3 className="text-sm font-bold text-[#00873D] mb-2 flex items-center gap-2">
                <FileText className="w-4 h-4 text-[#D4AF37]" />
                المستندات والأدلة المرفقة ({product.docs.length}):
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {product.docs.map((doc) => (
                  <div
                    key={doc.id}
                    className="p-2.5 bg-slate-50 border border-slate-200/80 rounded-xl flex items-center justify-between gap-2"
                  >
                    <div className="flex items-center gap-2 overflow-hidden">
                      <FileText className="w-4 h-4 text-emerald-600 shrink-0" />
                      <div className="overflow-hidden">
                        <p className="text-xs font-bold text-slate-800 truncate">{doc.name}</p>
                        <span className="text-[10px] text-slate-500">{(doc.size / 1024).toFixed(0)} KB</span>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-emerald-100/70 text-[#00873D]">
                      {doc.type}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-3.5 sm:p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-3 shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs sm:text-sm font-bold text-slate-600 hover:text-slate-900 transition-colors"
          >
            إغلاق
          </button>
          <button
            onClick={() => {
              onAskAboutProduct(`أريد معرفة المزيد عن منتج "${product.name}" وكيف يساعدني في تحقيق أهدافي الصحية؟`);
              onClose();
            }}
            className="flex-1 sm:flex-initial px-5 py-2.5 bg-gradient-to-r from-[#00873D] to-[#006830] hover:brightness-110 text-white font-bold text-xs sm:text-sm rounded-xl shadow-md flex items-center justify-center gap-2 transition-all"
          >
            <MessageCircle className="w-4 h-4 text-[#D4AF37]" />
            استشر الذكاء الاصطناعي حول هذا المنتج
          </button>
        </div>
      </div>
    </div>
  );
};
