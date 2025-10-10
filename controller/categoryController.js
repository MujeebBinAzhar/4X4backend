const Category = require("../models/Category");
const { ObjectId } = require('mongodb');

const addCategory = async (req, res) => {
  try {
    const newCategory = new Category(req.body);
    await newCategory.save();
    res.status(200).send({
      message: "Category Added Successfully!",
    });
  } catch (err) {
    res.status(500).send({
      message: err.message,
    });
  }
};
function transformData(data) {
  // Create a mapping for term_id to ObjectId
  const idMapping = {};

  // Generate unique ObjectId for each _id and cache in idMapping
  data.forEach((item) => {
    if (!idMapping[item._id]) {
      idMapping[item._id] = new ObjectId().toString(); // Generate new ObjectId
    }
  });

  // Transform the payload
  return data.map((item) => ({
    _id: idMapping[item._id], // Replace _id with ObjectId
    id: idMapping[item.id], // Replace id with ObjectId (if necessary)
    status: item.status || "inactive", // Ensure default status if not provided
    name: item.name || { en: "" }, // Default to an empty object if name is missing
    description: item.description || { en: "" }, // Default to an empty object if description is missing
    parentName: item.parentName || "", // Keep parentName or default to an empty string
    parentId: item.parentId !== "0" ? idMapping[item.parentId] : null, // Map parentId or set to null
    icon: item.icon || "", // Default to an empty string if icon is missing
  }));
}


// all multiple category
const addAllCategory = async (req, res) => {
  // console.log("category", req.body);
  try {
    await Category.deleteMany();
    const bodyData = req.body;

    await Category.insertMany(transformData(bodyData));
    res.status(200).send({
      message: "Category Added Successfully!",
    });
  } catch (err) {
    console.log(err.message);

    res.status(500).send({
      message: err.message,
    });
  }
};

// get status show category
const getShowingCategory = async (req, res) => {
  try {
    const categories = await Category.find({ status: "show" }).sort({
      _id: -1,
    });

    const categoryList = readyToParentAndChildrenCategory(categories);
    // console.log("category list", categoryList.length);
    res.send(categoryList);
  } catch (err) {
    res.status(500).send({
      message: err.message,
    });
  }
};

// get all category parent and child
const getAllCategory = async (req, res) => {
  try {
    const categories = await Category.find({}).sort({ _id: -1 });

    const categoryList = readyToParentAndChildrenCategory(categories);
    //  console.log('categoryList',categoryList)
    res.send(categoryList);
  } catch (err) {
    res.status(500).send({
      message: err.message,
    });
  }
};

const getAllCategories = async (req, res) => {
  try {
    const categories = await Category.find({}).sort({ _id: -1 });

    res.send(categories);
  } catch (err) {
    res.status(500).send({
      message: err.message,
    });
  }
};

const getCategoriesForSite = async (req, res) => {
  try {
    // Find all categories with status 'show'
    const categories = await Category.find({ status: 'show' });

    // Helper function to format categories into the required structure
    const formatCategory = (category) => {
      return {
        id: category._id,
        name: category.name,
        slug: category.slug,
        image: {
          id: category._id,
          thumbnail: category.icon,
          original: category.icon
        },
        icon: category.icon,
        children: [] // Will be populated with children categories
      };
    };

    // Build a map of parent and child categories
    const categoryMap = {};
    categories.forEach((category) => {
      if (category.parentId) {
        // Add to children array of its parent
        if (!categoryMap[category.parentId]) {
          categoryMap[category.parentId] = formatCategory({ children: [] });
        }
        categoryMap[category.parentId].children.push({
          id: category._id,
          name: category.name,
          slug: category.slug
        });
      } else {
        // Add to map as a top-level category
        categoryMap[category._id] = formatCategory(category);
      }
    });

    // Collect top-level categories in the final result
    const result = Object.values(categoryMap);

    res.json(result);
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

const getCategoryById = async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);
    res.send(category);
  } catch (err) {
    res.status(500).send({
      message: err.message,
    });
  }
};

// category update
const updateCategory = async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);
    if (category) {
      category.name = { ...category.name, ...req.body.name };
      category.description = {
        ...category.description,
        ...req.body.description,
      };
      category.icon = req.body.icon;
      category.status = req.body.status;
      category.parentId = req.body.parentId
        ? req.body.parentId
        : category.parentId;
      category.parentName = req.body.parentName;

      await category.save();
      res.send({ message: "Category Updated Successfully!" });
    }
  } catch (err) {
    res.status(500).send({
      message: err.message,
    });
  }
};

