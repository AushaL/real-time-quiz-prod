import { Quiz } from "../models/quiz.model.js";
import cloudinary from "../lib/cloudinary.js";
// import { deleteFromCloudinary } from "../utils/cloudinary.js";

const uploadToCloudinary = async (file) => {
  try {
    const result = await cloudinary.uploader.upload(file.tempFilePath, {
      resource_type: "auto",
    });
    return result.secure_url;
  } catch (error) {
    console.log("Error in uploadToCloudinary", error);
    throw new Error("Error uploading to cloudinary");
  }
};

export const createQuiz = async (req, res) => {
  try {
    if (!req.files || !req.files.audiofile || !req.files.imageFile) {
      return res.status(400).json({ message: "Please upload all files" });
    }

    const { title, description, difficulty, variant, mode } = req.body;
    let questions = [];
    if (req.body.questions) {
      try {
        questions =
          typeof req.body.questions === "string"
            ? JSON.parse(req.body.questions)
            : req.body.questions;
      } catch (e) {
        return res
          .status(400)
          .json({ message: "Invalid questions JSON format" });
      }

      if (!questions || questions.length === 0) {
        return res
          .status(400)
          .json({ message: "Quiz must contain at least one question" });
      }
    }

    for (let i = 0; i < questions.length; i++) {
      const question = questions[i];

      // Ищем файл, привязанный к конкретному индексу вопроса (например: question_0_file)
      const fileKey = `question_${i}_file`;
      const file = req.files && req.files[fileKey];

      if (
        question.questionType === "image" ||
        question.questionType === "audio"
      ) {
        if (!file) {
          return res.status(400).json({
            message: `Missing required file for question at index ${i} (${question.questionType} type)`,
          });
        }

        // Загружаем в Cloudinary и записываем URL в поле mediaUrl вопроса
        const uploadResult = await uploadToCloudinary(file);
        question.mediaUrl = uploadResult.secure_url || uploadResult;
      }
    }
    const audioFile = req.files.audioFile;
    const imageFile = req.files.imageFile;

    const audioUrl = await uploadToCloudinary(audioFile);
    const imageUrl = await uploadToCloudinary(imageFile);

    const quiz = new Quiz({
      title,
      description,
      difficulty,
      variant,
      mode,
      questions,
    });

    await quiz.save();

    return res.status(201).json({
      success: true,
      message: "Quiz created successfully",
      data: quiz,
    });
  } catch (error) {
    console.log("Error in createQuiz", error);
    next(error);
  }
};

export const deleteQuiz = async (req, res, next) => {
  try {
    const { id } = req.params;
    const quiz = await Quiz.findById(id);

    if (!quiz) {
      return res.status(404).json({ message: "Quiz not found" });
    }

    // if (quiz.questions && quiz.questions.length > 0) {
    //   for (const question of quiz.questions) {
    //     if (question.mediaUrl) {
    //       // Вызываем вашу утилиту удаления из Cloudinary (передавая URL или public_id)
    //       await deleteFromCloudinary(question.mediaUrl).catch((err) =>
    //         console.error(
    //           `Failed to delete asset ${question.mediaUrl} from Cloudinary:`,
    //           err,
    //         ),
    //       );
    //     }
    //   }
    // }

    await Quiz.findByIdAndDelete(id);
    res.status(200).json({ message: "Quiz deleted successfully" });
  } catch (error) {
    console.log("Error in deleteQuiz", error);
    next(error);
  }
};

export const checkAdmin = async (req, res, next) => {
  res.status(200).json({ admin: true });
};
