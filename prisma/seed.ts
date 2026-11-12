import { PrismaClient } from "@prisma/client";
import { hashPassword, normalizeFullName } from "../src/lib/auth/password";

const prisma = new PrismaClient();

async function main() {
  const existingSubjects = await prisma.subject.count();
  if (existingSubjects > 0) {
    console.log("Database already seeded, skipping.");
    return;
  }

  const admin = await prisma.user.create({
    data: {
      fullNameKey: normalizeFullName("Azizbek", "Karimov"),
      firstName: "Azizbek",
      lastName: "Karimov",
      passwordHash: hashPassword("admin123"),
      role: "ADMIN",
      status: "APPROVED",
      preferredLang: "uz",
    },
  });

  const member = await prisma.user.create({
    data: {
      fullNameKey: normalizeFullName("Myrat", "Gurbanow"),
      firstName: "Myrat",
      lastName: "Gurbanow",
      passwordHash: hashPassword("talaba123"),
      role: "MEMBER",
      status: "APPROVED",
      preferredLang: "tk",
    },
  });

  const math = await prisma.subject.create({
    data: {
      slug: "matematika",
      nameUz: "Matematika",
      nameTk: "Matematika",
      descriptionUz: "Oliy matematika, chiziqli algebra va analiz",
      descriptionTk: "Ýokary matematika, çyzykly algebra we analiz",
      icon: "Calculator",
      color: "#3b82f6",
      sortOrder: 1,
    },
  });

  const cs = await prisma.subject.create({
    data: {
      slug: "informatika",
      nameUz: "Informatika va Dasturlash",
      nameTk: "Informatika we Programmirleme",
      descriptionUz: "Algoritmlar, ma'lumotlar tuzilmalari va veb-texnologiyalar",
      descriptionTk: "Algoritmler, maglumat gurluşlary we web tehnologiýalary",
      icon: "Code2",
      color: "#10b981",
      sortOrder: 2,
    },
  });

  const physics = await prisma.subject.create({
    data: {
      slug: "fizika",
      nameUz: "Fizika",
      nameTk: "Fizika",
      descriptionUz: "Mexanika, elektr va elektromagnetizm",
      descriptionTk: "Mehanika, elektrik we elektromagnetizm",
      icon: "Atom",
      color: "#8b5cf6",
      sortOrder: 3,
    },
  });

  const english = await prisma.subject.create({
    data: {
      slug: "ingliz-tili",
      nameUz: "Ingliz tili",
      nameTk: "Iňlis dili",
      descriptionUz: "Akademik yozuv va grammatika",
      descriptionTk: "Akademiki ýazuw we grammatika",
      icon: "Languages",
      color: "#f59e0b",
      sortOrder: 4,
    },
  });

  const mathFolder = await prisma.folder.create({
    data: {
      subjectId: math.id,
      name: "1-semestr ma'ruzalari",
      createdById: admin.id,
    },
  });

  const csFolder = await prisma.folder.create({
    data: {
      subjectId: cs.id,
      name: "Algoritmlar",
      createdById: admin.id,
    },
  });

  const tagExam = await prisma.tag.create({ data: { name: "oraliq" } });
  const tagLecture = await prisma.tag.create({ data: { name: "maruza" } });
  const tagAlgo = await prisma.tag.create({ data: { name: "algoritm" } });

  const mathNote = await prisma.material.create({
    data: {
      type: "NOTE",
      title: "Hosila va Integrallar bo'yicha asosiy formulalar",
      description: "Oraliq nazorat uchun qisqacha konspekt va misollar",
      subjectId: math.id,
      folderId: mathFolder.id,
      authorId: admin.id,
      currentVersion: 2,
      viewsCount: 24,
      tags: {
        create: [{ tagId: tagExam.id }, { tagId: tagLecture.id }],
      },
      versions: {
        create: [
          {
            versionNumber: 1,
            noteContent:
              "# Hosila asoslari\n\nAsosiy qoida:\n\n$$(x^n)' = n x^{n-1}$$\n\n- $(\\sin x)' = \\cos x$\n- $(e^x)' = e^x$",
            changeSummary: "Dastlabki konspekt yaratildi",
            editorId: admin.id,
          },
          {
            versionNumber: 2,
            noteContent:
              "# Hosila va Integral asoslari\n\n## 1. Hosila qoidalari\n\n$$(x^n)' = n x^{n-1}$$\n\n- $(\\sin x)' = \\cos x$\n- $(\\cos x)' = -\\sin x$\n- $(e^x)' = e^x$\n\n## 2. Aniq integral (Nyuton-Leybnits)\n\n$$\\int_a^b f(x)\\,dx = F(b) - F(a)$$",
            changeSummary: "Nyuton-Leybnits formulasi qo'shildi",
            editorId: admin.id,
          },
        ],
      },
    },
  });

  await prisma.comment.create({
    data: {
      materialId: mathNote.id,
      authorId: member.id,
      body: "Katta rahmat! Oraliq nazoratga tayyorlanishda juda foydali bo'ldi.",
    },
  });

  await prisma.material.create({
    data: {
      type: "VIDEO_LINK",
      title: "Big-O va vaqt murakkabligi (Video dars)",
      description: "Algoritmlar tezligini baholash bo'yicha video tushuntirish",
      subjectId: cs.id,
      folderId: csFolder.id,
      authorId: member.id,
      externalUrl: "https://www.youtube.com/watch?v=__vX2sjlpXU",
      embedProvider: "YOUTUBE",
      currentVersion: 1,
      viewsCount: 15,
      tags: {
        create: [{ tagId: tagAlgo.id }],
      },
      versions: {
        create: [
          {
            versionNumber: 1,
            changeSummary: "Video havola qo'shildi",
            editorId: member.id,
          },
        ],
      },
    },
  });

  await prisma.deadlineTask.createMany({
    data: [
      {
        subjectId: math.id,
        linkedMaterialId: mathNote.id,
        title: "1-oraliq nazorat (Hosila va Integral)",
        description: "Barcha asosiy formulalarni takrorlang va testga tayyorlaning.",
        kind: "EXAM",
        dueAt: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000),
        createdById: admin.id,
      },
      {
        subjectId: cs.id,
        title: "2-laboratoriya: Binary Search va Merge Sort",
        description: "Kod va vaqt murakkabligi tahlilini topshirish.",
        kind: "HOMEWORK",
        dueAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
        createdById: admin.id,
      },
    ],
  });

  await prisma.officialTest.create({
    data: {
      subjectId: cs.id,
      title: "1-nazorat: Algoritmlar asoslari",
      description: "Vaqt chegarasi 10 daqiqa. Faqat 1 marta topshirish mumkin!",
      durationMinutes: 10,
      shuffleQuestions: true,
      isPublished: true,
      createdById: admin.id,
      questions: {
        create: [
          {
            orderIndex: 0,
            type: "SINGLE",
            prompt:
              "Binary Search algoritmining eng yomon holatdagi vaqt murakkabligi qanday?",
            optionsJson: JSON.stringify([
              { id: "a", text: "O(n)" },
              { id: "b", text: "O(log n)" },
              { id: "c", text: "O(n log n)" },
              { id: "d", text: "O(1)" },
            ]),
            correctOptionIdsJson: JSON.stringify(["b"]),
            points: 2,
            explanation:
              "Har bir qadamda massiv ikkiga bo'linadi, shuning uchun O(log n).",
          },
          {
            orderIndex: 1,
            type: "MULTI",
            prompt:
              "Quyidagilardan qaysi saralash algoritmlari O(n log n) o'rtacha murakkablikka ega?",
            optionsJson: JSON.stringify([
              { id: "a", text: "Merge Sort" },
              { id: "b", text: "Bubble Sort" },
              { id: "c", text: "Quick Sort" },
              { id: "d", text: "Insertion Sort" },
            ]),
            correctOptionIdsJson: JSON.stringify(["a", "c"]),
            points: 3,
            explanation: "Merge Sort va Quick Sort o'rtacha O(n log n) ishlaydi.",
          },
          {
            orderIndex: 2,
            type: "SINGLE",
            prompt:
              "Stack ma'lumotlar tuzilmasi qaysi tamoyil asosida ishlaydi?",
            optionsJson: JSON.stringify([
              { id: "a", text: "FIFO (First In, First Out)" },
              { id: "b", text: "LIFO (Last In, First Out)" },
              { id: "c", text: "Random access" },
            ]),
            correctOptionIdsJson: JSON.stringify(["b"]),
            points: 2,
          },
        ],
      },
    },
  });

  await prisma.flashcardDeck.create({
    data: {
      subjectId: english.id,
      title: "Academic Vocabulary — Unit 1",
      description: "Akademik maqolalar uchun muhim so'zlar to'plami",
      authorId: member.id,
      cards: {
        create: [
          {
            front: "Hypothesis",
            back: "Gipoteza / Faraz (ilmiy taxmin)",
            orderIndex: 0,
          },
          {
            front: "Substantial",
            back: "Sezilarli, muhim, salmoqli",
            orderIndex: 1,
          },
          {
            front: "Correlate",
            back: "O'zaro bog'liq bo'lmoq",
            orderIndex: 2,
          },
          {
            front: "Synthesize",
            back: "Birlashtirib yaxlit xulosa chiqarish",
            orderIndex: 3,
          },
        ],
      },
    },
  });

  console.log("Database seeded successfully!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
