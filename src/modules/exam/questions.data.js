export const QUESTION_CATEGORIES = [
  { id: "intro", label: "1. Giới thiệu bản thân (Câu 1)" },
  { id: "description", label: "2. Miêu tả & Thói quen (Combo 1-2)" },
  { id: "memory", label: "3. Kỷ niệm đáng nhớ / Quá khứ (Combo 3)" },
  { id: "roleplay", label: "4. Role-Playing (Đóng vai 11-12-13)" },
  { id: "advanced", label: "5. Nâng cao / So sánh (Band IH - AL)" },
];

export const OPIC_TOPICS = [
  { id: "general", label: "Giới thiệu chung" },
  { id: "work_school", label: "Công việc & Học tập" },
  { id: "home", label: "Nhà ở & Hàng xóm" },
  { id: "park", label: "Công viên (Parks)" },
  { id: "cafe", label: "Quán Cafe & Nhà hàng" },
  { id: "travel", label: "Du lịch (Travel)" },
  { id: "shopping", label: "Mua sắm & Công nghệ" },
  { id: "music_movie", label: "Âm nhạc & Phim ảnh" },
  { id: "sports", label: "Thể thao & Sức khỏe" },
];

export const OPIC_QUESTIONS = [
  // ================= 1. GIỚI THIỆU BẢN THÂN =================
  {
    id: "intro_1",
    category: "intro",
    topic: "general",
    comboStep: 1,
    title: "Câu 1: Giới thiệu bản thân (Bắt buộc mọi đề)",
    question:
      "Let's start the interview now. Tell me something about yourself. What do you do for a living, or what do you study, and what do you enjoy doing in your free time?",
    tipsVi:
      "Trả lời 45-60s gồm 4 ý: Tên/nghề nghiệp -> Nơi ở -> Sở thích (khớp Survey) -> Tâm thế thoải mái.",
  },

  // ================= 2. CÔNG VIỆC & HỌC TẬP =================
  {
    id: "work_1",
    category: "description",
    topic: "work_school",
    comboStep: 1,
    title: "[Công việc/Học tập - Combo 1] Nơi làm việc hoặc trường học",
    question:
      "You indicated that you work or go to school. Tell me about your workplace or school. Where is it located, what does it look like, and what do you like most about it?",
    tipsVi:
      "Dùng Hiện tại đơn. Miêu tả vị trí, cơ sở vật chất, đồng nghiệp/bạn học và lý do yêu thích.",
  },
  {
    id: "work_2",
    category: "description",
    topic: "work_school",
    comboStep: 2,
    title: "[Công việc/Học tập - Combo 2] Lịch trình một ngày làm việc/học tập",
    question:
      "Walk me through a typical day at your job or school from the time you arrive until the time you go home.",
    tipsVi:
      "Kể theo thứ tự thời gian (In the morning -> At noon -> In the afternoon).",
  },
  {
    id: "work_3",
    category: "memory",
    topic: "work_school",
    comboStep: 3,
    title:
      "[Công việc/Học tập - Combo 3] Kỷ niệm ngày đầu tiên / Dự án đáng nhớ",
    question:
      "Tell me about a memorable project you worked on or your very first day at your current job or school. What happened and how did you feel?",
    tipsVi:
      "Chia thì Quá khứ đơn/tiếp diễn. Kể bối cảnh -> Khó khăn/Sự kiện -> Kết quả & cảm xúc.",
  },

  // ================= 3. NHÀ Ở & HÀNG XÓM =================
  {
    id: "home_1",
    category: "description",
    topic: "home",
    comboStep: 1,
    title: "[Nhà ở - Combo 1] Miêu tả ngôi nhà / căn hộ của bạn",
    question:
      "Tell me about the place where you currently live. What kind of house or apartment is it, what is your favorite room, and what is your neighborhood like?",
    tipsVi:
      "Nêu loại nhà, số phòng, miêu tả chi tiết căn phòng yêu thích và khu phố xung quanh.",
  },
  {
    id: "home_2",
    category: "description",
    topic: "home",
    comboStep: 2,
    title: "[Nhà ở - Combo 2] Việc nhà & Sinh hoạt tại nhà",
    question:
      "What kind of household chores or activities do you usually do at home on weekends? Who helps you with them?",
    tipsVi:
      "Nêu các việc hay làm (lau dọn, nấu ăn, giặt giũ), tần suất và chia sẻ với ai.",
  },
  {
    id: "home_3",
    category: "memory",
    topic: "home",
    comboStep: 3,
    title: "[Nhà ở - Combo 3] Kỷ niệm đáng nhớ với hàng xóm / chuyển nhà",
    question:
      "Tell me about a memorable moment you had with your neighbors or a memorable experience when moving into a new home.",
    tipsVi:
      "Dùng thì quá khứ kể 1 sự kiện cụ thể với hàng xóm hoặc ngày chuyển nhà.",
  },

  // ================= 4. CÔNG VIÊN (PARKS) =================
  {
    id: "park_1",
    category: "description",
    topic: "park",
    comboStep: 1,
    title: "[Công viên - Combo 1] Miêu tả công viên bạn hay đến",
    question:
      "You indicated in the survey that you like going to parks. Tell me about a park you often visit. Where is it located, what does it look like, and what facilities does it have?",
    tipsVi:
      "Miêu tả vị trí -> Không gian (cây xanh, hồ nước, đường chạy bộ) -> Không khí.",
  },
  {
    id: "park_2",
    category: "description",
    topic: "park",
    comboStep: 2,
    title: "[Công viên - Combo 2] Thói quen & Hoạt động tại công viên",
    question:
      "What do you usually do when you go to the park? Do you usually go alone or with other people? Walk me through your typical visit.",
    tipsVi: "Kể theo trình tự thời gian, người đi cùng và cảm giác thư giãn.",
  },
  {
    id: "park_3",
    category: "memory",
    topic: "park",
    comboStep: 3,
    title: "[Công viên - Combo 3] Kỷ niệm đáng nhớ ở công viên",
    question:
      "Tell me about a memorable experience or an unexpected event that happened while you were at a park. What happened, who were you with, and how did you feel?",
    tipsVi:
      "BẮT BUỘC chia thì Quá khứ. Cấu trúc: Bối cảnh -> Sự việc bất ngờ -> Cảm xúc.",
  },

  // ================= 5. QUÁN CAFE & NHÀ HÀNG =================
  {
    id: "cafe_1",
    category: "description",
    topic: "cafe",
    comboStep: 1,
    title: "[Quán Cafe - Combo 1] Miêu tả quán cafe yêu thích",
    question:
      "Tell me about a favorite café or restaurant you like to go to. What does it look like, what kind of food or drinks do they serve, and why do you enjoy going there?",
    tipsVi: "Miêu tả không gian, món tủ hay gọi và lý do bạn chọn quán đó.",
  },
  {
    id: "cafe_2",
    category: "description",
    topic: "cafe",
    comboStep: 2,
    title: "[Quán Cafe - Combo 2] Thói quen đi ăn uống / uống cafe",
    question:
      "How often do you go to cafés or restaurants, and who do you usually go with? What do you usually do while you are there?",
    tipsVi:
      "Tần suất, đi cùng ai (đồng nghiệp/bạn bè), làm gì (nói chuyện, làm việc trên laptop).",
  },
  {
    id: "cafe_3",
    category: "memory",
    topic: "cafe",
    comboStep: 3,
    title: "[Quán Cafe - Combo 3] Kỷ niệm đáng nhớ tại quán ăn/cafe",
    question:
      "Have you ever had a really memorable experience—either good or bad—at a café or restaurant? Tell me everything that happened from beginning to end.",
    tipsVi: "Kể chuyện quá khứ có mở đầu - cao trào - kết thúc.",
  },

  // ================= 6. DU LỊCH (TRAVEL) =================
  {
    id: "travel_1",
    category: "description",
    topic: "travel",
    comboStep: 1,
    title: "[Du lịch - Combo 1] Địa điểm du lịch yêu thích",
    question:
      "You mentioned you enjoy traveling. What kind of places do you prefer to visit—beaches, mountains, or big cities? Describe your ideal destination.",
    tipsVi:
      "Chọn 1 loại hình rõ ràng, miêu tả cảnh quan và lý do bạn thích nơi đó.",
  },
  {
    id: "travel_2",
    category: "description",
    topic: "travel",
    comboStep: 2,
    title: "[Du lịch - Combo 2] Thói quen chuẩn bị trước chuyến đi",
    question:
      "What do you usually do to prepare before going on a trip? What kind of things do you always pack in your suitcase?",
    tipsVi:
      "Dùng từ nối trình tự (First, Second, Finally) kể việc lên lịch trình và xếp đồ.",
  },
  {
    id: "travel_3",
    category: "memory",
    topic: "travel",
    comboStep: 3,
    title: "[Du lịch - Combo 3] Kỷ niệm chuyến đi đáng nhớ nhất",
    question:
      "Tell me about a memorable trip you took recently. Where did you go, who were you with, what did you do there, and what made it unforgettable?",
    tipsVi: "Tập trung kể 1-2 kỷ niệm nổi bật nhất bằng thì Quá khứ đơn.",
  },

  // ================= 7. MUA SẮM & CÔNG NGHỆ =================
  {
    id: "shop_1",
    category: "description",
    topic: "shopping",
    comboStep: 1,
    title: "[Mua sắm - Combo 1] Địa điểm mua sắm yêu thích",
    question:
      "Tell me about your favorite place to go shopping, or your favorite online shopping website. Why do you prefer shopping there?",
    tipsVi: "Miêu tả trung tâm thương mại hoặc sàn TMĐT, giá cả, sự tiện lợi.",
  },
  {
    id: "shop_2",
    category: "description",
    topic: "shopping",
    comboStep: 2,
    title: "[Mua sắm - Combo 2] Thói quen mua sắm & Thiết bị hay dùng",
    question:
      "How often do you go shopping, and what items do you usually buy? Do you prefer shopping alone or with friends?",
    tipsVi:
      "Kể thói quen chi tiêu, món hay mua (quần áo, đồ công nghệ) và so sánh đi 1 mình vs đi cùng bạn.",
  },
  {
    id: "shop_3",
    category: "memory",
    topic: "shopping",
    comboStep: 3,
    title: "[Mua sắm - Combo 3] Món đồ đáng nhớ nhất từng mua",
    question:
      "Tell me about the most memorable thing you have ever bought for yourself or someone else. Why did you buy it and how did it turn out?",
    tipsVi: "Kể lại bối cảnh mua món đồ đó bằng thì quá khứ và ý nghĩa của nó.",
  },

  // ================= 8. ÂM NHẠC & PHIM ẢNH =================
  {
    id: "music_1",
    category: "description",
    topic: "music_movie",
    comboStep: 1,
    title: "[Âm nhạc/Phim - Combo 1] Thể loại nhạc hoặc phim yêu thích",
    question:
      "What kind of music or movies do you enjoy the most? Who is your favorite artist or actor, and why do you like them?",
    tipsVi: "Nêu thể loại, nghệ sĩ yêu thích và lý do thu hút bạn.",
  },
  {
    id: "music_2",
    category: "description",
    topic: "music_movie",
    comboStep: 2,
    title: "[Âm nhạc/Phim - Combo 2] Thói quen nghe nhạc / xem phim",
    question:
      "When and where do you usually listen to music or watch movies? How has your taste changed since you were younger?",
    tipsVi:
      "Kết hợp Hiện tại đơn (thói quen bây giờ) và Quá khứ (hồi nhỏ thích thể loại khác ra sao).",
  },
  {
    id: "music_3",
    category: "memory",
    topic: "music_movie",
    comboStep: 3,
    title: "[Âm nhạc/Phim - Combo 3] Kỷ niệm đi xem hòa nhạc / rạp phim",
    question:
      "Tell me about a memorable concert you attended or a movie you saw at the theater that left a strong impression on you.",
    tipsVi: "Miêu tả không khí lúc đó, người đi cùng và cảm xúc đọng lại.",
  },

  // ================= 9. THỂ THAO & SỨC KHỎE =================
  {
    id: "sports_1",
    category: "description",
    topic: "sports",
    comboStep: 1,
    title: "[Thể thao - Combo 1] Môn thể thao / tập luyện yêu thích",
    question:
      "You mentioned you like exercising or playing sports. What sport or workout activity do you enjoy the most, and where do you usually do it?",
    tipsVi:
      "Miêu tả môn thể thao (chạy bộ, gym, cầu lông...), địa điểm và lợi ích sức khỏe.",
  },
  {
    id: "sports_2",
    category: "description",
    topic: "sports",
    comboStep: 2,
    title: "[Thể thao - Combo 2] Lịch trình tập luyện hàng tuần",
    question:
      "How often do you exercise in a typical week? What do you usually do to stay motivated when you feel tired or busy?",
    tipsVi:
      "Nêu lịch tập cụ thể và bí quyết giữ động lực (nghe nhạc, tập cùng bạn).",
  },
  {
    id: "sports_3",
    category: "memory",
    topic: "sports",
    comboStep: 3,
    title: "[Thể thao - Combo 3] Kỷ niệm tham gia giải đấu hoặc lần đầu tập",
    question:
      "Tell me about a memorable sports event you participated in or watched, or a funny/challenging moment when you first started working out.",
    tipsVi: "Kể lại 1 kỷ niệm cụ thể bằng thì quá khứ.",
  },

  // ================= 10. ROLE-PLAYING (CỤM 11 - 12 - 13) =================
  // --- Cụm RP 1: Công viên ---
  {
    id: "rp_park_1",
    category: "roleplay",
    topic: "park",
    rpGroup: "rp_park",
    comboStep: 1,
    title: "[Role-play 11 - Công viên] Hỏi thông tin thuê xe đạp / dã ngoại",
    question:
      "I'd like to give you a situation and ask you to act it out. You want to organize a small picnic and rent bicycles at a national park this weekend. Call the park information center and ask 3 or 4 questions about the rules, fees, and facilities.",
    tipsVi:
      'Đóng vai nói TRỰC TIẾP với nhân viên ("Hi, I am calling to ask about..."). Hỏi 3-4 câu hỏi WH.',
  },
  {
    id: "rp_park_2",
    category: "roleplay",
    topic: "park",
    rpGroup: "rp_park",
    comboStep: 2,
    title: "[Role-play 12 - Công viên] Sự cố thời tiết khi đi dã ngoại",
    question:
      "I'm sorry, there is a problem you need to resolve. You promised to meet your friend at the park for an outdoor picnic today, but it suddenly starts raining heavily. Call your friend, explain the situation, and suggest two alternative plans.",
    tipsVi:
      'Nói trực tiếp với bạn ("Hey, I am so sorry..."). Giải thích lý do -> Đưa rõ 2 phương án thay thế.',
  },
  {
    id: "rp_park_3",
    category: "memory",
    topic: "park",
    rpGroup: "rp_park",
    comboStep: 3,
    title:
      "[Câu 13 - Công viên] Kỷ niệm ngoài đời khi kế hoạch bị hủy vì thời tiết",
    question:
      "Have you ever had an outdoor plan ruined by sudden bad weather in real life? Tell me what you had planned, what happened, and what you ended up doing.",
    tipsVi:
      "Câu 13 nối tiếp Role-play: kể 1 trải nghiệm có thật ngoài đời bằng thì Quá khứ.",
  },

  // --- Cụm RP 2: Du lịch / Khách sạn ---
  {
    id: "rp_travel_1",
    category: "roleplay",
    topic: "travel",
    rpGroup: "rp_travel",
    comboStep: 1,
    title: "[Role-play 11 - Khách sạn] Hỏi thông tin đặt phòng",
    question:
      "You are planning a vacation and want to book a hotel room. Call the hotel front desk and ask 3 or 4 questions about room availability, prices, breakfast, and check-in time.",
    tipsVi: "Đóng vai khách gọi lễ tân đặt phòng, hỏi 3-4 câu hỏi cụ thể.",
  },
  {
    id: "rp_travel_2",
    category: "roleplay",
    topic: "travel",
    rpGroup: "rp_travel",
    comboStep: 2,
    title: "[Role-play 12 - Khách sạn] Giải quyết sự cố phòng bị ồn",
    question:
      "I'm sorry, there is a problem with your hotel reservation. When you arrive, the hotel says your room is noisy and under maintenance. Explain your frustration to the front desk and ask for two possible solutions.",
    tipsVi:
      "Lịch sự nhưng dứt khoát, giải thích sự bất tiện và đề xuất 2 giải pháp (đổi phòng / hoàn tiền hoặc nâng hạng).",
  },
  {
    id: "rp_travel_3",
    category: "memory",
    topic: "travel",
    rpGroup: "rp_travel",
    comboStep: 3,
    title: "[Câu 13 - Du lịch] Kể về một sự cố ngoài đời khi đi du lịch",
    question:
      "Tell me about a time in real life when something went wrong during a trip—like a delayed flight or a hotel issue—and how you dealt with it.",
    tipsVi: "Kể 1 câu chuyện quá khứ về sự cố du lịch và cách giải quyết.",
  },

  // --- Cụm RP 3: Mua sắm / Đồ điện tử ---
  {
    id: "rp_shop_1",
    category: "roleplay",
    topic: "shopping",
    rpGroup: "rp_shop",
    comboStep: 1,
    title: "[Role-play 11 - Mua sắm] Hỏi mua điện thoại / laptop mới",
    question:
      "You want to buy a new smartphone or laptop. Call an electronics store and ask the salesperson 3 or 4 questions about the models, price, warranty, and discounts.",
    tipsVi: "Hỏi trực tiếp nhân viên bán hàng 3-4 thông tin cần thiết.",
  },
  {
    id: "rp_shop_2",
    category: "roleplay",
    topic: "shopping",
    rpGroup: "rp_shop",
    comboStep: 2,
    title: "[Role-play 12 - Mua sắm] Khiếu nại sản phẩm mới mua bị lỗi",
    question:
      "You bought a new electronic device yesterday, and when you got home, it did not turn on. Call the store manager, explain the problem, and offer two solutions you would like.",
    tipsVi:
      "Nêu rõ thời điểm mua, lỗi gặp phải và 2 phương án bạn mong muốn (đổi máy mới / hoàn tiền).",
  },
  {
    id: "rp_shop_3",
    category: "memory",
    topic: "shopping",
    rpGroup: "rp_shop",
    comboStep: 3,
    title: "[Câu 13 - Mua sắm] Kể lại lần mua phải đồ lỗi ngoài đời thực",
    question:
      "Have you ever bought something that was broken or did not work properly in real life? What was the item, what went wrong, and how did you resolve the issue?",
    tipsVi: "Kể lại trải nghiệm mua hàng lỗi ngoài đời bằng thì Quá khứ.",
  },

  // ================= 11. CÂU HỎI NÂNG CAO (14 - 15) =================
  {
    id: "adv_1",
    category: "advanced",
    topic: "park",
    title: "[Nâng cao 14] Công viên ngày xưa vs ngày nay & Không gian xanh",
    question:
      "How have the parks in your city changed compared to when you were a child? Why do you think public parks are important for people living in modern cities?",
    tipsVi:
      'So sánh Quá khứ ("Used to be...") với Hiện tại ("Nowadays..."). Nêu 2 vai trò của công viên.',
  },
  {
    id: "adv_2",
    category: "advanced",
    topic: "shopping",
    title: "[Nâng cao 15] Công nghệ thay đổi thói quen giải trí & mua sắm",
    question:
      "How has technology changed the way people shop and spend their free time compared to 10 or 20 years ago? Are there any downsides to these changes?",
    tipsVi: "So sánh xưa - nay và phân tích thêm 1-2 mặt trái của công nghệ.",
  },
  {
    id: "adv_3",
    category: "advanced",
    topic: "travel",
    title: "[Nâng cao 14] Xu hướng du lịch hiện đại vs truyền thống",
    question:
      "How has the way people travel changed over the last decade? Do you think mass tourism brings more benefits or problems to local communities?",
    tipsVi:
      "Nêu sự thay đổi (tự túc qua app, review mạng xã hội) và cân nhắc mặt lợi/hại.",
  },
  {
    id: "adv_4",
    category: "advanced",
    topic: "work_school",
    title: "[Nâng cao 15] Làm việc từ xa (Remote work) & Cân bằng cuộc sống",
    question:
      "Nowadays, many companies allow employees to work from home. What are the advantages and disadvantages of remote work compared to working in an office?",
    tipsVi:
      "Phân tích cả 2 mặt (linh hoạt thời gian vs khó giao tiếp nhóm/mất ranh giới công việc).",
  },
];
