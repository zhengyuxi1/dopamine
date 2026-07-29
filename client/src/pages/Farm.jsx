import { useNavigate } from 'react-router-dom';

export default function Farm() {
  const navigate = useNavigate();

  return (
    <div className="farm-page">
      {/* Header */}
      <div className="farm-header">
        <div className="farm-header-back" onClick={() => navigate(-1)}></div>
        <div className="farm-header-title">芭芭农场 | 免费领水果</div>
        <div className="farm-header-right">
          <div className="farm-hbtn dots"></div>
          <div className="farm-hbtn eye"></div>
        </div>
      </div>

      {/* Top Info */}
      <div className="farm-top-info">
        <div className="farm-tag-left">买多返多</div>
        <div className="farm-coop-bar">
          <div className="farm-coop-avatar">
            <div className="farm-coop-avatar-inner"></div>
          </div>
          <span className="farm-coop-text">合种/帮种</span>
          <div className="farm-coop-plus">+</div>
          <span className="farm-coop-text">邀请好友</span>
          <span className="farm-coop-arrow">加速 &gt;</span>
        </div>
        <div className="farm-exchange-btn">
          <div className="farm-exchange-icon"></div>
          <span className="farm-exchange-text">兑换</span>
        </div>
      </div>

      {/* Side Entries */}
      <div className="farm-side-entries">
        <div className="farm-entry-left">
          <div className="farm-entry-item">
            <div className="farm-entry-icon brand"></div>
            <span className="farm-entry-label">品牌狂欢周</span>
          </div>
          <div className="farm-entry-item">
            <div className="farm-entry-icon earphone"></div>
            <span className="farm-entry-label">抽苹果耳机</span>
          </div>
          <div className="farm-entry-item">
            <div className="farm-entry-icon bargain">
              <span className="farm-bargain-text">0.01元</span>
            </div>
            <span className="farm-entry-label">农场砍价</span>
          </div>
        </div>
        <div className="farm-entry-right">
          <div className="farm-entry-item right">
            <div className="farm-more-icon"></div>
            <span className="farm-entry-label">更多</span>
          </div>
          <div className="farm-entry-item right">
            <div className="farm-novel-badge"></div>
            <span className="farm-entry-label">看小说</span>
          </div>
          <div className="farm-entry-item right">
            <div className="farm-game-badge"></div>
            <span className="farm-entry-label">玩游戏</span>
          </div>
          <div className="farm-entry-item right">
            <div className="farm-reward-icon">
              <span className="farm-reward-text">5</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tree Area */}
      <div className="farm-tree-area">
        <div className="farm-tree">
          <div className="farm-tree-crown"></div>
          <div className="farm-tree-fruit f1"></div>
          <div className="farm-tree-fruit f2"></div>
          <div className="farm-tree-fruit f3"></div>
          <div className="farm-tree-fruit f4"></div>
          <div className="farm-tree-fruit f5"></div>
          <div className="farm-tree-fruit f6"></div>
          <div className="farm-tree-fruit f7"></div>
          <div className="farm-squirrel"></div>
          <div className="farm-tree-trunk"></div>
          <div className="farm-sign-board"></div>
          <div className="farm-lantern-l"></div>
          <div className="farm-lantern-r"></div>
        </div>
        {/* Left character */}
        <div className="farm-char-left">
          <div className="farm-rabbit"></div>
          <div className="farm-fertilizer-left">
            <div className="farm-fert-bag">肥</div>
            <span className="farm-fert-num">2800</span>
          </div>
        </div>
      </div>

      {/* Progress Section */}
      <div className="farm-progress-section">
        <div className="farm-reward-tip">
          <span>再施肥</span>
          <span className="farm-reward-num">4</span>
          <span>次可领</span>
          <div className="farm-reward-icon-small"></div>
          <span>&gt;</span>
        </div>

        <div className="farm-level-row">
          <div className="farm-left-stat">
            <div className="farm-stat-icon gold">
              <span className="farm-stat-value">50.00</span>
            </div>
          </div>
          <div className="farm-level-badge">13级</div>
          <div className="farm-change-btn">换种</div>
          <div className="farm-right-stat">
            <div className="farm-stat-icon fert">
              <span className="farm-fert-label-inner">肥</span>
            </div>
            <span className="farm-fert-amount">1500</span>
            <span className="farm-fert-claim">点击领取</span>
          </div>
        </div>
        <div className="farm-progress-text">再施92.81%果实将变甜</div>
      </div>

      {/* Bottom Action Bar */}
      <div className="farm-bottom-bar">
        <div className="farm-action-btn">
          <div className="farm-action-icon heart"></div>
          <span className="farm-action-label">一起种</span>
        </div>
        <div className="farm-action-btn">
          <div className="farm-action-icon tree"></div>
          <span className="farm-action-label">好友林</span>
        </div>
        <div className="farm-action-btn" style={{ position: 'relative' }}>
          <div className="farm-action-icon main">
            <span className="farm-main-title">施肥</span>
            <span className="farm-main-sub">肥料23</span>
          </div>
          <div className="farm-badge">0</div>
        </div>
        <div className="farm-action-btn">
          <div className="farm-action-icon bag"></div>
          <span className="farm-action-label">集肥料</span>
        </div>
        <div className="farm-action-btn">
          <div className="farm-action-icon shop"></div>
          <span className="farm-action-label">超惠买</span>
        </div>
      </div>

      {/* Promo Cards */}
      <div className="farm-promo-section">
        <div className="farm-promo-card">
          <div className="farm-promo-header">
            <div className="farm-promo-icon"></div>
            <span>下单得肥料+60000</span>
          </div>
          <div className="farm-promo-img shampoo">
            <div className="farm-promo-overlay">舒肤佳净透 旷野系列</div>
            <div className="farm-promo-text">
              1洗6效<br />
              <span className="farm-promo-sub">24小时控油留香</span>
            </div>
            <div className="farm-promo-product"></div>
            <div className="farm-promo-bottom">极地海洋</div>
          </div>
        </div>
        <div className="farm-promo-card">
          <div className="farm-promo-header">
            <div className="farm-promo-icon"></div>
            <span>下单得肥料+60000</span>
          </div>
          <div className="farm-promo-img milk">
            <div className="farm-milk-text">
              <div className="farm-milk-title">会员看直播赠送</div>
              <div className="farm-milk-sub">至高3999元小米智能家庭屏机</div>
            </div>
            <div className="farm-promo-product small">BEBA</div>
            <div className="farm-milk-bottom">直播间叠加豪礼</div>
          </div>
        </div>
      </div>
    </div>
  );
}
