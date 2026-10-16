import { Product, PersuasionPrompt, ForbiddenRule, ChatMessage, AIProviderId } from '../types';

export function normalizeArabicText(str: string): string {
  return str
    .toLowerCase()
    .replace(/[؟?.,!_—\-:;"'()\[\]{}،]/g, '')
    .replace(/[إأآا]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/\s+/g, ' ')
    .trim();
}

export function isSimilarToPrevious(newQ: string, prevList: string[]): boolean {
  const normNew = normalizeArabicText(newQ);
  if (!normNew || normNew.length < 4) return true;

  // Extract core keywords (words > 2 chars, ignoring generic stop-words)
  const stopWords = new Set(['هل', 'ما', 'ماذا', 'من', 'كم', 'كيف', 'اين', 'متى', 'لماذا', 'عن', 'في', 'على', 'الى', 'مع', 'هذا', 'هذه', 'تود', 'تريد', 'ترغب']);
  const newWords = normNew
    .split(' ')
    .filter((w) => w.length > 2 && !stopWords.has(w));

  for (const prev of prevList) {
    const normPrev = normalizeArabicText(prev);
    if (!normPrev) continue;

    // Exact match or substring containment
    if (normNew === normPrev) return true;
    if (normNew.length > 10 && normPrev.length > 10) {
      if (normNew.includes(normPrev) || normPrev.includes(normNew)) return true;
    }

    // Semantic / Keyword Overlap (Jaccard similarity > 45%)
    if (newWords.length > 0) {
      const prevWords = new Set(
        normPrev
          .split(' ')
          .filter((w) => w.length > 2 && !stopWords.has(w))
      );
      if (prevWords.size > 0) {
        let intersection = 0;
        for (const nw of newWords) {
          if (prevWords.has(nw)) intersection++;
        }
        const similarity = intersection / Math.max(newWords.length, prevWords.size);
        if (similarity >= 0.45) return true;
      }
    }
  }
  return false;
}

function generateKnowledgeMarkdown(products: Product[]): string {
  let md = `\n--- قاعدة المعرفة الشاملة لجميع المنتجات والمستندات المعتمدة (KNOWLEDGE BASE) ---\n`;
  products.forEach((p) => {
    md += `\n=========================================\n`;
    md += `# [معرف المنتج: ${p.id}] ${p.name}\n`;
    if (p.category) md += `- التصنيف: ${p.category}\n`;
    if (p.shortDesc) md += `- نبذة موجزة: ${p.shortDesc}\n`;
    if (p.targetAudience) md += `- الفئة المستهدفة والحالات الصحية المرتبطة: ${p.targetAudience}\n`;
    
    // Currencies and prices
    const prices: string[] = [];
    if (p.priceSAR) prices.push(`${p.priceSAR} ريال سعودي (SAR)`);
    if (p.priceUSD) prices.push(`${p.priceUSD} دولار أمريكي (USD)`);
    if (p.priceYER) prices.push(`${p.priceYER} ريال يمني - عملة جديدة (YER)`);
    else if (p.priceIQD) prices.push(`${p.priceIQD.replace('د.ع', 'ر.ي')} ريال يمني - عملة جديدة (YER)`);
    if (prices.length > 0) {
      md += `- الأسعار والعملات المعتمدة: ${prices.join(' | ')}\n`;
    } else if (p.price) {
      md += `- السعر المسجل: ${p.price}\n`;
    }

    if (p.usageInstructions) {
      md += `- طريقة الاستخدام والجرعات وموضع التطبيق: ${p.usageInstructions}\n`;
    }

    if (p.keyIngredients) {
      md += `- المكونات والمواد الفعالة: ${p.keyIngredients}\n`;
    }

    if (p.benefits?.length) {
      md += `- أبرز الفوائد والنتائج الإقناعية:\n${p.benefits.map((b) => `  * ${b}`).join('\n')}\n`;
    }

    // FULL COMPREHENSIVE KNOWLEDGE DESCRIPTION (NEVER TRUNCATE)
    if (p.fullDesc && p.fullDesc.trim()) {
      md += `\n### الدليل المعرفي والمعلومات الكاملة لـ (${p.name}):\n${p.fullDesc.trim()}\n`;
    }

    // VIDEOS (from p.videos AND p.usageVideoUrl)
    const allVideos: { id: string; title: string; trigger?: string; url?: string }[] = [];
    if (p.videos?.length) {
      p.videos.forEach((v) => allVideos.push({ id: v.id, title: v.title, trigger: v.contextAndTrigger, url: v.videoUrl }));
    }
    if (p.usageVideoUrl && !allVideos.some((v) => v.url === p.usageVideoUrl)) {
      allVideos.push({
        id: `vid-${p.id}-usage`,
        title: `فيديو شرح وطريقة استخدام ${p.name}`,
        trigger: 'طريقة الاستخدام ومشاهدة الفيديو التوضيحي المباشر',
        url: p.usageVideoUrl,
      });
    }

    if (allVideos.length > 0) {
      md += `\n### مقاطع الفيديو المعتمدة للتشغيل المباشر:\n`;
      allVideos.forEach((v) => {
        md += `  * [RECOMMEND_VIDEO: ${v.id}] - "${v.title}" (${v.trigger || 'مقطع توضيحي مباشر'})\n`;
      });
    }

    // UPLOADED DOCUMENTS & CLINICAL STUDIES & FAQS (p.docs)
    const validDocs = (p.docs || []).filter((d) => !d.isDeleted);
    if (validDocs.length > 0) {
      md += `\n### المستندات والملفات والأبحاث والأسئلة الشائعة المعتمدة المرفقة (Attached Documents & FAQs):\n`;
      validDocs.forEach((doc) => {
        md += `\n#### 📄 مستند معتمد: [${doc.name}]\n`;
        if (doc.extractedText && doc.extractedText.trim()) {
          md += `محتوى ومعلومات المستند:\n${doc.extractedText.trim()}\n`;
        }
      });
    }

    if (p.marketingHooks?.length) {
      md += `- هوكات ونقاط الإقناع: ${p.marketingHooks.join(' | ')}\n`;
    }

    if (p.forbiddenItems?.length) {
      md += `- الممنوعات المرتبطة: ${p.forbiddenItems.map((f) => `[${f.id}] ${f.name}`).join(', ')}\n`;
    }

    if (p.images?.length) {
      md += `- الصور التوضيحية المعتمدة:\n`;
      p.images.forEach((img) => {
        md += `  * [${img.id}] ${img.title} (${img.displayTrigger})\n`;
      });
    }
  });
  return md;
}

export function buildSystemPrompt(
  activePrompt: PersuasionPrompt,
  forbiddenRule: ForbiddenRule,
  products: Product[],
  previousQuestions: string[] = [],
  seenMediaIds: string[] = []
): string {
  // Construct full comprehensive products & documents knowledge base
  const productsKnowledge = generateKnowledgeMarkdown(products);

  // Construct Global Rules & Restrictions
  let forbiddenSection = '';
  if (forbiddenRule.isActive) {
    const mandatoryInfo = forbiddenRule.mandatoryWords?.length 
      ? `\nإلزامي (يجب استخدامها): ${forbiddenRule.mandatoryWords.join('، ')}`
      : '';
    forbiddenSection = `\n--- ⚠️ قواعد صارمة ---\nالمحظورات: ${forbiddenRule.forbiddenWords.join('، ')}${mandatoryInfo}\nإرشادات: ${forbiddenRule.guidelines}\n`;
  }

  const antiRepetitionSection = previousQuestions.length 
    ? `\n--- 🔒 أسئلة مستخدمة (يُمنع تكرارها) ---\n${previousQuestions.slice(-20).map(q => `- ${q}`).join('\n')}\n`
    : '';

  const seenMediaSection = seenMediaIds.length
    ? `\n--- 🚫 وسائط مرسلة مسبقاً (يُمنع تكرارها) ---\n${seenMediaIds.join(', ')}\n`
    : '';

  return `${activePrompt.promptText}

${forbiddenSection}

${productsKnowledge}

${antiRepetitionSection}

${seenMediaSection}

--- 🛠 التوجيهات الهيكلية والإلزامية (بروتوكول الفصل والالتزام بالنية وقاعدة المعرفة) ---
1. الفصل الهيكلي (Structural Separation): ابدأ ردك دائماً بكتلة <thought> ... </thought> للتحليل الداخلي، متبوعة بكتلة <response> ... </response> للرد الموجه للمستخدم.
2. التفكير الداخلي <thought>: حلل نية العميل، استرجع الإجابة الدقيقة من قاعدة المعرفة أعلاه (بما في ذلك الدليل المعرفي والأسئلة الشائعة والمستندات المرفقة وفيديوهات الاستخدام)، وتأكد من صحة المعلومات قبل الرد.
3. الرد النهائي <response>: هذا هو القسم الوحيد الذي يراه العميل. ضع فيه النص الإقناعي المباشر والموجز والوسوم البرمجية مثل [RECOMMEND_VIDEO: id] و [SUGGESTED_QUESTION: text].
4. التكامل والارتباط التام بقاعدة المعرفة: أنت مرتبط ارتباطاً وثيقاً بكافة البيانات المتضمنة في قاعدة المعرفة (KB) أعلاه. لا تقل أبداً أن المعلومة غير متوفرة أو أنك غير مرتبط، بل استخرج الإجابة بدقة من نصوص الدليل الشامل أو المستندات المرفقة.
5. الجودة البشرية وقوة الأسلوب: ادخل فوراً في صلب الموضوع بأسلوب واثق ومحترف وودود دون مقدمات آلية مبتذلة.
6. الأسعار والعملات (Financial Intent Only): اذكر السعر فقط عند سؤال العميل الصريح عن السعر أو التكلفة أو رغبته في الشراء.
7. دقة النية والتدرج الطبيعي: أجب بدقة على قدر سؤال العميل واحتياجه الفعلي دون استباق أو حشو معلومات لم يطلبها.
8. مقاطع الفيديو والتشغيل المباشر (Direct Video Player): عندما يسأل العميل عن فيديو أو يطلب مقطعاً توضيحياً أو طريقة الاستخدام/التحضير أو يسأل عن فيديو للمنتج، يجب عليك فوراً وضع الوسم [RECOMMEND_VIDEO: video_id] المناسب من قائمة الفيديوهات المعتمدة في كتلة <response> ليعرض له النظام مشغل الفيديو التفاعلي فوراً!
`;
}

export interface SendMessageResponse {
  content: string;
  recommendedProductIds: string[];
  recommendedVideoIds: string[];
  recommendedImageIds?: string[];
  recommendedDocIds?: string[];
  suggestedQuestions?: string[];
  providerUsed?: AIProviderId;
  originalProvider?: AIProviderId;
  failoverOccurred?: boolean;
  failoverReason?: string;
}

export async function sendChatMessage(
  messages: ChatMessage[],
  activePrompt: PersuasionPrompt,
  forbiddenRule: ForbiddenRule,
  products: Product[],
  globalSeenQuestions: string[] = []
): Promise<SendMessageResponse> {
  // Collect all questions asked or suggested previously in this conversation to strictly prevent repetition
  const previousQuestions: string[] = [];
  messages.slice(0, -1).forEach((m) => {
    if (m.role === 'user') {
      const trimmed = m.content.trim();
      if (trimmed && !previousQuestions.includes(trimmed)) previousQuestions.push(trimmed);
    }
    if (m.suggestedQuestions) {
      m.suggestedQuestions.forEach((q) => {
        const trimmed = q.trim();
        if (trimmed && !previousQuestions.includes(trimmed)) previousQuestions.push(trimmed);
      });
    }
  });

  // Combine conversation-level previous questions with recent global seen questions
  const allSuppressedQuestions = [...previousQuestions];
  globalSeenQuestions.forEach((gq) => {
    const trimmed = gq.trim();
    if (trimmed && !allSuppressedQuestions.includes(trimmed)) {
      allSuppressedQuestions.push(trimmed);
    }
  });

  // Track all media IDs sent in history
  const seenMediaIds: string[] = [];
  messages.forEach(m => {
    if (m.recommendedImageIds) seenMediaIds.push(...m.recommendedImageIds);
    if (m.recommendedVideoIds) seenMediaIds.push(...m.recommendedVideoIds);
  });
  const uniqueSeenMediaIds = Array.from(new Set(seenMediaIds));

  const systemInstruction = buildSystemPrompt(activePrompt, forbiddenRule, products, allSuppressedQuestions, uniqueSeenMediaIds);
  const lastUserMessage = messages[messages.length - 1]?.content || '';

  const formattedMessages = messages.map((m) => ({
    role: m.role,
    content: m.content,
    imageUrl: m.imageUrl,
  }));

  try {
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages: formattedMessages,
        systemInstruction,
      }),
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || `خطأ من الخادم (${res.status})`);
    }

    const data = await res.json();
    const rawText = data.text || '';

    // Professional Extraction: Separate <thought> from <response>
    // This ensures internal reasoning never leaks into the UI or confuses the tag parser
    let processedText = rawText;
    const responseMatch = rawText.match(/<response>([\s\S]*?)<\/response>/i);
    if (responseMatch && responseMatch[1]) {
      processedText = responseMatch[1].trim();
    } else {
      // Fallback: If model failed to use tags, try to strip thinking if it exists
      processedText = rawText.replace(/<thought>[\s\S]*?<\/thought>/gi, '').trim();
    }

    // Extract product, video, image, document, and suggested question tags from the USER-FACING text only
    const { cleanText, productIds, videoIds, imageIds, docIds, suggestedQuestions } = extractTags(
      processedText,
      products,
      lastUserMessage,
      allSuppressedQuestions,
      uniqueSeenMediaIds
    );

    return {
      content: cleanText,
      recommendedProductIds: productIds,
      recommendedVideoIds: videoIds,
      recommendedImageIds: imageIds,
      recommendedDocIds: docIds,
      suggestedQuestions,
      providerUsed: data.providerUsed,
      originalProvider: data.originalProvider,
      failoverOccurred: data.failoverOccurred,
      failoverReason: data.failoverReason,
    };
  } catch (error: any) {
    console.warn('API call failed, running intelligent fallback:', error.message);
    // Intelligent local fallback if server API key is not ready or network offline
    return generateSmartFallback(lastUserMessage, products, activePrompt, allSuppressedQuestions);
  }
}

