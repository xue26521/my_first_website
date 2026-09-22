/* 离线中英双向词典 · 效率小工具箱
 * 数据格式：[中文, 英文]，查找时自动建双向索引
 * 收录原则：日常高频词为主，持续补充
 */
const DICT = [
  // ── 问候与日常用语 ──
  ["你好", "hello"], ["您好", "hello"], ["早上好", "good morning"], ["晚上好", "good evening"],
  ["下午好", "good afternoon"], ["晚安", "good night"], ["再见", "goodbye"], ["拜拜", "bye"],
  ["谢谢", "thank you"], ["感谢", "thanks"], ["不客气", "you are welcome"], ["对不起", "sorry"],
  ["抱歉", "sorry"], ["没关系", "it does not matter"], ["请", "please"], ["打扰了", "excuse me"],
  ["欢迎", "welcome"], ["祝贺", "congratulations"], ["加油", "keep it up"], ["祝你好运", "good luck"],
  ["生日快乐", "happy birthday"], ["新年快乐", "happy new year"], ["是的", "yes"], ["不是", "no"],
  ["好的", "ok"], ["没问题", "no problem"], ["当然", "of course"], ["也许", "maybe"], ["真的吗", "really"],

  // ── 人称与家庭 ──
  ["我", "I"], ["你", "you"], ["他", "he"], ["她", "she"], ["它", "it"],
  ["我的", "my"], ["你的", "your"], ["他的", "his"], ["她的", "her"],
  ["我们", "we"], ["你们", "you"], ["他们", "they"], ["大家", "everyone"],
  ["爸爸", "dad"], ["妈妈", "mom"], ["父亲", "father"], ["母亲", "mother"],
  ["儿子", "son"], ["女儿", "daughter"], ["兄弟", "brother"], ["姐妹", "sister"],
  ["爷爷", "grandpa"], ["奶奶", "grandma"], ["丈夫", "husband"], ["妻子", "wife"],
  ["朋友", "friend"], ["家人", "family"], ["孩子", "child"], ["孩子们", "children"],
  ["男孩", "boy"], ["女孩", "girl"], ["男人", "man"], ["女人", "woman"], ["人们", "people"],

  // ── 数字 ──
  ["零", "zero"], ["一", "one"], ["二", "two"], ["三", "three"], ["四", "four"],
  ["五", "five"], ["六", "six"], ["七", "seven"], ["八", "eight"], ["九", "nine"],
  ["十", "ten"], ["百", "hundred"], ["千", "thousand"], ["万", "ten thousand"], ["亿", "hundred million"],
  ["第一", "first"], ["第二", "second"], ["第三", "third"], ["许多", "many"], ["一些", "some"],
  ["所有", "all"], ["一半", "half"], ["几个", "several"], ["没有", "none"],

  // ── 时间与日期 ──
  ["今天", "today"], ["明天", "tomorrow"], ["昨天", "yesterday"], ["现在", "now"],
  ["早上", "morning"], ["上午", "morning"], ["中午", "noon"], ["下午", "afternoon"],
  ["晚上", "evening"], ["夜晚", "night"], ["周末", "weekend"], ["星期", "week"],
  ["星期一", "Monday"], ["星期二", "Tuesday"], ["星期三", "Wednesday"], ["星期四", "Thursday"],
  ["星期五", "Friday"], ["星期六", "Saturday"], ["星期日", "Sunday"], ["星期天", "Sunday"],
  ["一月", "January"], ["二月", "February"], ["三月", "March"], ["四月", "April"],
  ["五月", "May"], ["六月", "June"], ["七月", "July"], ["八月", "August"],
  ["九月", "September"], ["十月", "October"], ["十一月", "November"], ["十二月", "December"],
  ["年", "year"], ["月", "month"], ["天", "day"], ["日", "day"], ["小时", "hour"], ["分钟", "minute"],
  ["秒", "second"], ["时间", "time"], ["日期", "date"], ["生日", "birthday"], ["假期", "holiday"],
  ["春天", "spring"], ["夏天", "summer"], ["秋天", "autumn"], ["冬天", "winter"],

  // ── 食物与饮料 ──
  ["水", "water"], ["茶", "tea"], ["咖啡", "coffee"], ["牛奶", "milk"], ["果汁", "juice"],
  ["米饭", "rice"], ["面条", "noodles"], ["面包", "bread"], ["鸡蛋", "egg"], ["牛奶", "milk"],
  ["肉", "meat"], ["牛肉", "beef"], ["猪肉", "pork"], ["鸡肉", "chicken"], ["鱼", "fish"],
  ["蔬菜", "vegetable"], ["水果", "fruit"], ["苹果", "apple"], ["香蕉", "banana"],
  ["橙子", "orange"], ["西瓜", "watermelon"], ["葡萄", "grape"], ["草莓", "strawberry"],
  ["蛋糕", "cake"], ["糖", "sugar"], ["盐", "salt"], ["早餐", "breakfast"],
  ["午餐", "lunch"], ["晚餐", "dinner"], ["食物", "food"], ["饮料", "drink"], ["餐厅", "restaurant"],

  // ── 颜色 ──
  ["红色", "red"], ["蓝色", "blue"], ["绿色", "green"], ["黄色", "yellow"], ["黑色", "black"],
  ["白色", "white"], ["紫色", "purple"], ["粉色", "pink"], ["橙色", "orange"], ["灰色", "gray"],
  ["棕色", "brown"], ["颜色", "color"],

  // ── 天气与自然 ──
  ["天气", "weather"], ["晴天", "sunny"], ["阴天", "cloudy"], ["下雨", "rainy"], ["雨", "rain"],
  ["雪", "snow"], ["风", "wind"], ["云", "cloud"], ["太阳", "sun"], ["月亮", "moon"],
  ["星星", "star"], ["天空", "sky"], ["山", "mountain"], ["河", "river"], ["湖", "lake"],
  ["海", "sea"], ["树", "tree"], ["花", "flower"], ["草", "grass"], ["温度", "temperature"],

  // ── 出行与地点 ──
  ["家", "home"], ["房子", "house"], ["学校", "school"], ["公司", "company"], ["医院", "hospital"],
  ["商店", "shop"], ["超市", "supermarket"], ["公园", "park"], ["机场", "airport"],
  ["车站", "station"], ["酒店", "hotel"], ["城市", "city"], ["国家", "country"], ["中国", "China"],
  ["北京", "Beijing"], ["上海", "Shanghai"], ["世界", "world"], ["地图", "map"], ["路", "road"],
  ["汽车", "car"], ["公交车", "bus"], ["火车", "train"], ["飞机", "plane"], ["自行车", "bike"],
  ["地铁", "subway"], ["出租车", "taxi"], ["旅行", "travel"], ["票", "ticket"], ["行李", "luggage"],

  // ── 学习与工作 ──
  ["学习", "study"], ["工作", "work"], ["老师", "teacher"], ["学生", "student"],
  ["同学", "classmate"], ["同事", "colleague"], ["老板", "boss"], ["经理", "manager"],
  ["书", "book"], ["笔", "pen"], ["纸", "paper"], ["作业", "homework"], ["考试", "exam"],
  ["课程", "course"], ["教室", "classroom"], ["办公室", "office"], ["会议", "meeting"],
  ["邮件", "email"], ["信", "letter"], ["问题", "question"], ["答案", "answer"],
  ["知识", "knowledge"], ["语言", "language"], ["英语", "English"], ["中文", "Chinese"],
  ["单词", "word"], ["句子", "sentence"], ["阅读", "reading"], ["写作", "writing"],

  // ── 科技与网络 ──
  ["电脑", "computer"], ["手机", "phone"], ["电话", "telephone"], ["网络", "internet"],
  ["网站", "website"], ["软件", "software"], ["程序", "program"], ["代码", "code"],
  ["数据", "data"], ["文件", "file"], ["照片", "photo"], ["视频", "video"], ["音乐", "music"],
  ["游戏", "game"], ["电影", "movie"], ["密码", "password"], ["屏幕", "screen"],
  ["键盘", "keyboard"], ["鼠标", "mouse"], ["机器人", "robot"], ["人工智能", "artificial intelligence"],

  // ── 身体与健康 ──
  ["头", "head"], ["眼睛", "eye"], ["耳朵", "ear"], ["鼻子", "nose"], ["嘴", "mouth"],
  ["手", "hand"], ["脚", "foot"], ["身体", "body"], ["健康", "health"], ["医生", "doctor"],
  ["护士", "nurse"], ["药", "medicine"], ["运动", "exercise"], ["跑步", "running"],
  ["游泳", "swimming"], ["睡觉", "sleep"], ["累", "tired"], ["生病", "sick"],

  // ── 常用动词 ──
  ["是", "is"], ["有", "have"], ["做", "do"], ["去", "go"], ["来", "come"],
  ["看", "look"], ["看见", "see"], ["听", "listen"], ["说", "say"], ["说话", "speak"],
  ["读", "read"], ["写", "write"], ["吃", "eat"], ["喝", "drink"], ["买", "buy"],
  ["卖", "sell"], ["走", "walk"], ["跑", "run"], ["坐", "sit"], ["站", "stand"],
  ["开", "open"], ["关", "close"], ["给", "give"], ["拿", "take"], ["放", "put"],
  ["找", "find"], ["用", "use"], ["做", "make"], ["想", "think"], ["想要", "want"],
  ["需要", "need"], ["喜欢", "like"], ["爱", "love"], ["讨厌", "hate"], ["知道", "know"],
  ["明白", "understand"], ["学习", "learn"], ["教", "teach"], ["帮助", "help"],
  ["开始", "start"], ["结束", "end"], ["停止", "stop"], ["等待", "wait"], ["工作", "work"],
  ["玩", "play"], ["笑", "laugh"], ["哭", "cry"], ["唱", "sing"], ["跳舞", "dance"],
  ["生活", "live"], ["住", "live"], ["叫", "call"], ["问", "ask"], ["回答", "answer"],
  ["记得", "remember"], ["忘记", "forget"], ["选择", "choose"], ["希望", "hope"],
  ["感觉", "feel"], ["相信", "believe"], ["改变", "change"], ["尝试", "try"],
  ["成功", "succeed"], ["失败", "fail"], ["赢", "win"], ["输", "lose"], ["支付", "pay"],
  ["发送", "send"], ["接收", "receive"], ["打开", "turn on"], ["关闭", "turn off"],

  // ── 常用形容词 ──
  ["好", "good"], ["坏", "bad"], ["大", "big"], ["小", "small"], ["多", "many"],
  ["少", "few"], ["长", "long"], ["短", "short"], ["高", "tall"], ["矮", "short"],
  ["快", "fast"], ["慢", "slow"], ["新", "new"], ["旧", "old"], ["老", "old"],
  ["年轻", "young"], ["热", "hot"], ["冷", "cold"], ["暖和", "warm"], ["凉爽", "cool"],
  ["高兴", "happy"], ["开心", "happy"], ["难过", "sad"], ["生气", "angry"], ["害怕", "afraid"],
  ["紧张", "nervous"], ["兴奋", "excited"], ["无聊", "bored"], ["有趣", "interesting"],
  ["困难", "difficult"], ["容易", "easy"], ["简单", "simple"], ["重要", "important"],
  ["美丽", "beautiful"], ["漂亮", "pretty"], ["丑", "ugly"], ["干净", "clean"], ["脏", "dirty"],
  ["便宜", "cheap"], ["贵", "expensive"], ["免费", "free"], ["忙", "busy"], ["空闲", "free"],
  ["很", "very"], ["很好", "very good"], ["一个", "a"], ["编程", "programming"],
  ["饿", "hungry"], ["渴", "thirsty"], ["饱", "full"], ["对", "right"], ["错", "wrong"],
  ["真", "true"], ["假", "false"], ["安全", "safe"], ["危险", "dangerous"],
  ["强", "strong"], ["弱", "weak"], ["聪明", "smart"], ["可爱", "cute"], ["友好", "friendly"],

  // ── 常用名词与其他 ──
  ["名字", "name"], ["钱", "money"], ["价格", "price"], ["东西", "thing"], ["事情", "thing"],
  ["地方", "place"], ["方法", "method"], ["主意", "idea"], ["故事", "story"], ["新闻", "news"],
  ["生活", "life"], ["梦", "dream"], ["心", "heart"], ["声音", "sound"], ["光", "light"],
  ["礼物", "gift"], ["节日", "festival"], ["动物", "animal"], ["猫", "cat"], ["狗", "dog"],
  ["鸟", "bird"], ["马", "horse"], ["左边", "left"], ["右边", "right"], ["上面", "up"],
  ["下面", "down"], ["前面", "front"], ["后面", "back"], ["里面", "inside"], ["外面", "outside"],
  ["这里", "here"], ["那里", "there"], ["哪里", "where"], ["什么", "what"], ["谁", "who"],
  ["为什么", "why"], ["怎么", "how"], ["多少", "how much"], ["什么时候", "when"],
  ["和", "and"], ["或者", "or"], ["但是", "but"], ["因为", "because"], ["所以", "so"],
  ["如果", "if"], ["非常", "very"], ["太", "too"], ["也", "also"], ["都", "all"],
  ["再", "again"], ["一起", "together"], ["已经", "already"], ["总是", "always"],
  ["经常", "often"], ["有时", "sometimes"], ["从不", "never"], ["每个", "every"],
];

/* 构建双向查找索引（中文→英文、英文→中文）
 * 英文键统一小写，查找时大小写不敏感
 */
const ZH2EN = new Map();
const EN2ZH = new Map();
for (const [zh, en] of DICT) {
  if (!ZH2EN.has(zh)) ZH2EN.set(zh, en);
  const key = en.toLowerCase();
  if (!EN2ZH.has(key)) EN2ZH.set(key, zh);
}