// udpate many category
const updateManyCategory = async (req, res) => {
  try {
    const updatedData = {};
    for (const key of Object.keys(req.body)) {
      if (
        req.body[key] !== "[]" &&
        Object.entries(req.body[key]).length > 0 &&
        req.body[key] !== req.body.ids
      ) {
        updatedData[key] = req.body[key];
      }
    }

    await Category.updateMany(
      { _id: { $in: req.body.ids } },
      {
        $set: updatedData,
      },
      {
        multi: true,
      }
    );

    res.send({
      message: "Categories update successfully!",
    });
  } catch (err) {
    res.status(500).send({
      message: err.message,
    });
  }
};

// category update status
const updateStatus = async (req, res) => {
  // console.log('update status')
  try {
    const newStatus = req.body.status;

    await Category.updateOne(
      { _id: req.params.id },
      {
        $set: {
          status: newStatus,
        },
      }
    );
    res.status(200).send({
      message: `Category ${newStatus === "show" ? "Published" : "Un-Published"
        } Successfully!`,
    });
  } catch (err) {
    res.status(500).send({
      message: err.message,
    });
  }
};
//single category delete
const deleteCategory = async (req, res) => {
  try {
    console.log("id cat >>", req.params.id);
    await Category.deleteOne({ _id: req.params.id });
    await Category.deleteMany({ parentId: req.params.id });
    res.status(200).send({
      message: "Category Deleted Successfully!",
    });
  } catch (err) {
    res.status(500).send({
      message: err.message,
    });
  }

  //This is for delete children category
  // Category.updateOne(
  //   { _id: req.params.id },
  //   {
  //     $pull: { children: req.body.title },
  //   },
  //   (err) => {
  //     if (err) {
  //       res.status(500).send({ message: err.message });
  //     } else {
  //       res.status(200).send({
  //         message: 'Category Deleted Successfully!',
  //       });
  //     }
  //   }
  // );
};

// all multiple category delete
const deleteManyCategory = async (req, res) => {
  try {
    const categories = await Category.find({}).sort({ _id: -1 });

    await Category.deleteMany({ parentId: req.body.ids });
    await Category.deleteMany({ _id: req.body.ids });

    res.status(200).send({
      message: "Categories Deleted Successfully!",
    });
  } catch (err) {
    res.status(500).send({
      message: err.message,
    });
  }
};
const readyToParentAndChildrenCategory = (categories, parentId = null) => {
  const categoryList = [];
  let Categories;
  if (parentId == null) {
    Categories = categories.filter((cat) => cat.parentId == undefined);
  } else {
    Categories = categories.filter((cat) => cat.parentId == parentId);
  }

  for (let cate of Categories) {
    categoryList.push({
      _id: cate._id,
      name: cate.name,
      parentId: cate.parentId,
      parentName: cate.parentName,
      description: cate.description,
      icon: cate.icon,
      status: cate.status,
      children: readyToParentAndChildrenCategory(categories, cate._id),
    });
  }

  return categoryList;
};
const getCategoryWithChildren = async (categoryId) => {
  // Find direct children of the given categoryId
  const children = await Category.find({ parentId: categoryId });

  // Recursively fetch children for each child category
  const childCategories = await Promise.all(
    children.map(async (child) => ({
      ...child.toObject(),
      children: await getCategoryWithChildren(child._id), // Recursive call
    }))
  );

  return childCategories;
};
const getCategoryBySlug = async (req, res) => {
  try {
    const { slug } = req.params;

    // Validate the input
    if (!slug) {
      return res.status(400).json({ message: 'Slug parameter is required' });
    }

    // Find the main category where name.en matches the slug (case-insensitive)
    const mainCategory = await Category.findOne({
      $expr: {
        $eq: [{ $toLower: '$name.en' }, slug.split('-').join(' ').toLowerCase()],
      },
    }).lean();

    // If the main category is not found
    if (!mainCategory) {
      return res.status(404).json({ message: 'Category not found' });
    }

    // Fetch children recursively for the main category
    const children = await getCategoryWithChildren(mainCategory._id);


    res.status(200).send({
      ...mainCategory,
      children,
    });
  } catch (error) {
    // Handle unexpected errors
    res.status(500).json({ message: error.message });
  }
};



module.exports = {
  addCategory,
  addAllCategory,
  getAllCategory,
  getShowingCategory,
  getCategoryById,
  updateCategory,
  updateStatus,
  deleteCategory,
  deleteManyCategory,
  getAllCategories,
  updateManyCategory,
  getCategoriesForSite,
  getCategoryBySlug
};