function extractTags(
  text: string,
  products: Product[],
  userQuery: string = '',
  previousQuestions: string[] = [],
  seenMediaIds: string[] = []
) {
  const productIds: string[] = [];
  const videoIds: string[] = [];
  const imageIds: string[] = [];
  const docIds: string[] = [];
  const suggestedQuestions: string[] = [];
  const q = userQuery.toLowerCase();

  // Helper to add clean question if valid, not duplicate in current message, and not similar to any previous question in session
  const addQuestion = (rawQ: string) => {
    let cleanQ = rawQ
      .replace(/^[-*•\d.)\s]+/, '') // Remove leading bullets or numbers
      .replace(/[\[\]]/g, '')
      .trim();
    if (
      cleanQ.length > 5 &&
      !suggestedQuestions.includes(cleanQ) &&
      !isSimilarToPrevious(cleanQ, previousQuestions)
    ) {
      suggestedQuestions.push(cleanQ);
    }
  };

  // 1. Match various tag formats (English & Arabic)
  const tagPatterns = [
    /\[SUGGESTED_QUESTION:\s*([^\]]+)\]/gi,
    /\[SUGGESTED_QUESTIONS:\s*([^\]]+)\]/gi,
    /\[SUGGESTION:\s*([^\]]+)\]/gi,
    /\[QUESTION:\s*([^\]]+)\]/gi,
    /\[سؤال_مقترح:\s*([^\]]+)\]/gi,
    /\[سؤال مقترح:\s*([^\]]+)\]/gi,
    /\[سؤال:\s*([^\]]+)\]/gi,
    /\[أسئلة مقترحة:\s*([^\]]+)\]/gi,
    /\[أسئلة_مقترحة:\s*([^\]]+)\]/gi,
    /\[اسئلة مقترحة:\s*([^\]]+)\]/gi,
    /\[أسئلة:\s*([^\]]+)\]/gi,
    /\[اسئلة:\s*([^\]]+)\]/gi,
  ];

  for (const pattern of tagPatterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const matchContent = match[1]?.trim();
      if (matchContent) {
        // If content contains multiple lines, split them
        const lines = matchContent.split(/[\n;]/).map((l) => l.trim()).filter(Boolean);
        for (const line of lines) {
          addQuestion(line);
        }
      }
    }
  }

  // 2. Fallback parser: Check if AI wrote a list of suggested questions at the end without tags
  const questionSectionRegex = /(?:أسئلة مقترحة|اسئلة مقترحة|أسئلة يمكنك طرحها|يمكنك أيضاً السؤال عن|أسئلة ذكية للمتابعة|أسئلة للمتابعة|أسئلة قد تهمك)[:：]?\s*([\s\S]*)$/i;
  const sectionMatch = questionSectionRegex.exec(text);
  if (sectionMatch && sectionMatch[1]) {
    const listLines = sectionMatch[1].split('\n').map((l) => l.trim()).filter(Boolean);
    for (const line of listLines) {
      if (line.includes('؟') || line.includes('?') || line.startsWith('-') || line.startsWith('*') || /^\d+[.)]/.test(line)) {
        addQuestion(line);
      }
    }
  }

  // 3. Match [RECOMMEND_PRODUCT: id]
  const prodRegex = /\[RECOMMEND_PRODUCT:\s*([a-zA-Z0-9_-]+)\]/g;
  let match;
  while ((match = prodRegex.exec(text)) !== null) {
    if (match[1] && !productIds.includes(match[1])) {
      // Validate that product exists
      if (products.some(p => p.id === match![1])) {
        productIds.push(match[1]);
      }
    }
  }

  // Check if user explicitly requested a video
  const userExplicitlyRequestedVideo =
    q.includes('فيديو') ||
    q.includes('فديو') ||
    q.includes('مقطع') ||
    q.includes('شورتس') ||
    q.includes('يوتيوب') ||
    q.includes('شاهد') ||
    q.includes('مشاهدة') ||
    q.includes('ورني') ||
    q.includes('اشوف') ||
    q.includes('video') ||
    q.includes('youtube') ||
    q.includes('shorts');

  // Match [RECOMMEND_VIDEO: id]
  const vidRegex = /\[RECOMMEND_VIDEO:\s*([a-zA-Z0-9_-]+)\]/g;
  while ((match = vidRegex.exec(text)) !== null) {
    if (match[1] && !videoIds.includes(match[1])) {
      // Validate that video exists in knowledge base
      const videoExists = products.some(p => (p.videos || []).some(v => v.id === match![1]));
      if (videoExists && (userExplicitlyRequestedVideo || !seenMediaIds.includes(match[1]))) {
        videoIds.push(match[1]);
      }
    }
  }

  // Intelligent Video Attachment: If user explicitly asked for video but model omitted tag
  if (videoIds.length === 0 && userExplicitlyRequestedVideo) {
    // 1. Try from matched products first
    for (const pId of productIds) {
      const p = products.find(prod => prod.id === pId);
      if (p && p.videos && p.videos.length > 0) {
        videoIds.push(p.videos[0].id);
        break;
      }
    }
    // 2. Try from query content
    if (videoIds.length === 0) {
      for (const p of products) {
        const matchesQuery = q.includes(p.name.toLowerCase()) ||
          (p.name.includes('فورمولا') && (q.includes('شيك') || q.includes('فورمولا') || q.includes('تحضير'))) ||
          (p.name.includes('شاي') && (q.includes('شاي') || q.includes('طاقة') || q.includes('حرق'))) ||
          (p.name.includes('صبار') && (q.includes('صبار') || q.includes('قولون') || q.includes('ألوفيرا'))) ||
          (p.name.includes('بروتين') && (q.includes('بروتين') || q.includes('pdm') || q.includes('عضل')));
        if (matchesQuery && p.videos && p.videos.length > 0) {
          videoIds.push(p.videos[0].id);
          break;
        }
      }
    }
    // 3. Fallback to any first available video
    if (videoIds.length === 0) {
      const anyVid = products.flatMap(p => p.videos || [])[0];
      if (anyVid) {
        videoIds.push(anyVid.id);
      }
    }
  }

  // Match [RECOMMEND_IMAGE: id]
  const imgRegex = /\[RECOMMEND_IMAGE:\s*([a-zA-Z0-9_-]+)\]/g;
  while ((match = imgRegex.exec(text)) !== null) {
    if (match[1] && !imageIds.includes(match[1])) {
      // Validate that image exists in knowledge base AND not seen before
      const imageExists = products.some(p => 
        (p.images || []).some(img => img.id === match![1]) ||
        (p.forbiddenItems || []).some(f => f.id === match![1]) ||
        (p.alternativeItems || []).some(a => a.id === match![1]) ||
        match![1] === `img-${p.id}-main` ||
        match![1] === p.id
      );
      if (imageExists && !seenMediaIds.includes(match[1])) {
        imageIds.push(match[1]);
      }
    }
  }

  // Match [RECOMMEND_DOC: id]
  const docRegex = /\[RECOMMEND_DOC:\s*([a-zA-Z0-9_-]+)\]/g;
  while ((match = docRegex.exec(text)) !== null) {
    if (match[1] && !docIds.includes(match[1])) {
      // Validate that doc exists
      const docExists = products.some(p => (p.docs || []).some(d => d.id === match![1]));
      if (docExists) {
        docIds.push(match[1]);
      }
    }
  }

  // Also check if text mentions product names or forbidden/alternative items
  for (const p of products) {
    // Product match
    if (
      text.includes(p.name) ||
      (p.name && text.includes(p.name.split(' ')[0])) ||
      (p.name && q.includes(p.name.toLowerCase()))
    ) {
      if (!productIds.includes(p.id)) productIds.push(p.id);
    }

    // Forbidden Items match
    if (p.forbiddenItems) {
      for (const f of p.forbiddenItems) {
        if (text.includes(f.name) || q.includes(f.name.toLowerCase())) {
          if (f.imageUrl && !imageIds.includes(f.id) && !seenMediaIds.includes(f.id)) {
            imageIds.push(f.id);
          }
        }
      }
    }

    // Alternative Items match
    if (p.alternativeItems) {
      for (const a of p.alternativeItems) {
        if (text.includes(a.name) || q.includes(a.name.toLowerCase())) {
          if (a.imageUrl && !imageIds.includes(a.id) && !seenMediaIds.includes(a.id)) {
            imageIds.push(a.id);
          }
        }
      }
    }
  }

  // Check if user specifically asked for an image
  const isAskingForImage =
    q.includes('صورة') ||
    q.includes('صور') ||
    q.includes('صورتها') ||
    q.includes('صورته') ||
    q.includes('شكل') ||
    q.includes('شكله') ||
    q.includes('صوره') ||
    q.includes('photo') ||
    q.includes('image') ||
    q.includes('ورني') ||
    q.includes('اشوفه') ||
    q.includes('أشوفه');

  // If user requested image or response discussed products but imageIds is empty, auto attach relevant product images!
  // ONLY if not seen before.
  if ((isAskingForImage || imageIds.length === 0) && productIds.length > 0) {
    const limitedProductIds = productIds.slice(0, 2);
    for (const pid of limitedProductIds) {
      const prod = products.find((p) => p.id === pid);
      if (prod) {
        if (prod.images && prod.images.length > 0) {
          const firstImg = prod.images[0];
          if (!imageIds.includes(firstImg.id) && !seenMediaIds.includes(firstImg.id)) {
            imageIds.push(firstImg.id);
          }
        } else if (prod.imageUrl) {
          const virtualId = `img-${prod.id}-main`;
          if (!imageIds.includes(virtualId) && !seenMediaIds.includes(virtualId)) {
            imageIds.push(virtualId);
          }
        }
      }
    }
  }

  // Do not show recommendation cards for a product whose photos are already displayed in this message
  if (isAskingForImage) {
    productIds.length = 0;
  } else if (imageIds.length > 0) {
    for (let i = productIds.length - 1; i >= 0; i--) {
      const p = products.find((prod) => prod.id === productIds[i]);
      if (p) {
        const hasImg =
          imageIds.includes(p.id) ||
          imageIds.includes(`img-${p.id}-main`) ||
          (p.images || []).some((im) => imageIds.includes(im.id));
        if (hasImg) {
          productIds.splice(i, 1);
        }
      }
    }
  }

  // Auto-detect video intent (e.g. when user clicks a video hook question or asks to see a video)
  const normQ = normalizeArabicText(userQuery);
  const isVideoIntent =
    normQ.includes('فيديو') ||
    normQ.includes('مشاهده') ||
    normQ.includes('شاهد') ||
    normQ.includes('قصه نجاح') ||
    normQ.includes('تريد ان ترى') ||
    normQ.includes('هل تود') ||
    normQ.includes('هل ترغب');

  if (isVideoIntent && videoIds.length === 0) {
    for (const p of products) {
      for (const v of p.videos || []) {
        const vTitleNorm = normalizeArabicText(v.title);
        const vTriggerNorm = normalizeArabicText(v.contextAndTrigger || '');
        if (
          normQ.includes(vTitleNorm) ||
          vTitleNorm.includes(normQ) ||
          (vTriggerNorm.length > 5 && normQ.includes(vTriggerNorm.slice(0, 20))) ||
          (p.name && normQ.includes(normalizeArabicText(p.name)))
        ) {
          if (!videoIds.includes(v.id)) {
            videoIds.push(v.id);
          }
        }
      }
    }
  }

  // 4. Intelligent contextual generation ONLY if genuine need exists and question is NOT in previousQuestions
  const isFarewellOrSimpleThanks =
    (q.includes('شكرا') || q.includes('شكراً') || q.includes('يعطيك العافية') || q.includes('تسلم') || q.includes('مع السلامة') || q.includes('باي')) &&
    q.length < 25;

  if (suggestedQuestions.length === 0 && !isFarewellOrSimpleThanks) {
    // Generate context-aware hook questions across 5 persuasive marketing angles (without repeating seen questions)
    if (productIds.length > 0) {
      const firstProd = products.find((p) => p.id === productIds[0]);
      if (firstProd) {
        // Angle 1: Video & In-body Action - ONLY if videos exist
        if (firstProd.videos && firstProd.videos.length > 0) {
          firstProd.videos.forEach((v) => {
            addQuestion(`هل ترغب في مشاهدة فيديو "${v.title}" لترى كيف يعمل في الجسم؟`);
          });
        }
        // Angle 2: Preparation in 90 seconds
        addQuestion(`كيف يُعد ${firstProd.name} في 90 ثانية كأسرع وجبة مشبعة؟`);
        // Angle 3: Financial value
        addQuestion(`كم سعر ${firstProd.name} بالريال السعودي والدولار؟`);
        // Angle 4: Anti-sagging / safety
        addQuestion(`كيف يساعد ${firstProd.name} في شد القوام ومنع الترهلات؟`);
        // Angle 5: Prohibitions & healthy alternatives
        if (firstProd.forbiddenItems && firstProd.forbiddenItems.length > 0) {
          addQuestion(`ما هي الممنوعات والبدائل الغذائية مع ${firstProd.name}؟`);
        }
      }
    } else if (q.includes('وزن') || q.includes('تخسيس') || q.includes('تنحيف') || q.includes('دايت') || q.includes('كرش')) {
      // Check for success story videos globally before suggesting
      const successStoryVideo = products.flatMap(p => p.videos || []).find(v => v.title.includes('قصة نجاح') || v.contextAndTrigger?.includes('نجاح'));
      if (successStoryVideo) {
        addQuestion(`هل ترغب في مشاهدة فيديو ${successStoryVideo.title}؟`);
      }
      addQuestion('كم ستوفر شهرياً عند استبدال وجبة الإفطار العادية بهذا البرنامج؟');
      addQuestion('كيف نضمن شد الترهلات وعدم رجوع الوزن بعد النزول؟');
      addQuestion('كم سعر باقة إنقاص الوزن المتكاملة بالريال السعودي والدولار؟');
    } else if (q.includes('طاقة') || q.includes('خمول') || q.includes('شاي')) {
      const energyVideo = products.flatMap(p => p.videos || []).find(v => v.title.includes('طاقة') || v.contextAndTrigger?.includes('طاقة'));
      if (energyVideo) {
        addQuestion(`تريد أن ترى فيديو كيف يحول شاي الأعشاب الدهون الحشوية إلى طاقة متدفقة؟`);
      }
      addQuestion('متى أفضل أوقات شرب شاي الأعشاب المركز لمضاعفة الحرق طوال اليوم؟');
      addQuestion('كيف يوفر عليك شاي الأعشاب مصاريف مشروبات الطاقة غير الصحية؟');
    } else if (q.includes('قولون') || q.includes('هضم') || q.includes('صبار') || q.includes('بطن')) {
      const digestionVideo = products.flatMap(p => p.videos || []).find(v => v.title.includes('قولون') || v.title.includes('صبار') || v.contextAndTrigger?.includes('هضم'));
      if (digestionVideo) {
        addQuestion(`شاهد فيديو كيف يهدئ الصبار المركز جدران القولون ويزيل الانتفاخ؟`);
      }
      addQuestion('ما هي طريقة شرب الصبار المركز مع الماء على مدار اليوم للترطيب العميق؟');
      addQuestion('كيف يحسن الصبار امتصاص الفيتامينات والمعادن داخل الأمعاء؟');
    } else if (q.includes('بروتين') || q.includes('عضل') || q.includes('شبع') || q.includes('ترهل')) {
      addQuestion('كيف أدمج بروتين PDM مع شيك فورمولا 1 لوجبة تدوم 4 ساعات؟');
      addQuestion('كم تكلفة وجبة البروتين مقارنة بالوجبات السريعة الضارة؟');
    } else if (q.includes('سعر') || q.includes('اسعار') || q.includes('بكم') || q.includes('تكلفة')) {
      addQuestion('ما هي أسعار باقة الفطور المتكامل بالريال السعودي والدولار؟');
      addQuestion('هل تود حساب كم ستوفر شهرياً من ميزانية طعامك مع هيربولايف؟');
      addQuestion('كيف أطلب المنتجات والتوصيل لعنواني؟');
    }
  }

  // Clean tags and raw question sections from visible text for clean reading
  let cleanText = text
    .replace(/\[RECOMMEND_PRODUCT:\s*[a-zA-Z0-9_-]+\]/gi, '')
    .replace(/\[RECOMMEND_VIDEO:\s*[a-zA-Z0-9_-]+\]/gi, '')
    .replace(/\[RECOMMEND_IMAGE:\s*[a-zA-Z0-9_-]+\]/gi, '')
    .replace(/\[RECOMMEND_DOC:\s*[a-zA-Z0-9_-]+\]/gi, '')
    .replace(/\[IMAGE:\s*[a-zA-Z0-9_-]+\]/gi, '')
    .replace(/\[PRODUCT:\s*[a-zA-Z0-9_-]+\]/gi, '')
    .replace(/\[VIDEO:\s*[a-zA-Z0-9_-]+\]/gi, '')
    .replace(/\[DOC:\s*[a-zA-Z0-9_-]+\]/gi, '')
    .replace(/\[SUGGESTED_QUESTION:\s*[^\]]+\]/gi, '')
    .replace(/\[SUGGESTED_QUESTIONS:\s*[^\]]+\]/gi, '')
    .replace(/\[SUGGESTION:\s*[^\]]+\]/gi, '')
    .replace(/\[QUESTION:\s*[^\]]+\]/gi, '')
    .replace(/\[سؤال_مقترح:\s*[^\]]+\]/gi, '')
    .replace(/\[سؤال مقترح:\s*([^\]]+)\]/gi, '')
    .replace(/\[سؤال:\s*[^\]]+\]/gi, '')
    .replace(/\[أسئلة مقترحة:\s*[^\]]+\]/gi, '')
    .replace(/\[أسئلة_مقترحة:\s*[^\]]+\]/gi, '')
    .replace(/\[اسئلة مقترحة:\s*[^\]]+\]/gi, '')
    .replace(/\[أسئلة:\s*[^\]]+\]/gi, '')
    .replace(/\[اسئلة:\s*[^\]]+\]/gi, '');

  if (sectionMatch) {
    cleanText = cleanText.replace(questionSectionRegex, '');
  }

  cleanText = cleanText.trim();

  // Deduplicate and filter existing imageIds by ID strictly
  const finalImageIds = Array.from(new Set(imageIds));

  // Limit to maximum 6 suggested questions (from 0 to 6)
  const finalSuggestedQuestions = suggestedQuestions.slice(0, 6);

  return {
    cleanText,
    productIds,
    videoIds,
    imageIds: finalImageIds,
    docIds,
    suggestedQuestions: finalSuggestedQuestions,
  };
}

