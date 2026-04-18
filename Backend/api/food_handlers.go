package api

import (
	"errors"
	"net/http"
	"strings"

	"fitness-tracker/models"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type createFoodRequest struct {
	Name          string  `json:"name"`
	Brand         string  `json:"brand"`
	ServingSize   float64 `json:"serving_size"`
	ServingUnit   string  `json:"serving_unit"`
	Calories      float64 `json:"calories"`
	Protein       float64 `json:"protein"`
	Carbohydrates float64 `json:"carbohydrates"`
	Fat           float64 `json:"fat"`
	Fiber         float64 `json:"fiber"`
	Sugar         float64 `json:"sugar"`
	Sodium        float64 `json:"sodium"`
}

type updateFoodRequest struct {
	Name          *string  `json:"name"`
	Brand         *string  `json:"brand"`
	ServingSize   *float64 `json:"serving_size"`
	ServingUnit   *string  `json:"serving_unit"`
	Calories      *float64 `json:"calories"`
	Protein       *float64 `json:"protein"`
	Carbohydrates *float64 `json:"carbohydrates"`
	Fat           *float64 `json:"fat"`
	Fiber         *float64 `json:"fiber"`
	Sugar         *float64 `json:"sugar"`
	Sodium        *float64 `json:"sodium"`
}

type foodUsageRow struct {
	FoodID     uuid.UUID `json:"food_id"`
	UsageCount int64     `json:"usage_count"`
}

type foodListItem struct {
	models.Food
	MealUsageCount int64 `json:"meal_usage_count"`
	CanDelete      bool  `json:"can_delete"`
}

func (s *Server) handleCreateFood(w http.ResponseWriter, r *http.Request) {
	var req createFoodRequest
	if err := decodeJSON(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, err)
		return
	}

	name, err := requireNonBlank("name", req.Name)
	if err != nil {
		writeError(w, http.StatusBadRequest, err)
		return
	}

	servingUnit, err := requireNonBlank("serving_unit", req.ServingUnit)
	if err != nil {
		writeError(w, http.StatusBadRequest, err)
		return
	}

	food := models.Food{
		Name:          name,
		Brand:         strings.TrimSpace(req.Brand),
		ServingSize:   req.ServingSize,
		ServingUnit:   servingUnit,
		Calories:      req.Calories,
		Protein:       req.Protein,
		Carbohydrates: req.Carbohydrates,
		Fat:           req.Fat,
		Fiber:         req.Fiber,
		Sugar:         req.Sugar,
		Sodium:        req.Sodium,
	}

	if err := s.db.Create(&food).Error; err != nil {
		writeError(w, http.StatusBadRequest, err)
		return
	}

	writeJSON(w, http.StatusCreated, food)
}

func (s *Server) handleListFoods(w http.ResponseWriter, r *http.Request) {
	foods, paginated, err := s.listFoods(r)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err)
		return
	}

	writeJSON(w, http.StatusOK, PaginatedResponse[models.Food]{
		Data:     foods,
		Metadata: paginated.Metadata,
	})
}

func (s *Server) handleAdminListFoods(w http.ResponseWriter, r *http.Request) {
	foods, paginated, err := s.listFoods(r)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err)
		return
	}

	items, err := s.buildFoodListItems(foods)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err)
		return
	}

	writeJSON(w, http.StatusOK, PaginatedResponse[foodListItem]{
		Data:     items,
		Metadata: paginated.Metadata,
	})
}

func (s *Server) listFoods(r *http.Request) ([]models.Food, PaginatedResponse[models.Food], error) {
	query := s.db.Model(&models.Food{})

	if name := strings.TrimSpace(r.URL.Query().Get("name")); name != "" {
		query = query.Where("name ILIKE ?", "%"+name+"%")
	}

	if brand := strings.TrimSpace(r.URL.Query().Get("brand")); brand != "" {
		query = query.Where("brand ILIKE ?", "%"+brand+"%")
	}

	if category := strings.TrimSpace(r.URL.Query().Get("category")); category != "" {
		query = query.Where("category ILIKE ?", "%"+category+"%")
	}

	if source := strings.TrimSpace(r.URL.Query().Get("source")); source != "" {
		query = query.Where("source = ?", source)
	}

	page, limit := parsePagination(r)
	var foods []models.Food
	paginated, err := paginate(query.Order("name asc"), page, limit, &foods)
	if err != nil {
		return nil, PaginatedResponse[models.Food]{}, err
	}

	return foods, paginated, nil
}

