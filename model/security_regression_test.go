package model

import (
	"testing"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/setting/operation_setting"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"gorm.io/gorm"
)

func TestValidateEmailDomainNormalizesWhitelistEntries(t *testing.T) {
	previousEnabled := common.EmailDomainRestrictionEnabled
	previousWhitelist := common.EmailDomainWhitelist
	t.Cleanup(func() {
		common.EmailDomainRestrictionEnabled = previousEnabled
		common.EmailDomainWhitelist = previousWhitelist
	})

	common.EmailDomainRestrictionEnabled = true
	common.EmailDomainWhitelist = []string{" Example.COM ", "allowed.example"}

	assert.NoError(t, ValidateEmailDomain("user@example.com"))
	assert.NoError(t, ValidateEmailDomain("user@ALLOWED.EXAMPLE"))
	assert.ErrorIs(t, ValidateEmailDomain("user@outside.example"), ErrEmailDomainNotAllowed)
}

func TestUpdateOptionRejectsMalformedJSONBeforePersistence(t *testing.T) {
	truncateTables(t)
	require.NoError(t, DB.AutoMigrate(&Option{}))
	DB.Exec("DELETE FROM options")
	t.Cleanup(func() { DB.Exec("DELETE FROM options") })

	previousOptionMap := common.OptionMap
	common.OptionMap = map[string]string{"Chats": "[]"}
	t.Cleanup(func() { common.OptionMap = previousOptionMap })

	err := UpdateOption("Chats", `{"incomplete":`)
	require.Error(t, err)

	var count int64
	require.NoError(t, DB.Model(&Option{}).Where("key = ?", "Chats").Count(&count).Error)
	assert.Zero(t, count)
	assert.Equal(t, "[]", common.OptionMap["Chats"])
}

func TestFirstSuccessfulTopUpGrantsReferralRewardOnlyOnce(t *testing.T) {
	truncateTables(t)
	paymentSetting := operation_setting.GetPaymentSetting()
	previousConfirmed := paymentSetting.ComplianceConfirmed
	previousTermsVersion := paymentSetting.ComplianceTermsVersion
	previousReward := common.QuotaForInviter
	t.Cleanup(func() {
		paymentSetting.ComplianceConfirmed = previousConfirmed
		paymentSetting.ComplianceTermsVersion = previousTermsVersion
		common.QuotaForInviter = previousReward
	})
	paymentSetting.ComplianceConfirmed = true
	paymentSetting.ComplianceTermsVersion = operation_setting.CurrentComplianceTermsVersion
	common.QuotaForInviter = 123

	inviter := User{Username: "inviter", AffCode: "invite-1", Role: common.RoleCommonUser, Status: common.UserStatusEnabled}
	require.NoError(t, DB.Create(&inviter).Error)
	invitee := User{Username: "invitee", AffCode: "invite-2", Role: common.RoleCommonUser, Status: common.UserStatusEnabled, InviterId: inviter.Id}
	require.NoError(t, DB.Create(&invitee).Error)
	require.NoError(t, DB.Create(&TopUp{UserId: invitee.Id, TradeNo: "first-topup", Status: common.TopUpStatusSuccess}).Error)

	var inviterID, reward int
	require.NoError(t, DB.Transaction(func(tx *gorm.DB) error {
		var err error
		inviterID, reward, err = grantFirstTopUpReferralReward(tx, invitee.Id)
		return err
	}))
	assert.Equal(t, inviter.Id, inviterID)
	assert.Equal(t, 123, reward)

	require.NoError(t, DB.First(&inviter, inviter.Id).Error)
	assert.Equal(t, 1, inviter.AffCount)
	assert.Equal(t, 123, inviter.AffQuota)
	assert.Equal(t, 123, inviter.AffHistoryQuota)

	require.NoError(t, DB.Create(&TopUp{UserId: invitee.Id, TradeNo: "second-topup", Status: common.TopUpStatusSuccess}).Error)
	require.NoError(t, DB.Transaction(func(tx *gorm.DB) error {
		var err error
		inviterID, reward, err = grantFirstTopUpReferralReward(tx, invitee.Id)
		return err
	}))
	assert.Zero(t, inviterID)
	assert.Zero(t, reward)

	require.NoError(t, DB.First(&inviter, inviter.Id).Error)
	assert.Equal(t, 1, inviter.AffCount)
	assert.Equal(t, 123, inviter.AffQuota)
}