function generateSmartFallback(
  userQuery: string,
  products: Product[],
  activePrompt: PersuasionPrompt,
  previousQuestions: string[] = []
): SendMessageResponse {
  const q = userQuery.toLowerCase();

  // Helper to filter out any previously asked or suggested questions in this session
  const filterQuestions = (list: string[]): string[] => {
    return list.filter((item) => !isSimilarToPrevious(item, previousQuestions)).slice(0, 6);
  };

  // Helper to find referenced product accurately from name, category, or health conditions
  const matchedProd = products.find(
    (p) =>
      (p.name && q.includes(p.name.toLowerCase())) ||
      (p.name && p.name.toLowerCase().split(' ').some((word) => word.length > 2 && q.includes(word))) ||
      (p.category && q.includes(p.category.toLowerCase())) ||
      (p.targetAudience && (
        (q.includes('قولون') && p.targetAudience.includes('قولون')) ||
        (q.includes('جرثومة') && p.targetAudience.includes('جرثومة')) ||
        (q.includes('ارتجاع') && p.targetAudience.includes('ارتجاع')) ||
        (q.includes('معدة') && p.targetAudience.includes('معدة')) ||
        (q.includes('امساك') && p.targetAudience.includes('امساك')) ||
        (q.includes('حموضة') && p.targetAudience.includes('حموضة'))
      )) ||
      (p.fullDesc && (
        (q.includes('جاستروزين') && p.fullDesc.includes('جاستروزين')) ||
        (q.includes('gastrozen') && p.fullDesc.toLowerCase().includes('gastrozen'))
      ))
  ) || (products.length === 1 ? products[0] : undefined);

  // 0. User Specifically Asking for Video / Clip / Shorts / YouTube (مثلاً: "اريد فيديو", "اعرض الفيديو", "شورتس", "يوتيوب")
  const isAskingVideo =
    q.includes('فيديو') ||
    q.includes('فديو') ||
    q.includes('مقطع') ||
    q.includes('شورتس') ||
    q.includes('يوتيوب') ||
    q.includes('شاهد') ||
    q.includes('مشاهدة') ||
    q.includes('video') ||
    q.includes('youtube') ||
    q.includes('shorts');

  if (isAskingVideo) {
    const targetProd = matchedProd || products.find(p => p.videos && p.videos.length > 0) || products[0];
    const availableVideos = targetProd?.videos || [];
    const targetVideo = availableVideos[0] || products.flatMap(p => p.videos || [])[0];

    if (targetVideo) {
      let vidReply = `تفضل، هذا مقطع الفيديو التوضيحي المعتمد لـ **${targetVideo.title}** 🎬✨\n\n`;
      vidReply += `يمكنك الضغط على زر التشغيل المباشر لمشاهدة الفيديو فوراً داخل هذه الرسالة.\n\n`;
      vidReply += `هل تود أن أوضح لك أسرار الاستخدام، أو معرفة أسعار باقة البداية المعتمدة؟`;

      return {
        content: vidReply,
        recommendedProductIds: [targetProd.id],
        recommendedImageIds: [],
        recommendedVideoIds: [targetVideo.id],
        recommendedDocIds: [],
        suggestedQuestions: filterQuestions([
          `كم سعر ${targetProd.name} بالريال والدولار؟`,
          `كيف يُعد ${targetProd.name} في 90 ثانية؟`,
          'ما هي النصائح الذهبية للحصول على أسرع نتيجة؟',
          'كيف أطلب هذا المنتج والتوصيل الآن؟',
        ]),
      };
    }
  }

  // 1. User Specifically Asking for Image / Photo (مثلاً: "اريد صورة المنتج", "ورني صورته", "صورة الشاي")
  const isAskingImage =
    q.includes('صورة') ||
    q.includes('صور') ||
    q.includes('صورتها') ||
    q.includes('صورته') ||
    q.includes('شكل') ||
    q.includes('شكله') ||
    q.includes('صوره') ||
    q.includes('photo') ||
    q.includes('image') ||
    q.includes('ورني') ||
    q.includes('اشوف');

  if (isAskingImage) {
    const targetProd = matchedProd || products[0];
    const recImgIds: string[] = [];
    if (targetProd.images && targetProd.images.length > 0) {
      targetProd.images.forEach((im) => recImgIds.push(im.id));
    } else if (targetProd.imageUrl) {
      recImgIds.push(`img-${targetProd.id}-main`);
    }

    let imgReply = `تفضل، هذه صورة **${targetProd.name}** التوضيحية بجودة فائقة الدقة 📸✨\n\n`;
    imgReply += `هل تود معرفة تفاصيل أكثر عن فوائده، طريقة استخدامه، أو سعره المعتمد؟`;

    const recVidIds = (targetProd.videos || []).map((v) => v.id);

    return {
      content: imgReply,
      recommendedProductIds: [],
      recommendedImageIds: recImgIds,
      recommendedVideoIds: recVidIds.slice(0, 1),
      recommendedDocIds: [],
      suggestedQuestions: filterQuestions([
        `كم سعر ${targetProd.name} بالتفصيل؟`,
        'ما هي طريقة الاستخدام الصحيحة؟',
        'هل توجد فيديوهات توضيحية لتجارب العملاء؟',
        'ما هي الممنوعات أثناء استخدامه؟',
      ]),
    };
  }

  // 2. User Specifically Asking for Documents / Clinical Studies / Certifications / PDF
  const isAskingDocs =
    q.includes('مستند') ||
    q.includes('مستندات') ||
    q.includes('ملف') ||
    q.includes('ملفات') ||
    q.includes('دراسة') ||
    q.includes('دراسات') ||
    q.includes('بحث') ||
    q.includes('ابحاث') ||
    q.includes('pdf') ||
    q.includes('شهادة') ||
    q.includes('بروشور');

  if (isAskingDocs) {
    const targetProd = matchedProd || products.find((p) => p.docs && p.docs.length > 0) || products[0];
    const docs = targetProd.docs || [];

    let docReply = `أهلاً بك! نعتز جداً بالأسس العلمية والأبحاث السريرية المعتمدة التي تدعم منتجات هيربولايف 🔬✨\n\n`;
    docReply += `فيما يخص **${targetProd.name}**، جميع المكونات مصنعة وفق أعلى معايير الجودة العالمية ومعتمدة لدى هيئات الغذاء والدواء في أكثر من 90 دولة:\n\n`;
    if (docs.length > 0) {
      docs.forEach((doc) => {
        if (doc.extractedText) {
          docReply += `🌿 **الأدلة السريرية المعتمدة:** ${doc.extractedText}\n\n`;
        }
      });
    }
    docReply += `نحن نحرص على تقديم أفضل تغذية خلوية متوازنة تدعم نشاطك وصحتك اليومية بكل أمان وثقة. هل تود معرفة تفاصيل المكونات أو طريقة الاستخدام؟`;

    return {
      content: docReply,
      recommendedProductIds: [],
      recommendedDocIds: [],
      recommendedImageIds: (targetProd.images || []).map((im) => im.id).slice(0, 1),
      recommendedVideoIds: [],
      suggestedQuestions: filterQuestions([
        `ما هي طريقة إعداد ${targetProd.name} بالخطوات؟`,
        `كم سعر ${targetProd.name} بالريال السعودي والدولار؟`,
        'ما هي الممنوعات والبدائل مع هذا المنتج؟',
      ]),
    };
  }

  // 1. Price Inquiries (السعر، أسعار، بكم، دولار، ريال، يمني، سعودي)
  const isAskingPrice =
    q.includes('سعر') ||
    q.includes('أسعار') ||
    q.includes('اسعار') ||
    q.includes('بكم') ||
    q.includes('تكلفة') ||
    q.includes('دولار') ||
    q.includes('يمني') ||
    q.includes('سعودي') ||
    q.includes('ريال') ||
    q.includes('عملة') ||
    q.includes('قيمة') ||
    q.includes('فلوس');

  if (isAskingPrice) {
    let priceText = `أهلاً بك! يسعدني جداً توضيح قائمة أسعار منتجاتنا المعتمدة بالعملات الثلاث الرسمية:\n\n`;
    const recProdIds: string[] = [];
    const recImgIds: string[] = [];

    products.forEach((prod) => {
      recProdIds.push(prod.id);
      if (prod.images && prod.images.length > 0) {
        recImgIds.push(prod.images[0].id);
      }
      priceText += `🔹 **${prod.name}**:\n`;
      if (prod.priceSAR) priceText += `  - 🇸🇦 بالريال السعودي: **${prod.priceSAR}**\n`;
      if (prod.priceUSD) priceText += `  - 💵 بالدولار الأمريكي: **${prod.priceUSD}**\n`;
      if (prod.priceYER) priceText += `  - 🇾🇪 بالريال اليمني (عملة جديدة): **${prod.priceYER}**\n`;
      else if (prod.priceIQD) priceText += `  - 🇾🇪 بالريال اليمني (عملة جديدة): **${prod.priceIQD.replace('د.ع', 'ر.ي')}**\n`;
      if (!prod.priceYER && !prod.priceIQD && !prod.priceSAR && !prod.priceUSD && prod.price) {
        priceText += `  - السعر المعتمد: **${prod.price}**\n`;
      }
      priceText += `\n`;
    });

    priceText += `✨ جميع منتجاتنا معتمدة وأصلية 100% مع ضمان الجودة العالية. يمكنك الضغط على أي منتج أدناه لمعرفة مكوناته وطريقة استخدامه والتوصيل إلى مدينتك.`;

    return {
      content: priceText,
      recommendedProductIds: recProdIds.slice(0, 4),
      recommendedImageIds: recImgIds.slice(0, 3),
      recommendedVideoIds: [],
      suggestedQuestions: filterQuestions([
        'كيف أطلب باقة الفطور المتوازن (شيك + شاي + صبار)؟',
        'هل يوجد خصم خاص عند طلب كورس لمدة شهر؟',
        'ما هي طريقة الاستخدام الصحيحة لنزول الوزن؟',
        'أريد رؤية صور منتجات باقة الفطور المتوازن',
      ]),
    };
  }

  // 3. Dynamic Product Matching (لأي منتج مضاف حديثاً أو موجود في قاعدة المعرفة)
  if (matchedProd) {
    let prodText = `أهلاً بك! يسعدني إعطاؤك التفاصيل الكاملة عن **${matchedProd.name}**:\n\n`;
    prodText += `${matchedProd.fullDesc || matchedProd.shortDesc || 'منتج متميز ضمن برنامج التغذية ونمط الحياة الصحي المتوازن.'}\n\n`;

    if (matchedProd.benefits && matchedProd.benefits.length > 0) {
      prodText += `🌟 **أبرز الفوائد والنتائج الإقناعية:**\n`;
      matchedProd.benefits.forEach((b) => {
        if (b.trim()) prodText += `  * ${b}\n`;
      });
      prodText += `\n`;
    }

    if (matchedProd.usageInstructions) {
      prodText += `📋 **طريقة الاستخدام:** ${matchedProd.usageInstructions}\n\n`;
    }

    prodText += `💰 **الأسعار بالعملات الثلاث المعتمدة:**\n`;
    if (matchedProd.priceSAR) prodText += `  - 🇸🇦 بالريال السعودي: **${matchedProd.priceSAR}**\n`;
    if (matchedProd.priceUSD) prodText += `  - 💵 بالدولار الأمريكي: **${matchedProd.priceUSD}**\n`;
    if (matchedProd.priceYER) prodText += `  - 🇾🇪 بالريال اليمني (عملة جديدة): **${matchedProd.priceYER}**\n`;
    else if (matchedProd.priceIQD) prodText += `  - 🇾🇪 بالريال اليمني (عملة جديدة): **${matchedProd.priceIQD.replace('د.ع', 'ر.ي')}**\n`;
    if (!matchedProd.priceYER && !matchedProd.priceIQD && !matchedProd.priceSAR && !matchedProd.priceUSD && matchedProd.price) {
      prodText += `  - السعر: **${matchedProd.price}**\n`;
    }

    const recImgIds = (matchedProd.images || []).map((img) => img.id);
    const recVidIds = (matchedProd.videos || []).map((vid) => vid.id);

    return {
      content: prodText,
      recommendedProductIds: [],
      recommendedImageIds: recImgIds.slice(0, 2),
      recommendedVideoIds: recVidIds.slice(0, 2),
      recommendedDocIds: [],
      suggestedQuestions: filterQuestions([
        `ما هي طريقة إعداد ${matchedProd.name} بالتفصيل؟`,
        `ما هي أبرز فوائد ${matchedProd.name} لصحة الجسم؟`,
        'ما هي الأسعار المعتمدة بالريال اليمني والسعودي والدولار؟',
        'ما هي الممنوعات والبدائل لهذا المنتج؟',
      ]),
    };
  }

  if (q.includes('وزن') || q.includes('تخسيس') || q.includes('تنحيف') || q.includes('كيلو') || q.includes('كرش')) {
    const f1Prod = products.find(p => p.id === 'prod-f1' || p.name.includes('فورمولا 1') || p.name.includes('شيك'));
    const teaProd = products.find(p => p.id === 'prod-tea' || p.name.includes('شاي'));
    
    const recProdIds = [f1Prod?.id, teaProd?.id].filter(Boolean) as string[];
    const recImgIds: string[] = [];
    const recVidIds: string[] = [];

    if (f1Prod) {
      if (f1Prod.imageUrl) recImgIds.push(`img-${f1Prod.id}-main`);
      if (f1Prod.videos?.length) recVidIds.push(f1Prod.videos[0].id);
    }
    if (teaProd) {
      if (teaProd.imageUrl) recImgIds.push(`img-${teaProd.id}-main`);
      if (teaProd.videos?.length) recVidIds.push(teaProd.videos[0].id);
    }

    return {
      content: `أهلاً بك يا بطل! أنا متفهم تماماً لرغبتك الصادقة في الوصول لوزن مثالي وشعور لا يُوصف بالخفة والطاقة المتدفقة. 🌿✨

الكثير من أبطالنا مروا بنفس رحلتك؛ تجربة حميات قاسية وحرمان ينتهي بانتكاسة... لكن مع "برنامج الإفطار المتوازن من هيربولايف"، السر ليس في الحرمان، بل في استبدال وجبة واحدة أو اثنتين بوجبة غنية تدعم جسمك بما يحتاجه بالضبط.

${f1Prod ? `شيك **${f1Prod.name}** يمنحك شبعاً كاملاً يمتد لـ 4 ساعات مع الفيتامينات والمعادن الأساسية بسعرات حرارية منخفضة!` : 'منتجاتنا تمنحك شبعاً كاملاً وطاقة ممتازة.'} ${teaProd ? `وعند إضافة **${teaProd.name}**، ستشعر بطاقة وحرق للدهون العنيدة على مدار اليوم.` : ''}

${recImgIds.length > 0 ? '📸 لقد أرفقت لك صورة عبوة المنتج وجدول الحقائق الغذائية المعتمد لتتأكد بنفسك من نقاء المكونات وخلوها من السكريات الضارة!' : ''}
${recVidIds.length > 0 ? '🎥 كما جهزت لك مقطع فيديو يوضح كيف يعمل البرنامج؛ أنصحك بمشاهدته فوراً ليمنحك دفعة حماس حقيقية!' : ''}

كم كيلو تطمح أن نودعها سوياً في أول 30 يوماً؟`,
      recommendedProductIds: recProdIds,
      recommendedVideoIds: recVidIds,
      recommendedImageIds: recImgIds,
      suggestedQuestions: filterQuestions([
        'كيف أستخدم البرنامج لكسر ثبات الوزن؟',
        'كم سعر باقة إنقاص الوزن الكاملة؟',
        'هل توجد فيديوهات لقصص نجاح؟',
        'ما هي الممنوعات الغذائية التي يجب تجنبها؟',
      ]),
    };
  }

  if (q.includes('طاقة') || q.includes('خمول') || q.includes('تعب') || q.includes('شاي')) {
    const teaProd = products.find(p => p.id === 'prod-tea' || p.name.includes('شاي'));
    const recVidIds = (teaProd?.videos || []).map(v => v.id);

    return {
      content: `أشعر بك تماماً! الشعور بالخمول بعد وجبة الغداء أو التثاقل في بداية الصباح هو إشارة من جسمك لاحتياجه لحرق دهون نقي بدلاً من المنبهات السكرية المؤقتة. ☕⚡

الحل الساحر هو **${teaProd?.name || 'شاي الأعشاب المركز'}**. يوقظ ذهنك خلال 5 دقائق ويحفز عملية الحرق الحراري لتتحول الدهون المخزنة إلى طاقة نظيفة تدوم طوال اليوم دون أي تسارع في النبضات.

${recVidIds.length > 0 ? '🎥 شاهد هذا الفيديو القصير لمعرفة كيف يعمل الشاي على تنشيط الأيض:' : ''}`,
      recommendedProductIds: teaProd ? [teaProd.id] : [],
      recommendedVideoIds: recVidIds.slice(0, 1),
      suggestedQuestions: filterQuestions([
        'ما هي النكهات المتوفرة؟',
        'متى أفضل وقت لتناوله؟',
        'كم سعر العبوة؟',
        'هل يمكن دمج الشاي مع مشروب الصبار؟',
      ]),
    };
  }

  if (q.includes('قولون') || q.includes('هضم') || q.includes('انتفاخ') || q.includes('صبار') || q.includes('ماء')) {
    const aloeProd = products.find(p => p.id === 'prod-aloe' || p.name.includes('صبار'));
    const recVidIds = (aloeProd?.videos || []).map(v => v.id);

    return {
      content: `سلامتك ألف سلامة! الجهاز الهضمي هو "الدماغ الثاني" لجسم الإنسان، وعندما يكون مرتاحاً، تشعر براحة وسكينة وصفاء ذهني مدهش. 🍃

إليك سر الراحة الهضمية: **${aloeProd?.name || 'مشروب الصبار المركز'}**. قطرات قليلة منه في كوب الماء صباحاً تمنح أمعاءك حماماً مهدئاً يزيل الانتفاخ، يريح القولون، ويعزز امتصاص المغذيات المفيدة.

${recVidIds.length > 0 ? '🎥 أعددت لك فيديو يوضح كيف ودع عملاؤنا مشاكل الانتفاخ وثقل البطن:' : ''}`,
      recommendedProductIds: aloeProd ? [aloeProd.id] : [],
      recommendedVideoIds: recVidIds.slice(0, 1),
      suggestedQuestions: filterQuestions([
        'كيف يساعد في تهدئة القولون؟',
        'ما هي طريقة شربه مع الماء؟',
        'كم سعر العبوة؟',
      ]),
    };
  }

  if (q.includes('بروتين') || q.includes('عضل') || q.includes('جوع') || q.includes('سناك') || q.includes('شبع')) {
    const pdmProd = products.find(p => p.id === 'prod-pdm' || p.name.includes('بروتين') || p.name.includes('PDM'));
    const f1Prod = products.find(p => p.id === 'prod-f1' || p.name.includes('شيك'));
    const recVidIds = (pdmProd?.videos || []).map(v => v.id);

    return {
      content: `سؤال ذكي جداً ومن قلب علم التغذية المتوازنة! 🏆

عندما يرغب الجسم في التخلص من الدهون مع المحافظة على قوام مشدود وبشرة نضرة خالية من الترهل، فإن السر هو كمية ونوعية البروتين.
هنا يأتي دور **${pdmProd?.name || 'بروتين PDM'}**؛ يمنحك بروتيناً نقياً بدون سكر إضافي. ${f1Prod ? `وعند دمجه مع **${f1Prod.name}**، ستحصل على وجبة مشبعة كالحديد تقطع أي رغبة في السكريات تماماً!` : ''}

${recVidIds.length > 0 ? '🎥 شاهد هذا الفيديو لمعرفة سر الشبع الفولاذي:' : ''}`,
      recommendedProductIds: [pdmProd?.id, f1Prod?.id].filter(Boolean) as string[],
      recommendedVideoIds: recVidIds.slice(0, 1),
      suggestedQuestions: filterQuestions([
        'كيف أدمج البروتين مع الشيك؟',
        'هل يساعد في شد الترهلات؟',
        'كم سعر عبوة البروتين؟',
      ]),
    };
  }

  // General default warm response
  const defaultRecProdIds = products.slice(0, 3).map(p => p.id);
  const allVideos = products.flatMap(p => p.videos || []);
  const defaultRecVidIds = allVideos.slice(0, 1).map(v => v.id);

  const fallbackQuestions = [
    '🎯 أريد خطة خسارة 10 كيلو بدون حرمان',
    '🌿 ما هو سر راحة القولون والتخلص من الانتفاخ؟',
    '⚡ كيف أزيد طاقتي اليومية وأحرق الدهون المتراكمة؟',
    '💰 ما هي أسعار المنتجات المعتمدة بالريال والدولار؟',
  ];

  if (allVideos.length > 0) {
    fallbackQuestions.push('🎥 هل توجد فيديوهات لقصص نجاح؟');
  }

  return {
    content: `مرحباً بك في عالم الصحة والحيوية مع هيربولايف! 🌿✨

أنا مستشارك الصحي والتغذوي المعتمد. هدفي ليس فقط تزويدك بأفضل المكملات والوجبات الغذائية المعتمدة عالمياً، بل رسم خطة حياة تناسب أهدافك الخاصة: سواء كنت ترغب في إنقاص الوزن، زيادة طاقتك وحيويتك، دعم صحة جهازك الهضمي، أو شد قوامك وبناء عضلات صحية.

ما هو الهدف الصحي الأهم بالنسبة لك الذي تود أن نعمل عليه اليوم معاً؟ 🎯`,
    recommendedProductIds: defaultRecProdIds,
    recommendedVideoIds: defaultRecVidIds,
    suggestedQuestions: filterQuestions(fallbackQuestions),
  };
}