func (s *Server) buildFoodListItems(foods []models.Food) ([]foodListItem, error) {
	usageByFoodID := map[uuid.UUID]int64{}
	if len(foods) > 0 {
		ids := make([]uuid.UUID, 0, len(foods))
		for _, food := range foods {
			ids = append(ids, food.ID)
		}

		var usageRows []foodUsageRow
		if err := s.db.Model(&models.MealFood{}).
			Select("food_id, COUNT(*) AS usage_count").
			Where("food_id IN ?", ids).
			Group("food_id").
			Scan(&usageRows).Error; err != nil {
			return nil, err
		}

		for _, row := range usageRows {
			usageByFoodID[row.FoodID] = row.UsageCount
		}
	}

	items := make([]foodListItem, 0, len(foods))
	for _, food := range foods {
		usageCount := usageByFoodID[food.ID]
		items = append(items, foodListItem{
			Food:           food,
			MealUsageCount: usageCount,
			CanDelete:      usageCount == 0,
		})
	}

	return items, nil
}

func (s *Server) handleGetFood(w http.ResponseWriter, r *http.Request) {
	id, err := parsePathUUID(r, "id")
	if err != nil {
		writeError(w, http.StatusBadRequest, err)
		return
	}

	var food models.Food
	if err := s.db.First(&food, "id = ?", id).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			writeError(w, http.StatusNotFound, errors.New("food not found"))
			return
		}
		writeError(w, http.StatusInternalServerError, err)
		return
	}

	writeJSON(w, http.StatusOK, food)
}

func (s *Server) handleUpdateFood(w http.ResponseWriter, r *http.Request) {
	id, err := parsePathUUID(r, "id")
	if err != nil {
		writeError(w, http.StatusBadRequest, err)
		return
	}

	var req updateFoodRequest
	if err := decodeJSON(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, err)
		return
	}

	var food models.Food
	if err := s.db.First(&food, "id = ?", id).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			writeError(w, http.StatusNotFound, errors.New("food not found"))
			return
		}
		writeError(w, http.StatusInternalServerError, err)
		return
	}

	if req.Name != nil {
		food.Name = strings.TrimSpace(*req.Name)
	}
	if req.Brand != nil {
		food.Brand = strings.TrimSpace(*req.Brand)
	}
	if req.ServingSize != nil {
		food.ServingSize = *req.ServingSize
	}
	if req.ServingUnit != nil {
		food.ServingUnit = strings.TrimSpace(*req.ServingUnit)
	}
	if req.Calories != nil {
		food.Calories = *req.Calories
	}
	if req.Protein != nil {
		food.Protein = *req.Protein
	}
	if req.Carbohydrates != nil {
		food.Carbohydrates = *req.Carbohydrates
	}
	if req.Fat != nil {
		food.Fat = *req.Fat
	}
	if req.Fiber != nil {
		food.Fiber = *req.Fiber
	}
	if req.Sugar != nil {
		food.Sugar = *req.Sugar
	}
	if req.Sodium != nil {
		food.Sodium = *req.Sodium
	}

	if err := s.db.Save(&food).Error; err != nil {
		writeError(w, http.StatusBadRequest, err)
		return
	}

	writeJSON(w, http.StatusOK, food)
}

func (s *Server) handleDeleteFood(w http.ResponseWriter, r *http.Request) {
	id, err := parsePathUUID(r, "id")
	if err != nil {
		writeError(w, http.StatusBadRequest, err)
		return
	}

	var count int64
	if err := s.db.Model(&models.MealFood{}).Where("food_id = ?", id).Count(&count).Error; err != nil {
		writeError(w, http.StatusInternalServerError, err)
		return
	}
	if count > 0 {
		writeError(w, http.StatusConflict, errors.New("cannot delete food because it is referenced by one or more meals"))
		return
	}

	result := s.db.Delete(&models.Food{}, "id = ?", id)
	if result.Error != nil {
		writeError(w, http.StatusInternalServerError, result.Error)
		return
	}
	if result.RowsAffected == 0 {
		writeError(w, http.StatusNotFound, errors.New("food not found"))
		return
	}

	w.WriteHeader(http.StatusNoContent)
}
